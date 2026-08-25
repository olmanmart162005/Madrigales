-- ============================================================
-- MADRIGALES PASTELERÍA — MIGRACIÓN DE SEGURIDAD & ROLES (IDEMPOTENTE)
-- Diseñada para ejecutarse sobre una base de datos existente
-- ============================================================

-- 1. Convertir la columna role a TEXT para evitar conflictos de ENUM en PostgreSQL
DO $$
BEGIN
  ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT USING role::text;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    ALTER TABLE public.roles ALTER COLUMN name TYPE TEXT USING name::text;
  END IF;

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_user_role;
  ALTER TABLE public.profiles ADD CONSTRAINT check_user_role CHECK (role IN ('administrador', 'cajero', 'empleado'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Asegurar columna is_owner en tabla profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. RESTRICCIÓN ÚNICA: Solo puede existir UN ÚNICO Propietario (is_owner = true) en todo el sistema
DROP INDEX IF EXISTS public.idx_unique_system_owner;
CREATE UNIQUE INDEX idx_unique_system_owner 
  ON public.profiles (is_owner) 
  WHERE is_owner = TRUE;

-- 4. Actualizar tabla de referencia de roles
INSERT INTO public.roles (name, description) VALUES
  ('administrador', 'Acceso completo al sistema'),
  ('cajero', 'Atención de pedidos y facturación'),
  ('empleado', 'Acceso operativo general')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 5. FUNCIONES HELPER DE SEGURIDAD
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_owner = TRUE 
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND (role = 'administrador' OR is_owner = TRUE)
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. TRIGGER DE PROTECCIÓN INQUEBRANTABLE DEL PROPIETARIO Y PERFILES
CREATE OR REPLACE FUNCTION public.protect_owner_and_profiles()
RETURNS TRIGGER AS $$
DECLARE
  current_user_is_owner BOOLEAN;
  current_user_is_admin BOOLEAN;
BEGIN
  current_user_is_owner := public.is_owner();
  current_user_is_admin := public.is_admin();

  -- ELIMINACIÓN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_owner = TRUE THEN
      RAISE EXCEPTION 'El Propietario del Sistema no puede ser eliminado bajo ninguna circunstancia.';
    END IF;

    IF NOT (current_user_is_admin OR current_user_is_owner) THEN
      RAISE EXCEPTION 'No tienes permisos para eliminar usuarios.';
    END IF;

    RETURN OLD;
  END IF;

  -- INSERCIÓN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_owner = TRUE AND NOT current_user_is_owner THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE is_owner = TRUE) THEN
        NEW.is_owner := FALSE;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- ACTUALIZACIÓN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.is_owner = TRUE THEN
      IF auth.uid() != OLD.id AND NOT current_user_is_owner THEN
        RAISE EXCEPTION 'Acceso denegado: No tienes permisos para modificar al Propietario del Sistema.';
      END IF;

      IF NEW.is_active = FALSE THEN
        RAISE EXCEPTION 'El Propietario del Sistema no puede ser desactivado.';
      END IF;

      IF NEW.role != 'administrador' THEN
        RAISE EXCEPTION 'El Propietario del Sistema debe mantener el rol de Administrador.';
      END IF;

      NEW.is_owner := TRUE;
    END IF;

    IF OLD.is_owner = FALSE AND NEW.is_owner = TRUE THEN
      IF NOT current_user_is_owner THEN
        RAISE EXCEPTION 'No tienes permisos para otorgar la condición de Propietario del Sistema.';
      END IF;
    END IF;

    IF NOT (current_user_is_admin OR current_user_is_owner) THEN
      NEW.role := OLD.role;
      NEW.is_owner := OLD.is_owner;
      NEW.is_active := OLD.is_active;
    END IF;

    IF current_user_is_admin AND NOT current_user_is_owner THEN
      NEW.is_owner := OLD.is_owner;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_owner_and_profiles ON public.profiles;

CREATE TRIGGER trg_protect_owner_and_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_and_profiles();

-- 7. REESTABLECER POLÍTICAS RLS DE PROFILES
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuario puede editar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Solo admin puede insertar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo admin puede eliminar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Visibilidad de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Visibilidad estricta de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Politica de actualizacion de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizacion de perfiles protegida" ON public.profiles;
DROP POLICY IF EXISTS "Insercion de perfiles por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Solo owner o admin puede eliminar perfiles no-owner" ON public.profiles;
DROP POLICY IF EXISTS "Eliminacion de perfiles no-owner" ON public.profiles;

CREATE POLICY "Visibilidad estricta de perfiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    public.is_owner()
    OR
    (public.is_admin() AND is_owner = FALSE)
    OR
    (is_owner = FALSE AND public.is_active_user())
  );

CREATE POLICY "Insercion de perfiles por administradores"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_admin() OR public.is_owner())
    AND
    (is_owner = FALSE OR public.is_owner())
  );

CREATE POLICY "Actualizacion de perfiles protegida"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_owner()
    OR
    (public.is_admin() AND is_owner = FALSE)
    OR
    id = auth.uid()
  )
  WITH CHECK (
    (is_owner = FALSE OR public.is_owner())
  );

CREATE POLICY "Eliminacion de perfiles no-owner"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    is_owner = FALSE
    AND (public.is_admin() OR public.is_owner())
  );

-- 8. FUNCIÓN PARA ASIGNAR OWNER POR CORREO ELECTRÓNICO
CREATE OR REPLACE FUNCTION public.set_system_owner_by_email(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email 
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN 'Usuario con email ' || target_email || ' no encontrado en auth.users.';
  END IF;

  UPDATE public.profiles SET is_owner = FALSE WHERE is_owner = TRUE;

  UPDATE public.profiles 
  SET is_owner = TRUE, role = 'administrador', is_active = TRUE
  WHERE id = target_user_id;

  RETURN 'Usuario ' || target_email || ' configurado exitosamente como Propietario (Owner) del Sistema.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
