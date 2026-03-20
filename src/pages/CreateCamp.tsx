import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Flame } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'identity' | 'visibility' | 'review';
type Visibility = 'open' | 'ember' | 'hidden';

const CreateCamp = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('identity');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('open');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setCreating(true);

    let coverUrl: string | null = null;
    if (coverFile) {
      const ext = coverFile.name.split('.').pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('camp-covers')
        .upload(path, coverFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('camp-covers').getPublicUrl(path);
        coverUrl = urlData.publicUrl;
      }
    }

    // Create camp
    const { data: camp, error: campErr } = await supabase
      .from('camps')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        cover_image_url: coverUrl,
        visibility,
        firekeeper_id: user.id,
      })
      .select()
      .single();

    if (campErr || !camp) {
      toast.error('Could not create camp');
      setCreating(false);
      return;
    }

    // Add firekeeper as member
    await supabase.from('camp_members').insert({
      camp_id: camp.id,
      user_id: user.id,
      role: 'firekeeper',
    });

    // Create bonfire campfire
    await supabase.from('campfires').insert({
      campfire_type: 'bonfire',
      firekeeper_id: user.id,
      name: `${name.trim()} Bonfire`,
      camp_id: camp.id,
    });

    // Add firekeeper to bonfire participants
    const { data: bonfire } = await supabase
      .from('campfires')
      .select('id')
      .eq('camp_id', camp.id)
      .eq('campfire_type', 'bonfire')
      .maybeSingle();

    if (bonfire) {
      await supabase.from('campfire_participants').insert({
        campfire_id: bonfire.id,
        user_id: user.id,
      });
    }

    toast.success('Camp created!');
    navigate(`/camps/${camp.id}`);
  };

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'open', label: 'Open', desc: 'Anyone on Under Pines can request to join. Your Camp appears in search.' },
    { value: 'ember', label: 'Ember', desc: 'Invite only. Members bring in new members. Appears in search but join by invite only.' },
    { value: 'hidden', label: 'Hidden', desc: "Doesn't appear in search. Join by direct link only." },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {step === 'identity' && (
          <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 className="font-display text-2xl text-foreground mb-6">Start a Camp</h1>

            {/* Cover upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-square max-w-[200px] mx-auto mb-6 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:bg-muted transition-colors overflow-hidden"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={24} className="text-muted-foreground" />
                  <span className="font-body text-xs text-muted-foreground">Cover image</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <div className="space-y-4 mb-6">
              <input
                value={name}
                onChange={e => setName(e.target.value.slice(0, 60))}
                placeholder="Camp name"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <input
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 120))}
                placeholder="One-line description"
                className="w-full px-4 py-3 rounded-xl border border-border bg-card font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => navigate(-1)} className="font-body text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={() => setStep('visibility')}
                disabled={!name.trim()}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {step === 'visibility' && (
          <motion.div key="visibility" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 className="font-display text-2xl text-foreground mb-2">Who can join this Camp?</h1>
            <p className="font-body text-sm text-muted-foreground mb-6">You can change this later.</p>

            <div className="space-y-3 mb-8">
              {visOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    visibility === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted'
                  }`}
                >
                  <p className="font-body text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep('identity')} className="font-body text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <button onClick={() => setStep('review')} className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium">
                Continue →
              </button>
            </div>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 className="font-display text-2xl text-foreground mb-6">Your Camp is ready.</h1>

            <div className="flex flex-col items-center gap-4 mb-6">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-24 h-24 rounded-2xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-secondary flex items-center justify-center">
                  <Flame size={32} className="text-muted-foreground" />
                </div>
              )}
              <div className="text-center">
                <p className="font-display text-lg text-foreground">{name}</p>
                {description && <p className="font-body text-sm text-muted-foreground mt-1">{description}</p>}
                <p className="font-body text-xs text-muted-foreground mt-2 capitalize">{visibility} Camp</p>
              </div>
            </div>

            <p className="font-body text-sm text-muted-foreground text-center mb-8">
              You're the Firekeeper. You can appoint Trailblazers to help moderate once your Camp grows.
            </p>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep('visibility')} className="font-body text-sm text-muted-foreground hover:text-foreground">← Back</button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Light the fire →'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CreateCamp;
