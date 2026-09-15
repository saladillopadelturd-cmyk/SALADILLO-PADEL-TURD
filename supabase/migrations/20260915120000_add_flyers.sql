-- Table for flyers/news
CREATE TABLE IF NOT EXISTS public.flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

-- Policies for flyers
CREATE POLICY "Flyers are viewable by everyone" ON public.flyers
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert flyers" ON public.flyers
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update flyers" ON public.flyers
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete flyers" ON public.flyers
    FOR DELETE USING (public.is_admin());

-- Create storage bucket for flyers
INSERT INTO storage.buckets (id, name, public) 
VALUES ('flyers', 'flyers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the flyers bucket
CREATE POLICY "Public Access to Flyers" ON storage.objects
    FOR SELECT USING (bucket_id = 'flyers');

CREATE POLICY "Admins can upload flyers" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'flyers' AND public.is_admin());

CREATE POLICY "Admins can update flyers" ON storage.objects
    FOR UPDATE USING (bucket_id = 'flyers' AND public.is_admin());

CREATE POLICY "Admins can delete flyers" ON storage.objects
    FOR DELETE USING (bucket_id = 'flyers' AND public.is_admin());
