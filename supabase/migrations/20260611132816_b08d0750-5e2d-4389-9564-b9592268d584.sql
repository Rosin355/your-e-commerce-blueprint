
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Admins can delete sync bucket objects'
  ) THEN
    CREATE POLICY "Admins can delete sync bucket objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'sync' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
