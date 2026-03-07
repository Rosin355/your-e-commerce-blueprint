CREATE TABLE public.pipeline_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  total_rows int DEFAULT 0,
  processed_rows int DEFAULT 0,
  created_rows int DEFAULT 0,
  skipped_rows int DEFAULT 0,
  warning_count int DEFAULT 0,
  error_count int DEFAULT 0,
  ai_enriched_count int DEFAULT 0,
  fallback_count int DEFAULT 0,
  input_file_path text,
  output_file_path text,
  report_json jsonb,
  error_message text,
  dry_run boolean DEFAULT false,
  use_ai boolean DEFAULT true,
  default_vendor text DEFAULT 'Online Garden',
  row_limit int,
  warnings jsonb DEFAULT '[]'::jsonb,
  errors jsonb DEFAULT '[]'::jsonb,
  partial_rows jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pipeline_jobs ENABLE ROW LEVEL SECURITY;