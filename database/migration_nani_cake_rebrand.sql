-- ============================================================
-- NANI CAKE: MIGRACIÓN DE MARCA + LANDING PAGE PÚBLICA (IDEMPOTENTE)
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 1. DATOS DEL NEGOCIO → NANI CAKE
--    Se borran los datos de contacto anteriores (Madrigales) para que
--    se registren los de Nani Cake en: Configuración → Datos del Negocio.
ALTER TABLE public.business_settings
  ALTER COLUMN business_name SET DEFAULT 'Nani Cake';

UPDATE public.business_settings
SET
  business_name  = 'Nani Cake',
  invoice_footer = '¡Gracias por endulzar tu Navidad con Nani Cake! 🎄🎂',
  invoice_header = NULL,
  logo_url       = NULL,
  address        = NULL,  -- ✏️ Completar con la dirección de Nani Cake
  phone          = NULL,  -- ✏️ Completar con el teléfono de Nani Cake
  whatsapp       = NULL,  -- ✏️ Completar con el WhatsApp de Nani Cake
  email          = NULL,  -- ✏️ Completar con el correo de Nani Cake
  website        = NULL,
  updated_at     = NOW();

INSERT INTO public.business_settings (business_name, currency_symbol, invoice_footer)
SELECT 'Nani Cake', 'L', '¡Gracias por endulzar tu Navidad con Nani Cake! 🎄🎂'
WHERE NOT EXISTS (SELECT 1 FROM public.business_settings);

-- 2. LECTURA PÚBLICA (anon) PARA LA LANDING PAGE
--    Solo lectura, solo registros activos. Escritura sigue restringida a admin/owner.
DROP POLICY IF EXISTS "Landing: público ve productos activos" ON public.products;
CREATE POLICY "Landing: público ve productos activos" ON public.products
  FOR SELECT TO anon USING (is_active = TRUE);

DROP POLICY IF EXISTS "Landing: público ve categorías activas" ON public.product_categories;
CREATE POLICY "Landing: público ve categorías activas" ON public.product_categories
  FOR SELECT TO anon USING (is_active = TRUE);

DROP POLICY IF EXISTS "Landing: público ve variantes activas" ON public.product_variants;
CREATE POLICY "Landing: público ve variantes activas" ON public.product_variants
  FOR SELECT TO anon USING (is_active = TRUE);

DROP POLICY IF EXISTS "Landing: público ve datos del negocio" ON public.business_settings;
CREATE POLICY "Landing: público ve datos del negocio" ON public.business_settings
  FOR SELECT TO anon USING (TRUE);

GRANT SELECT ON public.products, public.product_categories, public.product_variants, public.business_settings TO anon;
