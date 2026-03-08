-- Create job_roles table for shared recruiter role presets
CREATE TABLE IF NOT EXISTS public.job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read job roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'job_roles'
      AND policyname = 'Authenticated users can view job roles'
  ) THEN
    CREATE POLICY "Authenticated users can view job roles"
    ON public.job_roles
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;