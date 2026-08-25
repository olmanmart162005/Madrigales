-- ============================================================
-- RPC MAESTRO PARA CREAR Y ELIMINAR USUARIOS (COMPLETO)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CREACIÓN / ACTUALIZACIÓN INTELIGENTE DE USUARIOS
CREATE OR REPLACE FUNCTION public.create_system_user_rpc(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'cajero'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_user_id UUID;
  v_hash TEXT;
  v_clean_email TEXT := LOWER(TRIM(p_email));
  v_clean_role TEXT;
BEGIN
  -- 1. Validar que quien ejecuta sea Administrador o Propietario
  SELECT (role = 'administrador' OR is_owner = TRUE) INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = TRUE;

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'No tienes permisos para gestionar usuarios.';
  END IF;

  -- 2. Rol sanitizado (No se puede crear Propietario vía RPC)
  IF p_role = 'administrador' THEN
    v_clean_role := 'administrador';
  ELSE
    v_clean_role := 'cajero';
  END IF;

  -- 3. Generar hash bcrypt de 10 rounds
  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- 4. Buscar si ya existe el usuario en auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Si ya existía, verificar que no sea el Owner
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_owner = TRUE) THEN
      RAISE EXCEPTION 'No se puede modificar la cuenta del Propietario del Sistema desde este formulario.';
    END IF;

    -- Actualizar usuario existente en auth.users
    UPDATE auth.users
    SET 
      encrypted_password = v_hash,
      email_confirmed_at = NOW(),
      raw_user_meta_data = json_build_object('full_name', p_full_name, 'role', v_clean_role)::jsonb,
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Asegurar identidad en auth.identities
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, json_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true)::jsonb, 'email', v_user_id::text, NOW(), NOW(), NOW());

  ELSE
    -- Si es nuevo, generar ID e insertar
    v_user_id := extensions.uuid_generate_v4();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_clean_email, v_hash, NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      json_build_object('full_name', p_full_name, 'role', v_clean_role)::jsonb,
      FALSE, NOW(), NOW()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (v_user_id, v_user_id, json_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true)::jsonb, 'email', v_user_id::text, NOW(), NOW(), NOW());
  END IF;

  -- 5. Upsert en public.profiles (garantizando is_owner = FALSE)
  INSERT INTO public.profiles (
    id, full_name, phone, role, is_owner, is_active, created_at, updated_at
  ) VALUES (
    v_user_id, p_full_name, p_phone, v_clean_role, FALSE, TRUE, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = p_full_name,
    phone = p_phone,
    role = v_clean_role,
    is_owner = FALSE,
    is_active = TRUE,
    updated_at = NOW();

  RETURN json_build_object(
    'id', v_user_id,
    'email', v_clean_email,
    'full_name', p_full_name,
    'role', v_clean_role
  );
END;
$$;

-- 2. ELIMINACIÓN COMPLETA DE USUARIOS
CREATE OR REPLACE FUNCTION public.delete_system_user_rpc(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_target_is_owner BOOLEAN;
BEGIN
  -- Validar que quien ejecuta sea Administrador o Propietario
  SELECT (role = 'administrador' OR is_owner = TRUE) INTO v_caller_is_admin
  FROM public.profiles
  WHERE id = auth.uid() AND is_active = TRUE;

  IF NOT COALESCE(v_caller_is_admin, FALSE) THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar usuarios.';
  END IF;

  -- Proteger al Propietario
  SELECT is_owner INTO v_target_is_owner FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_target_is_owner, FALSE) THEN
    RAISE EXCEPTION 'El Propietario del Sistema no puede ser eliminado.';
  END IF;

  -- No puede autoeliminarse
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta en sesión.';
  END IF;

  -- Eliminar en orden
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_system_user_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_system_user_rpc TO authenticated;
