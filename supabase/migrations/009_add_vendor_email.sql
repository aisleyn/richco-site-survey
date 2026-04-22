-- Add contact_email column to vendors table
ALTER TABLE public.vendors
  ADD COLUMN contact_email TEXT;

-- Create index for email lookups
CREATE INDEX vendors_contact_email_idx ON public.vendors(contact_email);
