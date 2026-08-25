-- ============================================================
-- MADRIGALES PASTELERÍA: TABLA DE VARIANTES Y DATOS DE PRUEBA
-- (100% DINÁMICO Y A PRUEBA DE CONSTRAINTS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: product_variants (Presentaciones / Tamaños)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas en order_items para guardar la presentación
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'variant_name'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN variant_name TEXT;
  END IF;
END $$;

-- Habilitar RLS en product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_variants_select_all" ON public.product_variants;
CREATE POLICY "product_variants_select_all" ON public.product_variants
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "product_variants_all_admin" ON public.product_variants;
CREATE POLICY "product_variants_all_admin" ON public.product_variants
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'administrador' OR is_owner = TRUE))
  );

-- 2. CATEGORÍAS DE PRODUCTOS (Garantizar existencia)
INSERT INTO public.product_categories (name, description) VALUES
  ('Pasteles', 'Pasteles artesanales y para eventos especiales'),
  ('Cupcakes', 'Cupcakes gourmet individuales y en sets'),
  ('Postres', 'Cheesecakes, mousses y delicias frías'),
  ('Bocadillos', 'Galletas decoradas, cake pops y mini postres'),
  ('Especialidades', 'Creaciones de temporada y pedidos de autor')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 3. PRODUCTOS Y PRESENTACIONES REALISTAS (USANDO CATEGORY_ID DINÁMICO)
DO $$
DECLARE
  v_cat_pasteles UUID;
  v_cat_cupcakes UUID;
  v_cat_postres UUID;
  v_cat_bocadillos UUID;
  v_p_id UUID;
  v_pm_efectivo UUID;
  v_pm_transf UUID;
  v_pm_tarjeta UUID;
  v_order_id UUID;
