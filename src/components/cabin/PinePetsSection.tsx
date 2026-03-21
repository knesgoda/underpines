import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TreePine, Plus, Pin, PinOff, MoreVertical, Pencil, RefreshCw,
  Moon, Sun, Heart, Trash2, X, Check, GripVertical,
} from 'lucide-react';
import PinePetCreationFlow from './PinePetCreationFlow';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface PinePet {
  id: string;
  name: string;
  animal_type: string;
  sprite_cache: Record<string, string>;
  is_pinned: boolean;
  is_resting: boolean;
  is_memorial: boolean;
  is_ambassador: boolean;
  display_order: number;
  original_photo_path: string;
}

interface PinePetsSectionProps {
  activeAtmosphere?: string;
}

const ANIMAL_LABELS: Record<string, string> = {
  dog: 'Dog', cat: 'Cat', rabbit: 'Rabbit', bird: 'Bird',
  fish: 'Fish', hamster: 'Hamster', turtle: 'Turtle',
};

const PinePetsSection = ({ activeAtmosphere = 'morning_mist' }: PinePetsSectionProps) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<PinePet[]>([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'memorial' | 'release' | 'remove-memorial';
    pet: PinePet;
  } | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [creationOpen, setCreationOpen] = useState(false);

  const fetchPets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pine_pets')
      .select('*')
      .eq('owner_id', user.id)
      .order('display_order');

    if (data) {
      setPets(data.map(p => ({
        ...p,
        sprite_cache: (p.sprite_cache as Record<string, string>) || {},
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPets(); }, [fetchPets]);

  const getSpriteUrl = (pet: PinePet): string | null => {
    const path = pet.sprite_cache[activeAtmosphere] || Object.values(pet.sprite_cache)[0];
    if (!path) return null;
    const { data } = supabase.storage.from('pine-pets-sprites').getPublicUrl(path);
    return data.publicUrl;
  };

  const togglePin = async (pet: PinePet) => {
    if (pet.is_ambassador) return; // Ambassador pets are always pinned
    if (!pet.is_pinned) {
      const pinnedCount = pets.filter(p => p.is_pinned && !p.is_ambassador).length;
      if (pinnedCount >= 3) {
        toast.info('You can pin up to 3 pets. Unpin one first.');
        return;
      }
    }
    const { error } = await supabase
      .from('pine_pets')
      .update({ is_pinned: !pet.is_pinned })
      .eq('id', pet.id);

    if (error) {
      toast.error('Could not update pin status');
      return;
    }
    setPets(prev => prev.map(p => p.id === pet.id ? { ...p, is_pinned: !p.is_pinned } : p));
  };

  const toggleResting = async (pet: PinePet) => {
    const { error } = await supabase
      .from('pine_pets')
      .update({ is_resting: !pet.is_resting })
      .eq('id', pet.id);

    if (!error) {
      setPets(prev => prev.map(p => p.id === pet.id ? { ...p, is_resting: !p.is_resting } : p));
      toast.success(pet.is_resting ? `${pet.name} is awake!` : `${pet.name} is resting inside.`);
    }
  };

  const submitRename = async (pet: PinePet) => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 50) {
      toast.error('Name must be 1-50 characters');
      return;
    }
    const { error } = await supabase
      .from('pine_pets')
      .update({ name: trimmed })
      .eq('id', pet.id);

    if (!error) {
      setPets(prev => prev.map(p => p.id === pet.id ? { ...p, name: trimmed } : p));
      setRenamingId(null);
    }
  };

  const setMemorial = async (pet: PinePet, value: boolean) => {
    const { error } = await supabase
      .from('pine_pets')
      .update({ is_memorial: value })
      .eq('id', pet.id);

    if (!error) {
      setPets(prev => prev.map(p => p.id === pet.id ? { ...p, is_memorial: value } : p));
      toast.success(value ? `${pet.name} will always have a place here.` : `Memorial removed for ${pet.name}.`);
    }
    setConfirmDialog(null);
  };

  const releasePet = async (pet: PinePet) => {
    const { error } = await supabase
      .from('pine_pets')
      .delete()
      .eq('id', pet.id);

    if (!error) {
      setPets(prev => prev.filter(p => p.id !== pet.id));
      toast.success(`${pet.name} has been let go.`);
    }
    setConfirmDialog(null);
  };

  // Drag reorder
  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = async (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...pets];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(idx, 0, moved);

    const updated = reordered.map((p, i) => ({ ...p, display_order: i }));
    setPets(updated);
    setDraggedIdx(null);
    setDragOverIdx(null);

    // Persist order
    for (const p of updated) {
      await supabase.from('pine_pets').update({ display_order: p.display_order }).eq('id', p.id);
    }
  };

  if (loading) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <TreePine size={14} className="text-primary" />
        <p className="font-display text-xs uppercase tracking-wide text-muted-foreground">Pine Pets</p>
      </div>
      <p className="text-xs font-body text-muted-foreground mb-3">Your companions in the Cabin</p>

      <div className="rounded-xl border border-border bg-card overflow-hidden p-4">
        {/* Add button */}
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-xs font-body gap-1.5 mb-4 border-dashed border-border hover:border-primary hover:text-primary"
          onClick={() => setCreationOpen(true)}
        >
          <Plus size={14} />
          Add a Pine Pet
        </Button>

        {/* Pet grid */}
        {pets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pets.map((pet, idx) => {
              const spriteUrl = getSpriteUrl(pet);
              const isRenaming = renamingId === pet.id;

              return (
                <div
                  key={pet.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                  className={`relative rounded-lg border p-3 transition-all duration-200 cursor-grab active:cursor-grabbing group ${
                    dragOverIdx === idx ? 'ring-2 ring-primary/30' : ''
                  } ${pet.is_resting ? 'opacity-60' : ''}`}
                  style={{
                    borderColor: pet.is_memorial
                      ? 'hsl(45, 80%, 60%)'
                      : 'hsl(var(--border))',
                    boxShadow: pet.is_memorial
                      ? '0 0 12px hsla(45, 80%, 60%, 0.2)'
                      : '0 1px 2px hsla(0, 0%, 0%, 0.05)',
                    backgroundColor: 'hsl(var(--card))',
                  }}
                >
                  {/* Drag handle */}
                  <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-40 transition-opacity">
                    <GripVertical size={12} />
                  </div>

                  {/* Pin toggle */}
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => togglePin(pet)}
                          className="absolute top-1.5 right-8 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                        >
                          {pet.is_pinned
                            ? <Pin size={12} className="text-primary" />
                            : <PinOff size={12} className="text-muted-foreground" />
                          }
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {pet.is_pinned ? 'Unpin from scene' : 'Pin to scene'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {/* Kebab menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted">
                        <MoreVertical size={12} className="text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 text-xs">
                      <DropdownMenuItem onClick={() => { setRenamingId(pet.id); setRenameValue(pet.name); }}>
                        <Pencil size={12} className="mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Regeneration flow coming soon!')}>
                        <RefreshCw size={12} className="mr-2" /> Regenerate
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleResting(pet)}>
                        {pet.is_resting
                          ? <><Sun size={12} className="mr-2" /> Wake up</>
                          : <><Moon size={12} className="mr-2" /> Rest inside</>
                        }
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {pet.is_memorial ? (
                        <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'remove-memorial', pet })}>
                          <Heart size={12} className="mr-2" /> Remove memorial
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'memorial', pet })}>
                          <Heart size={12} className="mr-2" /> In memory
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setConfirmDialog({ type: 'release', pet })}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 size={12} className="mr-2" /> Release
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sprite */}
                  <div className="w-full aspect-square rounded-md bg-muted/30 flex items-center justify-center mb-2 overflow-hidden">
                    {spriteUrl ? (
                      <img
                        src={spriteUrl}
                        alt={pet.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <TreePine size={24} className="text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Name */}
                  {isRenaming ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value.slice(0, 50))}
                        className="h-6 text-xs rounded-md px-1.5"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') submitRename(pet);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                      />
                      <button onClick={() => submitRename(pet)} className="p-0.5 rounded hover:bg-muted">
                        <Check size={10} className="text-primary" />
                      </button>
                      <button onClick={() => setRenamingId(null)} className="p-0.5 rounded hover:bg-muted">
                        <X size={10} className="text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-body font-medium text-foreground truncate">{pet.name}</p>
                  )}

                  {/* Animal type label */}
                  <p className="text-[10px] font-body text-muted-foreground">
                    {ANIMAL_LABELS[pet.animal_type] || pet.animal_type}
                  </p>

                  {/* Status labels */}
                  {pet.is_resting && (
                    <span className="text-[9px] font-body text-muted-foreground italic mt-0.5 block">
                      Resting inside
                    </span>
                  )}
                  {pet.is_memorial && (
                    <span className="text-[9px] font-body mt-0.5 block" style={{ color: 'hsl(45, 80%, 50%)' }}>
                      In memory ♡
                    </span>
                  )}
                  {pet.is_pinned && (
                    <Pin size={8} className="absolute bottom-2 right-2 text-primary opacity-60" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs font-body text-muted-foreground/50 text-center py-6">
            No pets yet. Add one to bring your Cabin to life.
          </p>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-base">
              {confirmDialog?.type === 'memorial' && `Mark ${confirmDialog.pet.name} as in memory?`}
              {confirmDialog?.type === 'remove-memorial' && `Remove memorial for ${confirmDialog.pet.name}?`}
              {confirmDialog?.type === 'release' && `Let ${confirmDialog.pet.name} go?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body text-sm">
              {confirmDialog?.type === 'memorial' && "They'll always have a place in your Cabin."}
              {confirmDialog?.type === 'remove-memorial' && "This will remove the memorial status."}
              {confirmDialog?.type === 'release' && "This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-body text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={`font-body text-sm ${confirmDialog?.type === 'release' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
              onClick={() => {
                if (!confirmDialog) return;
                if (confirmDialog.type === 'memorial') setMemorial(confirmDialog.pet, true);
                else if (confirmDialog.type === 'remove-memorial') setMemorial(confirmDialog.pet, false);
                else if (confirmDialog.type === 'release') releasePet(confirmDialog.pet);
              }}
            >
              {confirmDialog?.type === 'release' ? 'Let go' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Creation Flow */}
      <PinePetCreationFlow
        open={creationOpen}
        onClose={() => setCreationOpen(false)}
        onCreated={fetchPets}
        activeAtmosphere={activeAtmosphere}
      />
    </div>
  );
};

export default PinePetsSection;
