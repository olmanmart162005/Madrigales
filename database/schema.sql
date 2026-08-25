-- ============================================================
-- MADRIGALES PASTELERÍA — Base de Datos Completa con Jerarquía de Seguridad
-- Propietario Principal: Olman Martínez
-- Administrador: Yimi Ríos / Administradores
-- Cajeros: Personal de venta y facturación
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type') THEN
    CREATE TYPE movement_type AS ENUM ('entrada', 'salida');
  END IF;
END $$;

-- ============================================================
-- TABLA: roles (referencia)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, description) VALUES
  ('administrador', 'Acceso completo al sistema y administración'),
  ('cajero', 'Gestión de pedidos, facturación y consultas'),
  ('empleado', 'Acceso operativo general')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLA: profiles (extiende auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'cajero' CHECK (role IN ('administrador', 'cajero', 'empleado')),
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restricción estricta: Solo puede haber UN ÚNICO Propietario (is_owner = true) en todo el sistema
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_system_owner 
  ON profiles (is_owner) 
  WHERE is_owner = TRUE;

-- ============================================================
-- TABLA: product_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO product_categories (name, description) VALUES
  ('Pasteles', 'Pasteles completos y personalizados'),
  ('Cupcakes', 'Cupcakes individuales y en sets'),
  ('Postres', 'Postres variados'),
  ('Galletas', 'Galletas decoradas y sencillas'),
  ('Repostería', 'Repostería general'),
  ('Otros', 'Otros productos')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLA: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: payment_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_methods (name) VALUES
  ('Efectivo'),
  ('Transferencia'),
  ('Tarjeta de crédito'),
  ('Tarjeta de débito'),
  ('Pago móvil')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLA: orders
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT, -- OPTIONAL
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  delivery_time TIME,
  status order_status NOT NULL DEFAULT 'pendiente',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  balance NUMERIC(10,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: order_items
-- CRÍTICO: unit_price = snapshot del precio al momento de la venta
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- snapshot del nombre
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0), -- snapshot del precio histórico
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventory_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO inventory_categories (name, description) VALUES
  ('Harinas y polvos', 'Harinas, azúcar, sal, levadura, etc.'),
  ('Lácteos', 'Leche, crema, mantequilla, queso'),
  ('Huevos', 'Huevos frescos'),
  ('Chocolates', 'Chocolate, cacao, cobertura'),
  ('Saborizantes', 'Vainilla, esencias, colorantes'),
  ('Decoraciones', 'Sprinkles, fondant, chispas, perlas'),
  ('Empaque', 'Cajas, bolsas, cintas, etiquetas'),
  ('Otros', 'Otros insumos')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- TABLA: inventory_items (materias primas)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'unidad',
  min_quantity NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  expiry_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: inventory_movements
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type movement_type NOT NULL,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  quantity_before NUMERIC(10,3) NOT NULL CHECK (quantity_before >= 0),
  quantity_after NUMERIC(10,3) NOT NULL CHECK (quantity_after >= 0),
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: business_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL DEFAULT 'Madrigales Pastelería',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  invoice_footer TEXT,
  invoice_header TEXT,
  currency_symbol TEXT NOT NULL DEFAULT 'L',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO business_settings (business_name, currency_symbol, invoice_footer)
VALUES (
  'Madrigales Pastelería', 
  'L', 
  '¡Gracias por endulzar tus momentos con Madrigales Pastelería! 🎂'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLA: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT, -- snapshot
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_is_owner ON profiles(is_owner);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_product_categories_updated_at BEFORE UPDATE ON product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Auto-crear profile cuando se registra un usuario
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_owner)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'cajero'),
    FALSE -- Siempre FALSE por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Prevenir eliminación de productos con order_items
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_product_deletion_with_history()
RETURNS TRIGGER AS $$
DECLARE
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count
  FROM order_items
  WHERE product_id = OLD.id;

  IF item_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar el producto "%" porque tiene % pedido(s) asociado(s). Desactívalo en su lugar.', OLD.name, item_count;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_product_deletion
  BEFORE DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION prevent_product_deletion_with_history();

-- ============================================================
-- TRIGGER: Prevenir inventario negativo al registrar salida
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_negative_inventory()
RETURNS TRIGGER AS $$
DECLARE
  current_qty NUMERIC;
BEGIN
  IF NEW.type = 'salida' THEN
    SELECT quantity INTO current_qty FROM inventory_items WHERE id = NEW.item_id;
    IF current_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente. Existencia actual: %, cantidad solicitada: %', current_qty, NEW.quantity;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_negative_inventory
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_negative_inventory();

-- ============================================================
-- TRIGGER: Actualizar cantidad de inventario al registrar movimiento
-- ============================================================
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'entrada' THEN
    UPDATE inventory_items SET quantity = quantity + NEW.quantity WHERE id = NEW.item_id;
  ELSIF NEW.type = 'salida' THEN
    UPDATE inventory_items SET quantity = quantity - NEW.quantity WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory_quantity
  AFTER INSERT ON inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_inventory_quantity();

-- ============================================================
-- FUNCIONES DE SEGURIDAD PARA RLS
-- ============================================================
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

