-- ============================================================
-- REPARACIÓN DEFINITIVA DE SUPABASE AUTH (Error 500)
-- ID del usuario de Olman: df73da9b-a4f8-4fa2-9708-6e8035fb2215
-- ============================================================

-- 1. Eliminar cualquier trigger que interfiera con auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;

-- 2. Asegurar extension pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Reparar credenciales y estructura de auth.users & auth.identities
DO $$
DECLARE
  v_user_id UUID := 'df73da9b-a4f8-4fa2-9708-6e8035fb2215';
  v_email TEXT := 'olmanmart16@gmail.com';
  v_password TEXT := 'Madrigales2026*';
  v_hash TEXT;
BEGIN
  -- Generar hash bcrypt válido
  v_hash := extensions.crypt(v_password, extensions.gen_salt('bf'));

  -- Limpiar identities previas potencialmente corruptas
  DELETE FROM auth.identities WHERE user_id = v_user_id OR provider_id = v_email;

  -- Actualizar auth.users con todos los campos estándar requeridos por GoTrue
  UPDATE auth.users
  SET 
    encrypted_password = v_hash,
    email_confirmed_at = NOW(),
    aud = 'authenticated',
    role = 'authenticated',
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = '{"full_name":"Olman Martínez","role":"administrador"}'::jsonb,
    is_super_admin = FALSE,
    is_sso_user = FALSE,
    banned_until = NULL,
    reauthentication_token = NULL,
    reauthentication_sent_at = NULL,
    phone = NULL,
    phone_confirmed_at = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Insertar identidad limpia con el formato exacto de GoTrue
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    json_build_object('sub', v_user_id::text, 'email', v_email)::jsonb,
    'email',
    v_email,
    NOW(),
    NOW(),
    NOW()
  );

  -- 4. Asegurar el perfil en public.profiles
  INSERT INTO public.profiles (id, full_name, role, is_owner, is_active)
  VALUES (v_user_id, 'Olman Martínez', 'administrador', TRUE, TRUE)
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Olman Martínez',
    role = 'administrador',
    is_owner = TRUE,
    is_active = TRUE;

  RAISE NOTICE '¡Usuario reparado y listo para iniciar sesión!';
END $$;

-- 5. Reactivar trigger de updated_at de profiles limpio
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
