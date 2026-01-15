-- Add package_size column to products table
ALTER TABLE public.products 
ADD COLUMN package_size numeric DEFAULT 1;