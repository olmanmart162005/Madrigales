-- ============================================================
-- MADRIGALES PASTELERÍA: MIGRACIÓN PUNTO DE VENTA (POS) RÁPIDO
-- Soporte para Venta Inmediata vs Pedido Programado,
-- Efectivo Recibido, Vueltos y Estado de Pago
-- ============================================================

-- 1. Agregar columnas a 'orders' si no existen
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'inmediato' CHECK (order_type IN ('inmediato', 'programado')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pagado' CHECK (payment_status IN ('pagado', 'parcial', 'pendiente')),
  ADD COLUMN IF NOT EXISTS cash_received NUMERIC(10,2) DEFAULT NULL CHECK (cash_received IS NULL OR cash_received >= 0),
  ADD COLUMN IF NOT EXISTS change_returned NUMERIC(10,2) DEFAULT NULL CHECK (change_returned IS NULL OR change_returned >= 0);

-- 2. Agregar columnas de efectivo a 'order_payments' si no existen
ALTER TABLE public.order_payments 
  ADD COLUMN IF NOT EXISTS cash_received NUMERIC(10,2) DEFAULT NULL CHECK (cash_received IS NULL OR cash_received >= 0),
  ADD COLUMN IF NOT EXISTS change_returned NUMERIC(10,2) DEFAULT NULL CHECK (change_returned IS NULL OR change_returned >= 0);

-- 3. Actualizar payment_status en órdenes existentes de forma consistente
UPDATE public.orders
SET payment_status = CASE
  WHEN COALESCE(balance, total - amount_paid) <= 0 THEN 'pagado'
  WHEN amount_paid > 0 AND COALESCE(balance, total - amount_paid) > 0 THEN 'parcial'
  ELSE 'pendiente'
END
WHERE payment_status IS NULL OR payment_status = 'pagado';
