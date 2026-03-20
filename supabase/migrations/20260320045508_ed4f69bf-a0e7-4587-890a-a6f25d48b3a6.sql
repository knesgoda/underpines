
-- Creator Stripe Connect accounts
CREATE TABLE public.creator_stripe_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) UNIQUE NOT NULL,
  stripe_account_id text UNIQUE NOT NULL,
  account_status text CHECK (account_status IN ('pending','active','restricted','disabled')) DEFAULT 'pending',
  payouts_enabled boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.creator_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own connect account"
  ON public.creator_stripe_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert connect accounts"
  ON public.creator_stripe_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can update connect accounts"
  ON public.creator_stripe_accounts FOR UPDATE
  USING (user_id = auth.uid());

-- Collection Stripe prices
CREATE TABLE public.collection_stripe_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES public.collections(id) UNIQUE NOT NULL,
  stripe_price_id text UNIQUE NOT NULL,
  stripe_product_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  price_type text CHECK (price_type IN ('monthly','one_time')) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.collection_stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read collection prices"
  ON public.collection_stripe_prices FOR SELECT
  USING (true);

CREATE POLICY "Authors can insert prices"
  ON public.collection_stripe_prices FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections WHERE collections.id = collection_stripe_prices.collection_id AND collections.author_id = auth.uid()
  ));

-- Creator earnings tracking
CREATE TABLE public.creator_earnings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  collection_id uuid REFERENCES public.collections(id),
  subscriber_id uuid REFERENCES public.profiles(id),
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  creator_amount_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  status text CHECK (status IN ('pending','paid')) DEFAULT 'pending',
  earned_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read their earnings"
  ON public.creator_earnings FOR SELECT
  USING (creator_id = auth.uid());

-- Monthly payout summaries
CREATE TABLE public.creator_payout_summaries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_earnings_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  creator_amount_cents integer NOT NULL,
  subscriber_count integer NOT NULL,
  stripe_payout_id text,
  status text CHECK (status IN ('pending','paid','failed')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.creator_payout_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read their payout summaries"
  ON public.creator_payout_summaries FOR SELECT
  USING (creator_id = auth.uid());
