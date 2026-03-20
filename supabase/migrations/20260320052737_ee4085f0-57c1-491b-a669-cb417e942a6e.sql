
-- Cabin designs marketplace
CREATE TABLE public.cabin_designs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  name text NOT NULL,
  description text,
  preview_image_url text,
  price_cents integer NOT NULL DEFAULT 0,
  is_free boolean GENERATED ALWAYS AS (price_cents = 0) STORED,
  is_seasonal boolean DEFAULT false,
  season text CHECK (season IN ('spring','summer','autumn','winter')),
  status text CHECK (status IN ('draft','pending_review','published','rejected','archived')) DEFAULT 'draft',
  review_notes text,
  design_data jsonb NOT NULL,
  purchases integer DEFAULT 0,
  rating_yes integer DEFAULT 0,
  rating_no integer DEFAULT 0,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.cabin_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published designs" ON public.cabin_designs
  FOR SELECT USING (status = 'published' OR creator_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators can insert designs" ON public.cabin_designs
  FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own designs" ON public.cabin_designs
  FOR UPDATE USING (creator_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete designs" ON public.cabin_designs
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Design purchases
CREATE TABLE public.design_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id uuid REFERENCES public.cabin_designs(id) NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) NOT NULL,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  creator_amount_cents integer NOT NULL,
  stripe_payment_intent_id text,
  purchased_at timestamp with time zone DEFAULT now(),
  UNIQUE(design_id, buyer_id)
);

ALTER TABLE public.design_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own purchases" ON public.design_purchases
  FOR SELECT USING (buyer_id = auth.uid() OR creator_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "System can insert purchases" ON public.design_purchases
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- Design ratings
CREATE TABLE public.design_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id uuid REFERENCES public.cabin_designs(id) NOT NULL,
  buyer_id uuid REFERENCES public.profiles(id) NOT NULL,
  rating boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(design_id, buyer_id)
);

ALTER TABLE public.design_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read ratings" ON public.design_ratings
  FOR SELECT USING (true);

CREATE POLICY "Buyers can insert own rating" ON public.design_ratings
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can update own rating" ON public.design_ratings
  FOR UPDATE USING (buyer_id = auth.uid());

-- Add applied_design_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS applied_design_id uuid REFERENCES public.cabin_designs(id);

-- Storage bucket for design previews
INSERT INTO storage.buckets (id, name, public) VALUES ('design-previews', 'design-previews', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read design previews" ON storage.objects
  FOR SELECT USING (bucket_id = 'design-previews');

CREATE POLICY "Authenticated users can upload design previews" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'design-previews' AND auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_cabin_designs_updated_at
  BEFORE UPDATE ON public.cabin_designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
