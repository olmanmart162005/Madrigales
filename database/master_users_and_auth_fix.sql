-- ============================================================
-- MADRIGALES: SISTEMA MAESTRO DE USUARIOS, AUTH Y SINCRONIZACIÓN
-- (ELIMINA VERSIONES PREVIAS Y SINCRONIZA A TODOS LOS USUARIOS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ELIMINAR FUNCIONES PREVIAS PARA EVITAR CONFLICTO 42725
DROP FUNCTION IF EXISTS public.create_system_user_rpc(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_system_user_rpc(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_system_user_rpc CASCADE;
DROP FUNCTION IF EXISTS public.reset_user_password_rpc CASCADE;
DROP FUNCTION IF EXISTS public.delete_system_user_rpc CASCADE;

-- 2. ASEGURAR COLUMNAS EN PROFILES
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. PROTEGER AL PROPIETARIO (Olman Martínez)
UPDATE public.profiles 
SET 
  is_owner = TRUE, 
  role = 'administrador', 
  is_active = TRUE,
  username = 'olman'
WHERE id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'olmanmart16@gmail.com'
);

-- 4. FUNCIÓN RPC: CREAR USUARIOS (6 parámetros)
CREATE OR REPLACE FUNCTION public.create_system_user_rpc(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'cajero'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_is_admin BOOLEAN;
  v_caller_is_owner BOOLEAN;
  v_user_id UUID;
  v_hash TEXT;
  v_clean_email TEXT := LOWER(TRIM(p_email));
  v_clean_username TEXT;
  v_clean_role TEXT;
BEGIN
  SELECT 
    COALESCE(role = 'administrador', FALSE),
    COALESCE(is_owner, FALSE)
  INTO v_caller_is_admin, v_caller_is_owner
  FROM public.profiles
  WHERE id = v_caller_id AND is_active = TRUE;

  IF NOT (COALESCE(v_caller_is_admin, FALSE) OR COALESCE(v_caller_is_owner, FALSE)) THEN
    RAISE EXCEPTION 'No tienes permisos administrativos para crear usuarios.';
  END IF;

  IF p_role = 'administrador' THEN
    v_clean_role := 'administrador';
  ELSE
    v_clean_role := 'cajero';
  END IF;

  IF p_username IS NOT NULL AND TRIM(p_username) <> '' THEN
    v_clean_username := LOWER(TRIM(p_username));
  ELSE
    v_clean_username := LOWER(SPLIT_PART(v_clean_email, '@', 1));
  END IF;

  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_clean_email LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_owner = TRUE) THEN
      RAISE EXCEPTION 'No se puede modificar la cuenta del Propietario del Sistema.';
    END IF;

    UPDATE auth.users
    SET 
      encrypted_password = v_hash,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data = json_build_object('full_name', p_full_name, 'username', v_clean_username, 'role', v_clean_role)::jsonb,
      updated_at = NOW()
    WHERE id = v_user_id;

    DELETE FROM auth.identities WHERE user_id = v_user_id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_user_id,
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', TRUE)::jsonb,
      'email',
      v_user_id::text,
      NOW(), NOW(), NOW()
    );

  ELSE
    v_user_id := extensions.uuid_generate_v4();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_clean_email,
      v_hash,
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      json_build_object('full_name', p_full_name, 'username', v_clean_username, 'role', v_clean_role)::jsonb,
      FALSE,
      NOW(),
      NOW()
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_user_id,
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', TRUE)::jsonb,
      'email',
      v_user_id::text,
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.profiles (
    id, full_name, username, phone, role, is_owner, is_active, created_by, created_at, updated_at
  ) VALUES (
    v_user_id, p_full_name, v_clean_username, p_phone, v_clean_role, FALSE, TRUE, v_caller_id, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = p_full_name,
    username = v_clean_username,
    phone = p_phone,
    role = v_clean_role,
    is_owner = FALSE,
    is_active = TRUE,
    created_by = COALESCE(public.profiles.created_by, v_caller_id),
    updated_at = NOW();

  RETURN json_build_object(
    'id', v_user_id,
    'email', v_clean_email,
    'username', v_clean_username,
    'full_name', p_full_name,
    'role', v_clean_role,
    'created_by', v_caller_id
  );
END;
$$;

-- 5. FUNCIÓN RPC: RESTABLECER CONTRASEÑA
CREATE OR REPLACE FUNCTION public.reset_user_password_rpc(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_is_admin BOOLEAN;
  v_caller_is_owner BOOLEAN;
  v_target_is_owner BOOLEAN;
  v_hash TEXT;
BEGIN
  SELECT 
    COALESCE(role = 'administrador', FALSE),
    COALESCE(is_owner, FALSE)
  INTO v_caller_is_admin, v_caller_is_owner
  FROM public.profiles
  WHERE id = v_caller_id AND is_active = TRUE;

  IF NOT (COALESCE(v_caller_is_admin, FALSE) OR COALESCE(v_caller_is_owner, FALSE)) THEN
    RAISE EXCEPTION 'No tienes permisos para restablecer contraseñas.';
  END IF;

  SELECT COALESCE(is_owner, FALSE) INTO v_target_is_owner
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_is_owner AND v_caller_id <> p_user_id THEN
    RAISE EXCEPTION 'No se puede restablecer la contraseña del Propietario del Sistema.';
  END IF;

  v_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));

  UPDATE auth.users
  SET 
    encrypted_password = v_hash,
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- 6. FUNCIÓN RPC: ELIMINAR USUARIO
CREATE OR REPLACE FUNCTION public.delete_system_user_rpc(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_is_admin BOOLEAN;
  v_caller_is_owner BOOLEAN;
  v_target_is_owner BOOLEAN;
BEGIN
  SELECT 
    COALESCE(role = 'administrador', FALSE),
    COALESCE(is_owner, FALSE)
  INTO v_caller_is_admin, v_caller_is_owner
  FROM public.profiles
  WHERE id = v_caller_id AND is_active = TRUE;

  IF NOT (COALESCE(v_caller_is_admin, FALSE) OR COALESCE(v_caller_is_owner, FALSE)) THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar usuarios.';
  END IF;

  SELECT COALESCE(is_owner, FALSE) INTO v_target_is_owner
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target_is_owner THEN
    RAISE EXCEPTION 'El Propietario del Sistema no puede ser eliminado.';
  END IF;

  IF p_user_id = v_caller_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta.';
  END IF;

  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_system_user_rpc(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password_rpc(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_system_user_rpc(UUID) TO authenticated;

-- 7. REPARACIÓN Y RESTAURACIÓN TOTAL DE YIMI, SURI Y TODOS LOS USUARIOS
-- Asigna contraseña 'Madrigales123*' a todos los usuarios que no sean el Owner
-- y garantiza que existan tanto en auth.users como en profiles.
DO $$
DECLARE
  r RECORD;
  v_user_email TEXT;
  v_username TEXT;
  v_default_hash TEXT := extensions.crypt('Madrigales123*', extensions.gen_salt('bf', 10));
BEGIN
  FOR r IN 
    SELECT p.id, p.full_name, p.role, p.username
    FROM public.profiles p
    WHERE p.is_owner IS NOT TRUE
  LOOP
    v_username := LOWER(COALESCE(r.username, REPLACE(r.full_name, ' ', '')));
    v_user_email := v_username || '@madrigales.com';

    -- Actualizar username en profile si estaba vacío
    UPDATE public.profiles 
    SET username = v_username, is_active = TRUE 
    WHERE id = r.id AND (username IS NULL OR username = '');

    -- Si existe en auth.users, actualizar password y confirmar email
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = r.id) THEN
      UPDATE auth.users
      SET 
        encrypted_password = v_default_hash,
        email_confirmed_at = NOW(),
        updated_at = NOW()
      WHERE id = r.id;
    ELSE
      -- Si no existía en auth.users, crearlo
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        r.id,
        'authenticated',
        'authenticated',
        v_user_email,
        v_default_hash,
        NOW(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        json_build_object('full_name', r.full_name, 'username', v_username, 'role', r.role)::jsonb,
        FALSE,
        NOW(),
        NOW()
      );
    END IF;

    -- Asegurar identidad en auth.identities
    DELETE FROM auth.identities WHERE user_id = r.id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      r.id,
      r.id,
      json_build_object('sub', r.id::text, 'email', v_user_email, 'email_verified', TRUE)::jsonb,
      'email',
      r.id::text,
      NOW(), NOW(), NOW()
    );
  END LOOP;
END $$;
