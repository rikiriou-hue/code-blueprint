
-- Replace the overly permissive INSERT policy with a service-role-only approach
-- Drop the permissive policy; service role bypasses RLS anyway
DROP POLICY "Service role can insert transactions" ON public.transactions;