-- ============================================================
-- TRIGGER: PROTECCIÓN ESTRICTA DE OWNER Y PERFILES
-- ============================================================
CREATE OR REPLACE FUNCTION public.protect_owner_and_profiles()
RETURNS TRIGGER AS $$
DECLARE
  current_user_is_owner BOOLEAN;
  current_user_is_admin BOOLEAN;
BEGIN
  current_user_is_owner := public.is_owner();
  current_user_is_admin := public.is_admin();

  IF TG_OP = 'DELETE' THEN
    IF OLD.is_owner = TRUE THEN
      RAISE EXCEPTION 'El Propietario del Sistema no puede ser eliminado bajo ninguna circunstancia.';
    END IF;

    IF NOT (current_user_is_admin OR current_user_is_owner) THEN
      RAISE EXCEPTION 'No tienes permisos para eliminar usuarios.';
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_owner = TRUE AND NOT current_user_is_owner THEN
      IF EXISTS (SELECT 1 FROM public.profiles WHERE is_owner = TRUE) THEN
        NEW.is_owner := FALSE;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

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

CREATE TRIGGER trg_protect_owner_and_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_and_profiles();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS PARA PROFILES
-- ============================================================
CREATE POLICY "Visibilidad estricta de perfiles"
  ON profiles FOR SELECT
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
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_admin() OR public.is_owner())
    AND
    (is_owner = FALSE OR public.is_owner())
  );

CREATE POLICY "Actualizacion de perfiles protegida"
  ON profiles FOR UPDATE
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
  ON profiles FOR DELETE
  TO authenticated
  USING (
    is_owner = FALSE
    AND (public.is_admin() OR public.is_owner())
  );

-- ============================================================
-- POLÍTICAS RLS PARA LAS DEMÁS TABLAS
-- ============================================================

-- roles
CREATE POLICY "Todos pueden ver roles" ON roles FOR SELECT TO authenticated USING (TRUE);

-- product_categories
CREATE POLICY "Todos pueden ver categorías de productos" ON product_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin u owner puede gestionar categorías" ON product_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- products
CREATE POLICY "Todos pueden ver productos" ON products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin u owner puede crear productos" ON products FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Solo admin u owner puede editar productos" ON products FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Solo admin u owner puede eliminar productos" ON products FOR DELETE TO authenticated USING (public.is_admin());

-- payment_methods
CREATE POLICY "Todos pueden ver métodos de pago" ON payment_methods FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin u owner puede gestionar métodos de pago" ON payment_methods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- orders
CREATE POLICY "Usuarios activos pueden ver pedidos" ON orders FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden crear pedidos" ON orders FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY "Usuarios activos pueden editar pedidos" ON orders FOR UPDATE TO authenticated USING (public.is_active_user());
CREATE POLICY "Solo admin u owner puede eliminar pedidos" ON orders FOR DELETE TO authenticated USING (public.is_admin());

-- order_items
CREATE POLICY "Usuarios activos pueden ver items de pedidos" ON order_items FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden crear items de pedidos" ON order_items FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY "Usuarios activos pueden editar items de pedidos" ON order_items FOR UPDATE TO authenticated USING (public.is_active_user());
CREATE POLICY "Solo admin u owner puede eliminar items de pedidos" ON order_items FOR DELETE TO authenticated USING (public.is_admin());

-- inventory_categories
CREATE POLICY "Todos pueden ver categorías de inventario" ON inventory_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin u owner puede gestionar categorías de inventario" ON inventory_categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- inventory_items
CREATE POLICY "Usuarios activos pueden ver inventario" ON inventory_items FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden crear materias primas" ON inventory_items FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY "Usuarios activos pueden editar materias primas" ON inventory_items FOR UPDATE TO authenticated USING (public.is_active_user());
CREATE POLICY "Solo admin u owner puede eliminar materias primas" ON inventory_items FOR DELETE TO authenticated USING (public.is_admin());

-- inventory_movements
CREATE POLICY "Usuarios activos pueden ver movimientos" ON inventory_movements FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden registrar movimientos" ON inventory_movements FOR INSERT TO authenticated WITH CHECK (public.is_active_user());

-- business_settings
CREATE POLICY "Todos pueden ver configuración" ON business_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Solo admin u owner puede editar configuración" ON business_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- activity_logs
CREATE POLICY "Usuarios activos pueden ver actividad" ON activity_logs FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY "Usuarios activos pueden insertar actividad" ON activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_active_user());

-- ============================================================
-- STORAGE BUCKETS & POLICIES
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', TRUE) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('business', 'business', TRUE) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar publico visible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Usuario puede subir su avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Usuario puede actualizar su avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Usuario puede eliminar su avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

CREATE POLICY "Productos publicos visibles" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admin puede subir imagenes de productos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');
CREATE POLICY "Admin puede actualizar imagenes de productos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products');

CREATE POLICY "Business publico visible" ON storage.objects FOR SELECT USING (bucket_id = 'business');
CREATE POLICY "Admin puede subir archivos del negocio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business');
CREATE POLICY "Admin puede actualizar archivos del negocio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'business');
