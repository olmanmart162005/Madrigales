-- ============================================================
-- SOLUCIÓN AL ERROR 500 (Database error querying schema)
-- Causa: Recursión infinita en las políticas RLS de profiles
-- ============================================================

-- 1. Eliminar temporalmente todas las políticas conflictivas de profiles
DROP POLICY IF EXISTS "Visibilidad estricta de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Usuario puede editar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Solo admin puede insertar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo admin puede eliminar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Visibilidad de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Politica de actualizacion de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Actualizacion de perfiles protegida" ON public.profiles;
DROP POLICY IF EXISTS "Insercion de perfiles por administradores" ON public.profiles;
DROP POLICY IF EXISTS "Solo owner o admin puede eliminar perfiles no-owner" ON public.profiles;
DROP POLICY IF EXISTS "Eliminacion de perfiles no-owner" ON public.profiles;

-- 2. Funciones de seguridad NO recursivas con SET search_path
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_owner FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT (role = 'administrador' OR is_owner = TRUE) FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE LIMIT 1),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    FALSE
  );
$$;

-- 3. POLÍTICAS RLS LIMPIAS Y SIN RECURSIÓN

-- SELECT:
-- - El usuario siempre puede ver su propio registro (id = auth.uid())
-- - Si es owner, ve todo
-- - Si no es owner, solo ve perfiles donde is_owner = false
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    public.is_owner()
    OR
    is_owner = FALSE
  );

-- INSERT:
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR
    public.is_admin()
    OR
    public.is_owner()
  );

-- UPDATE:
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR
    public.is_admin()
    OR
    public.is_owner()
  )
  WITH CHECK (
    -- Nadie puede ponerse is_owner = true excepto el owner
    (is_owner = FALSE OR public.is_owner())
  );

-- DELETE:
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    is_owner = FALSE
    AND (public.is_admin() OR public.is_owner())
  );

-- 4. TRIGGER LIMPIO PARA NUEVOS USUARIOS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_owner, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cajero'),
    FALSE,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. TRIGGER DE PROTECCIÓN DEL OWNER
CREATE OR REPLACE FUNCTION public.protect_owner_and_profiles()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_owner = TRUE THEN
      RAISE EXCEPTION 'El Propietario del Sistema no puede ser eliminado.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Si es el owner, proteger estado y rol
    IF OLD.is_owner = TRUE THEN
      IF NEW.is_active = FALSE THEN
        RAISE EXCEPTION 'El Propietario del Sistema no puede ser desactivado.';
      END IF;
      NEW.is_owner := TRUE;
      NEW.role := 'administrador';
    END IF;

    -- Si no es el owner, no puede adjudicarse is_owner = true
    IF OLD.is_owner = FALSE AND NEW.is_owner = TRUE THEN
      IF NOT public.is_owner() THEN
        NEW.is_owner := FALSE;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_and_profiles ON public.profiles;
CREATE TRIGGER trg_protect_owner_and_profiles
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_and_profiles();

-- 6. Asegurar que la cuenta de Olman Martínez esté activa y sea Owner
UPDATE public.profiles 
SET is_owner = TRUE, role = 'administrador', is_active = TRUE, full_name = 'Olman Martínez'
WHERE id IN (SELECT id FROM auth.users WHERE LOWER(email) = 'olmanmart16@gmail.com');
