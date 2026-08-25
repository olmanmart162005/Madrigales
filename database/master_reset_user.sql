-- ============================================================
-- SQL MAESTRO DEFINITIVO PARA CREACIÓN Y CONFIRMACIÓN DE USUARIO
-- Correo: olmanmart16@gmail.com
-- Contraseña: ETHonduras123
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Desactivar temporalmente triggers de perfiles para evitar interferencias
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_owner_and_profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DO $$
DECLARE
  v_user_id UUID := extensions.uuid_generate_v4();
  v_email TEXT := 'olmanmart16@gmail.com';
  v_password TEXT := 'ETHonduras123';
  v_hash TEXT;
BEGIN
  -- Generar hash bcrypt estándar de 10 rounds que usa Supabase GoTrue
  v_hash := extensions.crypt(v_password, extensions.gen_salt('bf', 10));

  -- Limpiar cualquier usuario previo con este correo
  DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE LOWER(email) = LOWER(v_email));
  DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE LOWER(email) = LOWER(v_email)) OR (provider = 'email' AND provider_id = v_email);
  DELETE FROM auth.users WHERE LOWER(email) = LOWER(v_email);

  -- 2. Insertar en auth.users con todos los flags de confirmación activados
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_hash,
    NOW(), -- email_confirmed_at
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Olman Martínez", "role": "administrador"}'::jsonb,
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    FALSE,
    NULL
  );

  -- 3. Insertar en auth.identities con el formato nativo completo de GoTrue
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
    json_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    )::jsonb,
    'email',
    v_user_id::text,
    NOW(),
    NOW(),
    NOW()
  );

  -- 4. Insertar en public.profiles como PROPIETARIO / OWNER
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    is_owner,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'Olman Martínez',
    'administrador',
    TRUE,
    TRUE,
    NOW(),
    NOW()
  );

  RAISE NOTICE '¡Cuenta % creada y activada con éxito total!', v_email;
END $$;

-- 5. Reactivar el trigger de protección permanente de perfiles
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_owner_and_profiles;
