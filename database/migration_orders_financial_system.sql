-- ============================================================
-- MADRIGALES: SISTEMA FINANCIERO INTEGRAL DE PEDIDOS (ORDEN DE MIGRACIÓN CORREGIDO)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA: order_payments (Historial de Abonos y Pagos Individuales)
CREATE TABLE IF NOT EXISTS public.order_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: order_adjustments (Ajustes Financieros Autorizados: Descuentos, Correcciones)
CREATE TABLE IF NOT EXISTS public.order_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('descuento', 'correccion', 'ajuste_autorizado', 'otro')),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios activos pueden ver pagos de pedidos" ON public.order_payments;
CREATE POLICY "Usuarios activos pueden ver pagos de pedidos" 
  ON public.order_payments FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Usuarios activos pueden registrar pagos" ON public.order_payments;
CREATE POLICY "Usuarios activos pueden registrar pagos" 
  ON public.order_payments FOR INSERT TO authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Solo admin u owner puede eliminar pagos" ON public.order_payments;
CREATE POLICY "Solo admin u owner puede eliminar pagos" 
  ON public.order_payments FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'administrador' OR is_owner = TRUE)
    )
  );

DROP POLICY IF EXISTS "Usuarios activos pueden ver ajustes de pedidos" ON public.order_adjustments;
CREATE POLICY "Usuarios activos pueden ver ajustes de pedidos" 
  ON public.order_adjustments FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Solo admin u owner puede crear ajustes" ON public.order_adjustments;
CREATE POLICY "Solo admin u owner puede crear ajustes" 
  ON public.order_adjustments FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'administrador' OR is_owner = TRUE)
    )
  );

DROP POLICY IF EXISTS "Solo admin u owner puede eliminar ajustes" ON public.order_adjustments;
CREATE POLICY "Solo admin u owner puede eliminar ajustes" 
  ON public.order_adjustments FOR DELETE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'administrador' OR is_owner = TRUE)
    )
  );

-- 4. DESACTIVAR TRIGGER DE ENTREGA PREVIO SI EXISTÍA (Para permitir corregir los antiguos)
DROP TRIGGER IF EXISTS trg_check_order_delivery_balance ON public.orders;

-- 5. PASO CRÍTICO: CORREGIR PEDIDOS ANTIGUOS ENTREGADOS CON SALDO (Pasarlos a 'listo')
UPDATE public.orders
SET status = 'listo'
WHERE status = 'entregado' AND (total - amount_paid) > 0;

-- 6. FUNCIÓN Y TRIGGER: RECÁLCULO AUTOMÁTICO DE SALDO Y PAGOS
CREATE OR REPLACE FUNCTION public.recalculate_order_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_total_paid NUMERIC(10,2) := 0;
  v_total_adjustments NUMERIC(10,2) := 0;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.order_id;
  ELSE
    v_order_id := NEW.order_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.order_payments
  WHERE order_id = v_order_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustments
  FROM public.order_adjustments
  WHERE order_id = v_order_id;

  UPDATE public.orders
  SET 
    amount_paid = v_total_paid,
    discount = v_total_adjustments,
    updated_at = NOW()
  WHERE id = v_order_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_order_payments ON public.order_payments;
CREATE TRIGGER trg_recalc_order_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_financials();

DROP TRIGGER IF EXISTS trg_recalc_order_adjustments ON public.order_adjustments;
CREATE TRIGGER trg_recalc_order_adjustments
  AFTER INSERT OR UPDATE OR DELETE ON public.order_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_order_financials();

-- 7. MIGRAR PAGOS HISTÓRICOS DE PEDIDOS EXISTENTES
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM public.orders WHERE amount_paid > 0 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.order_payments WHERE order_id = r.id) THEN
      INSERT INTO public.order_payments (
        order_id, amount, payment_method_id, payment_date, notes, created_by, created_at
      ) VALUES (
        r.id, r.amount_paid, r.payment_method_id, r.order_date, 'Pago / abono inicial registrado al crear el pedido', r.created_by, r.created_at
      );
    END IF;
  END LOOP;
END $$;

-- 8. ACTIVAR AHORA EL TRIGGER DE BLINDAJE PARA EL FUTURO
CREATE OR REPLACE FUNCTION public.check_order_delivery_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_calculated_balance NUMERIC(10,2);
BEGIN
  IF NEW.status = 'entregado' THEN
    v_calculated_balance := COALESCE(NEW.total, 0) - COALESCE(NEW.amount_paid, 0) - COALESCE(NEW.discount, 0);
    
    IF v_calculated_balance > 0 OR COALESCE(NEW.balance, 0) > 0 THEN
      RAISE EXCEPTION 'No se puede entregar este pedido porque tiene un saldo pendiente de L %. Primero debe registrar el pago restante.', GREATEST(v_calculated_balance, COALESCE(NEW.balance, 0));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_order_delivery_balance
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_order_delivery_balance();
