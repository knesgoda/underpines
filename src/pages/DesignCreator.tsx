import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DesignCreator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState(0);
  const [isFreeSelected, setIsFreeSelected] = useState(true);
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [season, setSeason] = useState<string>('autumn');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('design-previews').upload(path, file);
    if (error) { toast.error('Upload failed'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('design-previews').getPublicUrl(path);
    setPreviewUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;
    setSubmitting(true);

    // Fetch current cabin appearance as design_data
    const { data: profile } = await supabase
      .from('profiles')
      .select('atmosphere, layout, accent_color')
      .eq('id', user.id)
      .single();

    if (!profile) { toast.error('Could not load your Cabin settings'); setSubmitting(false); return; }

    const designData = {
      atmosphere: profile.atmosphere,
      layout: profile.layout,
      accent_color: profile.accent_color,
    };

    const { error } = await supabase.from('cabin_designs').insert({
      creator_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      preview_image_url: previewUrl,
      price_cents: isFreeSelected ? 0 : priceCents,
      is_seasonal: isSeasonal,
      season: isSeasonal ? season : null,
      status: 'pending_review',
      design_data: designData,
    });

    if (error) {
      toast.error('Could not submit design');
      setSubmitting(false);
      return;
    }

    toast.success('Design submitted for review!');
    navigate('/settings/designs');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8 pt-16">
      <h1 className="font-display text-2xl text-foreground mb-2">Sell this design</h1>
      <p className="text-sm text-muted-foreground font-body mb-6">
        Your current Cabin appearance will be saved as a design template that others can purchase and apply.
      </p>

      <div className="space-y-5">
        <div>
          <label className="text-sm font-body text-foreground block mb-1">Design name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Autumn Hollow" className="rounded-xl" />
        </div>

        <div>
          <label className="text-sm font-body text-foreground block mb-1">Description</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A warm autumn afternoon in the deep woods." className="rounded-xl resize-none" rows={3} />
        </div>

        <div>
          <label className="text-sm font-body text-foreground block mb-2">Price</label>
          <div className="flex gap-3">
            <button onClick={() => setIsFreeSelected(true)} className={`px-4 py-2 rounded-full text-sm font-body border transition-colors ${isFreeSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
              Free
            </button>
            <button onClick={() => setIsFreeSelected(false)} className={`px-4 py-2 rounded-full text-sm font-body border transition-colors ${!isFreeSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
              Paid
            </button>
          </div>
          {!isFreeSelected && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={1}
                max={50}
                value={priceCents / 100 || ''}
                onChange={e => setPriceCents(Math.round(Number(e.target.value) * 100))}
                className="rounded-xl w-24"
                placeholder="3"
              />
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isSeasonal} onChange={e => setIsSeasonal(e.target.checked)} className="rounded" />
            <span className="text-sm font-body text-foreground">This is a seasonal design</span>
          </label>
          {isSeasonal && (
            <select value={season} onChange={e => setSeason(e.target.value)} className="mt-2 rounded-xl bg-background border border-input px-3 py-2 text-sm font-body">
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="autumn">Autumn</option>
              <option value="winter">Winter</option>
            </select>
          )}
        </div>

        <div>
          <label className="text-sm font-body text-foreground block mb-1">Preview image</label>
          <p className="text-xs text-muted-foreground mb-2">Upload a screenshot showing your design on a Cabin.</p>
          <label className="flex items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors overflow-hidden">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm text-muted-foreground font-body">{uploading ? 'Uploading…' : 'Upload preview image'}</span>
            )}
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full font-body text-sm">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="rounded-full font-body text-sm">
            {submitting ? 'Submitting…' : 'Submit for review →'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default DesignCreator;
