-- RLS policies for productos storage bucket
-- Bucket already created via API with public=true

CREATE POLICY "public_read_productos_bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'productos');

CREATE POLICY "auth_insert_productos_bucket" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'productos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_update_productos_bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'productos'
    AND auth.role() = 'authenticated'
  ) WITH CHECK (
    bucket_id = 'productos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "auth_delete_productos_bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'productos'
    AND auth.role() = 'authenticated'
  );
