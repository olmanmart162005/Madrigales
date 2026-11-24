-- ============================================================
-- NANI CAKE: PEDIDOS WEB (SOLICITUDES DESDE LA PÁGINA) — IDEMPOTENTE
-- Ejecutar en Supabase → SQL Editor.
--
-- Flujo:
--   1. El cliente arma su pedido en la página → se guarda aquí como 'pendiente'.
--   2. El personal lo ve en "Pedidos Web" (con notificación) y lo confirma o rechaza.
--   3. Al confirmar se crea el pedido real en "Pedidos" (orders + order_items).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.web_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio          TEXT UNIQUE NOT NULL,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  desired_date   DATE,
  notes          TEXT,
  items          JSONB NOT NULL,          -- [{product_id, variant_id, name, variant, qty, price}]
  total          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  status         TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'rechazado')),
  seen_at        TIMESTAMPTZ,             -- NULL = notificación sin ver
  reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reject_reason  TEXT,
  order_id       UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_web_orders_status  ON public.web_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_orders_unseen  ON public.web_orders (created_at) WHERE seen_at IS NULL;

ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;

-- Visitantes de la página: solo pueden CREAR solicitudes nuevas y limpias (no leer ni modificar).
DROP POLICY IF EXISTS "Web: visitantes crean solicitudes" ON public.web_orders;
CREATE POLICY "Web: visitantes crean solicitudes" ON public.web_orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pendiente'
    AND seen_at IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL
    AND order_id IS NULL AND reject_reason IS NULL
    AND char_length(customer_name) BETWEEN 2 AND 80
    AND char_length(customer_phone) BETWEEN 7 AND 25
    AND desired_date IS NOT NULL AND desired_date >= CURRENT_DATE - 1
    AND char_length(COALESCE(notes, '')) <= 600
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) BETWEEN 1 AND 40
  );

-- Personal activo: ver y marcar como vistas.
DROP POLICY IF EXISTS "Personal ve solicitudes web" ON public.web_orders;
CREATE POLICY "Personal ve solicitudes web" ON public.web_orders
  FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS "Personal actualiza solicitudes web" ON public.web_orders;
CREATE POLICY "Personal actualiza solicitudes web" ON public.web_orders
  FOR UPDATE TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "Admin elimina solicitudes web" ON public.web_orders;
CREATE POLICY "Admin elimina solicitudes web" ON public.web_orders
  FOR DELETE TO authenticated USING (public.is_admin());

GRANT INSERT ON public.web_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.web_orders TO authenticated;

-- Notificaciones en tiempo real para el panel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'web_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.web_orders;
  END IF;
END $$;

-- ------------------------------------------------------------
-- CONFIRMAR: crea el pedido real (precios actuales del catálogo)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_web_order(
  p_id UUID,
  p_delivery_date DATE DEFAULT NULL,
  p_delivery_time TIME DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w         public.web_orders%ROWTYPE;
  v_item    JSONB;
  v_price   NUMERIC(10,2);
  v_name    TEXT;
  v_qty     INTEGER;
  v_total   NUMERIC(10,2) := 0;
  v_next    BIGINT;
  v_number  TEXT;
  v_order   UUID;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT * INTO w FROM public.web_orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
  IF w.status <> 'pendiente' THEN RAISE EXCEPTION 'Esta solicitud ya fue %', w.status; END IF;

  -- Número de pedido consecutivo (mismo formato que el punto de venta)
  PERFORM pg_advisory_xact_lock(hashtext('nani_cake_order_number'));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '\D', '', 'g'), '')::BIGINT), 0) + 1
    INTO v_next FROM public.orders;
  v_number := 'NC-' || lpad(v_next::TEXT, 6, '0');

  INSERT INTO public.orders (
    order_number, customer_name, order_date, delivery_date, delivery_time,
    status, subtotal, discount, total, amount_paid, notes,
    order_type, payment_status, created_by
  ) VALUES (
    v_number, w.customer_name, CURRENT_DATE,
    COALESCE(p_delivery_date, w.desired_date, CURRENT_DATE), p_delivery_time,
    'pendiente', 0, 0, 0, 0,
    concat_ws(E'\n',
      'Pedido web ' || w.folio || ' · Tel/WhatsApp: ' || w.customer_phone,
      NULLIF(w.notes, '')),
    'programado', 'pendiente', auth.uid()
  ) RETURNING id INTO v_order;

  FOR v_item IN SELECT * FROM jsonb_array_elements(w.items) LOOP
    v_qty := GREATEST(COALESCE((v_item->>'qty')::INTEGER, 1), 1);
    v_price := NULL;
    v_name := NULL;

    -- Precio vigente: presentación → producto → precio enviado
    IF NULLIF(v_item->>'variant_id', '') IS NOT NULL THEN
      SELECT pv.price INTO v_price FROM public.product_variants pv
      WHERE pv.id = (v_item->>'variant_id')::UUID;
    END IF;
    IF NULLIF(v_item->>'product_id', '') IS NOT NULL THEN
      SELECT p.name, COALESCE(v_price, p.price) INTO v_name, v_price FROM public.products p
      WHERE p.id = (v_item->>'product_id')::UUID;
    END IF;
    v_price := COALESCE(v_price, (v_item->>'price')::NUMERIC, 0);
    v_name  := COALESCE(v_name, v_item->>'name', 'Producto');

    INSERT INTO public.order_items (order_id, product_id, product_name, variant_id, variant_name, unit_price, quantity)
    VALUES (
      v_order,
      NULLIF(v_item->>'product_id', '')::UUID,
      v_name,
      NULLIF(v_item->>'variant_id', '')::UUID,
      NULLIF(v_item->>'variant', ''),
      v_price,
      v_qty
    );
    v_total := v_total + v_price * v_qty;
  END LOOP;

  UPDATE public.orders SET subtotal = v_total, total = v_total WHERE id = v_order;

  UPDATE public.web_orders
  SET status = 'confirmado', order_id = v_order, reviewed_by = auth.uid(),
      reviewed_at = NOW(), seen_at = COALESCE(seen_at, NOW())
  WHERE id = p_id;

  RETURN v_order;
END $$;

-- ------------------------------------------------------------
-- RECHAZAR
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_web_order(p_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.web_orders
  SET status = 'rechazado', reject_reason = NULLIF(trim(p_reason), ''),
      reviewed_by = auth.uid(), reviewed_at = NOW(), seen_at = COALESCE(seen_at, NOW())
  WHERE id = p_id AND status = 'pendiente';
  IF NOT FOUND THEN RAISE EXCEPTION 'La solicitud no existe o ya fue revisada'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.confirm_web_order(UUID, DATE, TIME) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_web_order(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_web_order(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_web_order(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
