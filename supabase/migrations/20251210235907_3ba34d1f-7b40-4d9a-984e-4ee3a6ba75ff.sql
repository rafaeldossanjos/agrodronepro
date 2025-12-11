-- Add status column to plots table
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update existing plots to have 'pending' status if null
UPDATE public.plots SET status = 'pending' WHERE status IS NULL;