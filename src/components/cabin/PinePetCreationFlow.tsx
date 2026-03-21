import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Upload, ArrowLeft, ArrowRight, Check, X, Loader2,
  Dog, Cat, Rabbit, Bird, Fish, Rat, Shell,
} from 'lucide-react';
import { toast } from 'sonner';

interface Variation {
  index: number;
  preview_url: string;
  storage_path: string;
}

interface PinePetCreationFlowProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  activeAtmosphere?: string;
}

const ANIMAL_TYPES = [
  { key: 'dog', label: 'Dog', icon: Dog },
  { key: 'cat', label: 'Cat', icon: Cat },
  { key: 'rabbit', label: 'Rabbit', icon: Rabbit },
  { key: 'bird', label: 'Bird', icon: Bird },
  { key: 'fish', label: 'Fish', icon: Fish },
  { key: 'hamster', label: 'Hamster', icon: Rat },
  { key: 'turtle', label: 'Turtle', icon: Shell },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const PinePetCreationFlow = ({ open, onClose, onCreated, activeAtmosphere = 'morning_mist' }: PinePetCreationFlowProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step management
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Upload
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Step 2: Details
  const [petName, setPetName] = useState('');
  const [animalType, setAnimalType] = useState('');

  // Generation
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [analysis, setAnalysis] = useState<{ breed?: string } | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [errorMessage, setErrorMessage] = useState('');
  const [photoPath, setPhotoPath] = useState('');

  // Step 3: Pick
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const goTo = (s: number) => {
    setDirection(s > step ? 1 : -1);
    setStep(s);
    setErrorMessage('');
  };

  const reset = () => {
    setStep(1);
    setDirection(1);
    setFile(null);
    setPreview(null);
    setPetName('');
    setAnimalType('');
    setVariations([]);
    setAnalysis(null);
    setSelectedIdx(null);
    setErrorMessage('');
    setPhotoPath('');
    setShowSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // File handling
  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('Photo must be under 10 MB.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Submit: upload photo + generate
  const handleGenerate = async () => {
    if (!user || !file || !petName.trim() || !animalType) return;

    setGenerating(true);
    setErrorMessage('');

    try {
      // Upload photo
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('pine-pets-originals')
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) throw new Error('Failed to upload photo');
      setPhotoPath(storagePath);

      // Call generate edge function
      const { data, error } = await supabase.functions.invoke('generate-pine-pet', {
        body: {
          photo_storage_path: storagePath,
          pet_name: petName.trim(),
          animal_type: animalType,
          atmosphere: activeAtmosphere,
        },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes("couldn't find a pet")) {
          setErrorMessage(data.error);
          goTo(1);
        } else if (data.error.includes('generation attempts')) {
          setErrorMessage(data.error);
        } else if (data.error.includes('Pines+')) {
          setErrorMessage(data.error);
        } else {
          setErrorMessage(data.error);
        }
        setGenerating(false);
        return;
      }

      setVariations(data.variations || []);
      setAnalysis(data.analysis || null);
      setAttemptsRemaining(data.attempts_remaining ?? 0);
      goTo(3);
    } catch (err: any) {
      console.error('Generation error:', err);
      setErrorMessage('Something went wrong. Try a different photo or try again in a moment.');
    } finally {
      setGenerating(false);
    }
  };

  // Finalize
  const handleFinalize = async () => {
    if (selectedIdx === null || !variations[selectedIdx] || !user) return;

    setFinalizing(true);
    try {
      const selected = variations[selectedIdx];
      const { data, error } = await supabase.functions.invoke('finalize-pine-pet', {
        body: {
          pet_name: petName.trim(),
          animal_type: animalType,
          selected_sprite_path: selected.storage_path,
          original_photo_path: photoPath,
          atmosphere: activeAtmosphere,
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setFinalizing(false);
        return;
      }

      setShowSuccess(true);
      setTimeout(() => {
        handleClose();
        onCreated();
      }, 2500);
    } catch (err: any) {
      console.error('Finalize error:', err);
      toast.error('Failed to save your pet. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  // Retry generation
  const handleRetry = async () => {
    if (attemptsRemaining <= 0) {
      setErrorMessage("You've used all your generation attempts for today. Try again tomorrow.");
      return;
    }
    setSelectedIdx(null);
    setVariations([]);
    goTo(2);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-xl border-border">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            {step > 1 && !generating && !showSuccess && (
              <button onClick={() => goTo(step - 1)} className="p-1 rounded-md hover:bg-muted transition-colors">
                <ArrowLeft size={16} className="text-muted-foreground" />
              </button>
            )}
            <DialogTitle className="font-display text-lg text-foreground">
              {showSuccess ? '' : step === 1 ? 'Add a Pine Pet' : step === 2 ? 'Tell us about them' : 'Pick your favorite'}
            </DialogTitle>
          </div>
          {step === 1 && !generating && (
            <p className="text-xs font-body text-muted-foreground mt-1">
              Upload a clear photo of your pet and we'll illustrate them for your Cabin.
            </p>
          )}
        </DialogHeader>

        {/* Step indicator */}
        {!showSuccess && (
          <div className="flex gap-1.5 px-6 pb-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: s <= step ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                }}
              />
            ))}
          </div>
        )}

        <div className="px-6 pb-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* SUCCESS STATE */}
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <motion.div
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
                  className="w-24 h-24 mb-4 rounded-full bg-accent/30 flex items-center justify-center"
                >
                  {selectedIdx !== null && variations[selectedIdx] && (
                    <img
                      src={variations[selectedIdx].preview_url}
                      alt={petName}
                      className="w-20 h-20 object-contain"
                    />
                  )}
                </motion.div>
                <p className="font-display text-lg text-foreground">{petName} has arrived at your Cabin.</p>
                <p className="text-xs font-body text-muted-foreground mt-1">You'll find them in your settings.</p>
              </motion.div>
            )}

            {/* GENERATING STATE */}
            {generating && !showSuccess && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-16 text-center"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="text-4xl mb-4"
                >
                  ✏️
                </motion.div>
                <p className="font-display text-base text-foreground">
                  Illustrating {petName}...
                </p>
                <p className="text-xs font-body text-muted-foreground mt-2">
                  This may take a moment. We're making it cozy.
                </p>
                <motion.div
                  className="flex gap-1 mt-4"
                  initial="hidden"
                  animate="visible"
                >
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3 }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* STEP 1: UPLOAD */}
            {step === 1 && !generating && !showSuccess && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-body text-destructive">{errorMessage}</p>
                  </div>
                )}

                {/* Upload area */}
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 hover:border-primary/50 hover:bg-accent/10"
                  style={{
                    borderColor: preview ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border))',
                    minHeight: preview ? 'auto' : 200,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />

                  {preview ? (
                    <div className="relative p-3">
                      <img
                        src={preview}
                        alt="Pet photo preview"
                        className="w-full max-h-64 object-contain rounded-md"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setPreview(null);
                        }}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                      >
                        <X size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <Upload size={28} className="text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-body text-muted-foreground">
                        Drop a photo here or tap to browse
                      </p>
                      <p className="text-[10px] font-body text-muted-foreground/50 mt-1">
                        JPEG, PNG, or WebP — up to 10 MB
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <Button
                    disabled={!file}
                    onClick={() => goTo(2)}
                    size="sm"
                    className="rounded-lg text-xs font-body gap-1.5"
                  >
                    Next <ArrowRight size={12} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 2 && !generating && !showSuccess && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-body text-destructive">{errorMessage}</p>
                  </div>
                )}

                {/* Pet name */}
                <div className="mb-5">
                  <label className="text-xs font-body text-muted-foreground mb-1.5 block">
                    What's their name?
                  </label>
                  <Input
                    value={petName}
                    onChange={e => setPetName(e.target.value.slice(0, 50))}
                    placeholder="e.g. Biscuit"
                    className="rounded-lg text-sm"
                    autoFocus
                  />
                  <p className="text-[10px] font-body text-muted-foreground/40 mt-1 text-right">
                    {petName.length}/50
                  </p>
                </div>

                {/* Animal type grid */}
                <div className="mb-5">
                  <label className="text-xs font-body text-muted-foreground mb-2 block">
                    What kind of pet?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ANIMAL_TYPES.map(at => {
                      const Icon = at.icon;
                      const selected = animalType === at.key;
                      return (
                        <button
                          key={at.key}
                          onClick={() => setAnimalType(at.key)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-150 ${
                            selected
                              ? 'border-primary bg-accent/20 shadow-sm'
                              : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                          }`}
                        >
                          <Icon
                            size={20}
                            className={selected ? 'text-primary' : 'text-muted-foreground'}
                            strokeWidth={1.5}
                          />
                          <span className={`text-[10px] font-body ${selected ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                            {at.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    disabled={!petName.trim() || !animalType}
                    onClick={handleGenerate}
                    size="sm"
                    className="rounded-lg text-xs font-body gap-1.5"
                  >
                    Create Pine Pet
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PICK VARIATION */}
            {step === 3 && !generating && !showSuccess && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <p className="text-sm font-body text-foreground mb-4">
                  We illustrated your {analysis?.breed || animalType}! Pick the one that feels most like {petName}.
                </p>

                {/* Variation cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {variations.map((v) => (
                    <button
                      key={v.index}
                      onClick={() => setSelectedIdx(v.index)}
                      className={`relative rounded-lg border-2 overflow-hidden transition-all duration-200 aspect-square ${
                        selectedIdx === v.index
                          ? 'border-primary shadow-md ring-2 ring-primary/20'
                          : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <img
                        src={v.preview_url}
                        alt={`Variation ${v.index + 1}`}
                        className="w-full h-full object-contain bg-muted/20"
                      />
                      {selectedIdx === v.index && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check size={10} className="text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Retry */}
                <div className="text-center mb-4">
                  <button
                    onClick={handleRetry}
                    className="text-xs font-body text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    Not quite right?
                  </button>
                  <p className="text-[10px] font-body text-muted-foreground/50 mt-0.5">
                    {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining today
                  </p>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-body text-destructive">{errorMessage}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    disabled={selectedIdx === null || finalizing}
                    onClick={handleFinalize}
                    size="sm"
                    className="rounded-lg text-xs font-body gap-1.5"
                  >
                    {finalizing ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'This one!'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PinePetCreationFlow;
