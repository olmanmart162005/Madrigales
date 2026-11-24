-- ============================================================
-- NANI CAKE: FOTOS DE PRODUCTOS + WHATSAPP + PDF DE PEDIDOS WEB (IDEMPOTENTE)
-- Ejecutar en Supabase → SQL Editor.
-- ============================================================

-- 1. WhatsApp oficial para recibir los pedidos de la página web
UPDATE public.business_settings
SET whatsapp = '+504 8751-6103',
    phone    = COALESCE(phone, '+504 8751-6103'),
    updated_at = NOW();

-- 2. Fotos de referencia para el catálogo (servidas por la propia app en /products/)
--    Solo se asignan a productos que todavía NO tienen foto propia.
UPDATE public.products p
SET image_url = v.url, updated_at = NOW()
FROM (VALUES
  ('Pastel de Chocolate',        '/products/pastel-chocolate.webp'),
  ('Pastel Tres Leches',         '/products/pastel-tres-leches.webp'),
  ('Pastel de Fresas con Crema', '/products/pastel-fresas-crema.webp'),
  ('Cupcakes Red Velvet',        '/products/cupcakes-red-velvet.webp'),
  ('Cupcakes de Chocolate',      '/products/cupcakes-chocolate.webp'),
  ('Cheesecake New York',        '/products/cheesecake-new-york.webp'),
  ('Tiramisú Clásico',           '/products/tiramisu-clasico.webp'),
  ('Galletas Decoradas',         '/products/galletas-decoradas.webp'),
  ('Brownies Gourmet',           '/products/brownies-gourmet.webp'),
  ('Cake Pops Festivos',         '/products/cake-pops-festivos.webp')
) AS v(name, url)
WHERE p.name = v.name AND (p.image_url IS NULL OR p.image_url = '');

-- 3. Favoritos navideños de la landing
UPDATE public.products SET is_featured = TRUE
WHERE name IN ('Galletas Decoradas', 'Pastel de Chocolate', 'Cake Pops Festivos');

-- 4. Almacenamiento de PDF de pedidos web
--    Bucket público (el enlace va en el mensaje de WhatsApp), solo PDF, máx. 1 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pedidos-web', 'pedidos-web', TRUE, 1048576, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = TRUE, file_size_limit = 1048576, allowed_mime_types = ARRAY['application/pdf'];

-- Los visitantes solo pueden SUBIR PDF a la carpeta "pedidos/" (no listar, editar ni borrar).
DROP POLICY IF EXISTS "Web: visitantes suben PDF de pedido" ON storage.objects;
CREATE POLICY "Web: visitantes suben PDF de pedido" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'pedidos-web' AND (storage.foldername(name))[1] = 'pedidos');

-- El personal administrador puede ver y limpiar los PDF antiguos.
DROP POLICY IF EXISTS "Admin gestiona PDF de pedidos web" ON storage.objects;
CREATE POLICY "Admin gestiona PDF de pedidos web" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'pedidos-web' AND public.is_admin())
  WITH CHECK (bucket_id = 'pedidos-web' AND public.is_admin());
