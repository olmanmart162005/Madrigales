-- ============================================================
-- MADRIGALES PASTELERÍA: LIMPIEZA Y REPARACIÓN DEFINITIVA DE SUPABASE AUTH
-- (Elimina registros corruptos de auth.users y deja intacto al Propietario)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ELIMINAR CUALQUIER TRIGGER QUE INTERFIERA CON auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_sync_auth_users ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;

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

-- 3. LIMPIAR ENTRADAS CORRUPTAS EN auth.identities Y auth.users
-- (Solo para usuarios no-propietarios que hayan quedado con schema inválido)
DELETE FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE LOWER(email) NOT LIKE '%olman%' AND LOWER(email) <> 'olmanmart16@gmail.com'
);

DELETE FROM auth.users 
WHERE LOWER(email) NOT LIKE '%olman%' AND LOWER(email) <> 'olmanmart16@gmail.com';

-- 4. ASEGURAR Y BLINDAR AL PROPIETARIO (Olman Martínez)
UPDATE public.profiles 
SET 
  is_owner = TRUE, 
  role = 'administrador', 
  is_active = TRUE,
  username = 'olman'
WHERE id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'olmanmart16@gmail.com'
);

-- Asegurar que Olman tenga su identity limpia
DO $$
DECLARE
  v_olman_id UUID;
BEGIN
  SELECT id INTO v_olman_id FROM auth.users WHERE LOWER(email) = 'olmanmart16@gmail.com' LIMIT 1;
  IF v_olman_id IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_olman_id;
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_olman_id,
      v_olman_id,
      json_build_object('sub', v_olman_id::text, 'email', 'olmanmart16@gmail.com', 'email_verified', TRUE)::jsonb,
      'email',
      v_olman_id::text,
      NOW(), NOW(), NOW()
    );
  END IF;
END $$;
