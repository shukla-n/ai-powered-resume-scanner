-- Fix incorrect foreign key so uploaded job role IDs can be stored in match_scores
ALTER TABLE public.match_scores
DROP CONSTRAINT IF EXISTS match_scores_job_description_id_fkey;

ALTER TABLE public.match_scores
ADD CONSTRAINT match_scores_job_description_id_fkey
FOREIGN KEY (job_description_id)
REFERENCES public.job_roles(id)
ON DELETE CASCADE;