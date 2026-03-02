
-- Devices table for device-based authentication
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_name TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON public.devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own devices" ON public.devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own devices" ON public.devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own devices" ON public.devices FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('debit', 'credit');

-- Transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  transaction_type public.transaction_type NOT NULL,
  description TEXT,
  merchant TEXT,
  source_app TEXT,
  raw_notification TEXT,
  transaction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  nonce TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Service role insert policy (edge function uses service role)
CREATE POLICY "Service role can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_transactions_user_time ON public.transactions(user_id, transaction_time DESC);
CREATE INDEX idx_transactions_device ON public.transactions(device_id);
CREATE INDEX idx_devices_api_key ON public.devices(api_key);

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