BEGIN
  -- Obtener IDs reales de categorías
  SELECT id INTO v_cat_pasteles FROM public.product_categories WHERE name = 'Pasteles' LIMIT 1;
  SELECT id INTO v_cat_cupcakes FROM public.product_categories WHERE name = 'Cupcakes' LIMIT 1;
  SELECT id INTO v_cat_postres FROM public.product_categories WHERE name = 'Postres' LIMIT 1;
  SELECT id INTO v_cat_bocadillos FROM public.product_categories WHERE name = 'Bocadillos' LIMIT 1;

  -- -------------------------------------------------------------
  -- Producto 1: Pastel de Chocolate
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Pastel de Chocolate', 'Bizcocho húmedo de cacao con relleno de fudge artesanal y cobertura de chocolate belga.', v_cat_pasteles, 450.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Pequeño', 450.00, TRUE),
    (v_p_id, 'Mediano', 850.00, TRUE),
    (v_p_id, 'Grande', 1200.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 2: Pastel Tres Leches
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Pastel Tres Leches', 'Clásico bizcocho bañado en mezcla tradicional de tres leches y canela, decorado con merengue suizo.', v_cat_pasteles, 100.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 100.00, TRUE),
    (v_p_id, 'Mediano', 750.00, TRUE),
    (v_p_id, 'Grande', 1100.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 3: Pastel de Fresas con Crema
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Pastel de Fresas con Crema', 'Suave bizcocho de vainilla relleno de crema chantilly fresca y trozos de fresa natural.', v_cat_pasteles, 500.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Pequeño', 500.00, TRUE),
    (v_p_id, 'Mediano', 950.00, TRUE),
    (v_p_id, 'Grande', 1350.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 4: Cupcakes Red Velvet
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Cupcakes Red Velvet', 'Bizcocho aterciopelado rojo con suave frosting de queso crema Philadelphia.', v_cat_cupcakes, 50.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 50.00, TRUE),
    (v_p_id, 'Caja de 6', 280.00, TRUE),
    (v_p_id, 'Caja de 12', 520.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 5: Cupcakes de Chocolate
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Cupcakes de Chocolate', 'Cupcakes de cacao con centro fundente de ganache y decorado festivo.', v_cat_cupcakes, 45.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 45.00, TRUE),
    (v_p_id, 'Caja de 6', 250.00, TRUE),
    (v_p_id, 'Caja de 12', 480.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 6: Cheesecake New York
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Cheesecake New York', 'Base crocante de galleta con relleno cremoso horneado y topping de frutos rojos.', v_cat_postres, 120.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 120.00, TRUE),
    (v_p_id, 'Mediano', 650.00, TRUE),
    (v_p_id, 'Grande', 1000.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 7: Tiramisú Clásico
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Tiramisú Clásico', 'Capas de soletillas empapadas en café espresso y licor suave con crema mascarpone.', v_cat_postres, 150.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 150.00, TRUE),
    (v_p_id, 'Familiar (6 porciones)', 700.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 8: Galletas Decoradas
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Galletas Decoradas', 'Galletas de mantequilla finamente decoradas a mano con glasé real temático.', v_cat_bocadillos, 35.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Unidad', 35.00, TRUE),
    (v_p_id, 'Caja de 6', 190.00, TRUE),
    (v_p_id, 'Caja de 12', 360.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 9: Brownies Gourmet
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Brownies Gourmet', 'Brownies densos y melosos de chocolate amargo con nueces pecanas tostadas.', v_cat_postres, 65.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Individual', 65.00, TRUE),
    (v_p_id, 'Caja de 4', 240.00, TRUE),
    (v_p_id, 'Caja de 8', 450.00, TRUE);

  -- -------------------------------------------------------------
  -- Producto 10: Cake Pops Festivos
  -- -------------------------------------------------------------
  INSERT INTO public.products (name, description, category_id, price, is_active)
  VALUES ('Cake Pops Festivos', 'Paletas de pastel de vainilla o chocolate cubiertas con chocolate y chispas de colores.', v_cat_bocadillos, 40.00, TRUE)
  RETURNING id INTO v_p_id;

  INSERT INTO public.product_variants (product_id, name, price, is_active) VALUES
    (v_p_id, 'Unidad', 40.00, TRUE),
    (v_p_id, 'Docena (12 uds)', 420.00, TRUE);

  -- -------------------------------------------------------------
  -- 4. Métodos de Pago
  -- -------------------------------------------------------------
  INSERT INTO public.payment_methods (name, is_active) VALUES
    ('Efectivo', TRUE),
    ('Transferencia Bancaria', TRUE),
    ('Tarjeta de Crédito / Débito', TRUE),
    ('Tengo / Billetera Digital', TRUE)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_pm_efectivo FROM public.payment_methods WHERE name = 'Efectivo' LIMIT 1;
  SELECT id INTO v_pm_transf FROM public.payment_methods WHERE name = 'Transferencia Bancaria' LIMIT 1;
  SELECT id INTO v_pm_tarjeta FROM public.payment_methods WHERE name = 'Tarjeta de Crédito / Débito' LIMIT 1;

  -- -------------------------------------------------------------
  -- 5. Pedidos de Prueba Realistas
  -- -------------------------------------------------------------
  -- Pedido 1: MAD-000001
  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, payment_method_id, notes
  ) VALUES (
    'MAD-000001', 'María López', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', '14:30:00',
    'entregado', 1130.00, 0.00, 1130.00, 1130.00, v_pm_efectivo, 'Entrega para cumpleaños de su hija.'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_name, variant_name, unit_price, quantity) VALUES
    (v_order_id, 'Pastel de Chocolate', 'Mediano', 850.00, 1),
    (v_order_id, 'Cupcakes Red Velvet', 'Caja de 6', 280.00, 1);

  -- Pedido 2: MAD-000002
  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, payment_method_id, notes
  ) VALUES (
    'MAD-000002', 'José Martínez', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '1 day', '16:00:00',
    'en_preparacion', 1460.00, 0.00, 1460.00, 730.00, v_pm_transf, 'Abonó el 50% vía transferencia. Saldo L 730 al retirar.'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_name, variant_name, unit_price, quantity) VALUES
    (v_order_id, 'Pastel Tres Leches', 'Grande', 1100.00, 1),
    (v_order_id, 'Galletas Decoradas', 'Caja de 12', 360.00, 1);

  -- Pedido 3: MAD-000003
  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, payment_method_id, notes
  ) VALUES (
    'MAD-000003', 'Andrea Hernández', CURRENT_DATE, CURRENT_DATE, '18:00:00',
    'listo', 1000.00, 0.00, 1000.00, 1000.00, v_pm_tarjeta, 'Cliente pasará a recoger a las 6:00 PM.'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_name, variant_name, unit_price, quantity) VALUES
    (v_order_id, 'Cheesecake New York', 'Grande', 1000.00, 1);

  -- Pedido 4: MAD-000004
  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, payment_method_id, notes
  ) VALUES (
    'MAD-000004', 'Carlos Rivera', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', '11:00:00',
    'pendiente', 950.00, 0.00, 950.00, 0.00, v_pm_efectivo, 'Dedicatoria: "Felicidades Papá en tus 60".'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_name, variant_name, unit_price, quantity) VALUES
    (v_order_id, 'Pastel de Fresas con Crema', 'Mediano', 950.00, 1);

  -- Pedido 5: MAD-000005 (Consumidor Final)
  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, payment_method_id, notes
  ) VALUES (
    'MAD-000005', NULL, CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', '12:15:00',
    'entregado', 480.00, 0.00, 480.00, 480.00, v_pm_efectivo, 'Venta directa en mostrador.'
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_name, variant_name, unit_price, quantity) VALUES
    (v_order_id, 'Cupcakes de Chocolate', 'Caja de 12', 480.00, 1);

END $$;
