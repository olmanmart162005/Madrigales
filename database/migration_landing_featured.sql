-- ============================================================
-- NANI CAKE: PRODUCTOS DESTACADOS EN LA PÁGINA WEB (IDEMPOTENTE)
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 1. Marcar productos como "Destacado en la web" y ordenar el catálogo público
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order  INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_featured
  ON public.products (is_featured) WHERE is_active = TRUE;

-- 2. Almacenamiento de fotos: permitir reemplazar/eliminar imágenes a administradores
DROP POLICY IF EXISTS "Admin puede eliminar imagenes de productos" ON storage.objects;
CREATE POLICY "Admin puede eliminar imagenes de productos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'products' AND public.is_admin());

-- 3. Refrescar el caché de esquema de la API
NOTIFY pgrst, 'reload schema';
