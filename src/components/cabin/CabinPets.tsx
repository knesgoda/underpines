/**
 * CabinPets — Renders Pine Pet sprites in the Cabin header scene.
 * Positioned in the lower portion near the cabin/treeline.
 * Includes idle behavior state machine and rotation for >3 pets.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PetData {
  id: string;
  name: string;
  animal_type: string;
  sprite_cache: Record<string, string>;
  is_pinned: boolean;
  is_memorial: boolean;
  display_order: number;
}

type BehaviorState = 'idle' | 'look' | 'sleep' | 'alert';

interface PetSlot {
  pet: PetData;
  spriteUrl: string | null;
  loading: boolean;
  behavior: BehaviorState;
}

interface CabinPetsProps {
  ownerId: string;
  atmosphere?: string;
}

// Positions in the lower scene area (percentage-based)
const PET_POSITIONS = [
  { left: '12%', bottom: '8%', jitterX: 3, jitterY: 2 },
  { left: '58%', bottom: '6%', jitterX: 4, jitterY: 2 },
  { left: '82%', bottom: '10%', jitterX: 3, jitterY: 3 },
];

const BEHAVIOR_CSS: Record<BehaviorState, string> = {
  idle: 'cabin-pet-idle',
  look: 'cabin-pet-look',
  sleep: 'cabin-pet-sleep',
  alert: 'cabin-pet-alert',
};

const PET_CSS = `
@keyframes cabin-pet-idle {
  0%, 100% { transform: scale(1) translateY(0); }
  50% { transform: scale(1.02) translateY(-1px); }
}
@keyframes cabin-pet-look {
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(3px); }
  70% { transform: translateX(-2px); }
}
@keyframes cabin-pet-sleep {
  0%, 100% { transform: scale(1) translateY(0); opacity: 0.8; }
  50% { transform: scale(1.01) translateY(0); opacity: 0.75; }
}
@keyframes cabin-pet-alert {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-4px); }
  40% { transform: translateY(-2px); }
}
@keyframes cabin-pet-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.cabin-pet-shimmer {
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.15) 50%, transparent 75%);
  background-size: 200% 100%;
  animation: cabin-pet-shimmer 1.5s ease-in-out infinite;
}
`;

function seededJitter(id: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % (range * 2)) - range;
}

const CabinPets = ({ ownerId, atmosphere = 'morning_mist' }: CabinPetsProps) => {
  const [allPets, setAllPets] = useState<PetData[]>([]);
  const [slots, setSlots] = useState<PetSlot[]>([]);
  const [rotationIdx, setRotationIdx] = useState(0);
  const behaviorTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );

  // Fetch pets
  useEffect(() => {
    const fetchPets = async () => {
      const { data } = await supabase
        .from('pine_pets')
        .select('id, name, animal_type, sprite_cache, is_pinned, is_memorial, display_order')
        .eq('owner_id', ownerId)
        .eq('is_resting', false)
        .order('is_pinned', { ascending: false })
        .order('display_order', { ascending: true });

      if (data) {
        setAllPets(data.map(p => ({
          ...p,
          sprite_cache: (p.sprite_cache as Record<string, string>) || {},
        })));
      }
    };
    fetchPets();
  }, [ownerId]);

  // Determine which 3 pets to show (pinned first, then rotate remainder)
  const visiblePets = useMemo(() => {
    if (allPets.length === 0) return [];
    if (allPets.length <= 3) return allPets;

    const pinned = allPets.filter(p => p.is_pinned);
    const unpinned = allPets.filter(p => !p.is_pinned);
    const slotsNeeded = 3 - pinned.length;

    if (slotsNeeded <= 0) return pinned.slice(0, 3);

    const rotated: PetData[] = [];
    for (let i = 0; i < slotsNeeded; i++) {
      const idx = (rotationIdx + i) % unpinned.length;
      rotated.push(unpinned[idx]);
    }
    return [...pinned, ...rotated];
  }, [allPets, rotationIdx]);

  // Rotation timer for >3 pets
  useEffect(() => {
    const unpinnedCount = allPets.filter(p => !p.is_pinned).length;
    if (unpinnedCount <= (3 - allPets.filter(p => p.is_pinned).length)) return;

    const timer = setInterval(() => {
      setRotationIdx(prev => prev + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, [allPets]);

  // Resolve sprite URLs and trigger background generation if needed
  useEffect(() => {
    const resolveSlots = async () => {
      const newSlots: PetSlot[] = await Promise.all(
        visiblePets.map(async (pet): Promise<PetSlot> => {
          const cachedPath = pet.sprite_cache[atmosphere];

          if (cachedPath) {
            const { data: urlData } = supabase.storage
              .from('pine-pets-sprites')
              .getPublicUrl(cachedPath);
            return { pet, spriteUrl: urlData.publicUrl, loading: false, behavior: pet.is_memorial ? 'sleep' : 'idle' };
          }

          // Not cached — trigger background generation
          triggerRegeneration(pet.id, atmosphere);
          return { pet, spriteUrl: null, loading: true, behavior: pet.is_memorial ? 'sleep' : 'idle' };
        })
      );
      setSlots(newSlots);
    };

    if (visiblePets.length > 0) resolveSlots();
    else setSlots([]);
  }, [visiblePets, atmosphere]);

  // Background regeneration
  const triggerRegeneration = useCallback(async (petId: string, targetAtmosphere: string) => {
    try {
      const { data } = await supabase.functions.invoke('regenerate-pine-pet-atmosphere', {
        body: { pet_id: petId, target_atmosphere: targetAtmosphere },
      });

      if (data?.success && data?.sprite_url) {
        setSlots(prev => prev.map(s =>
          s.pet.id === petId
            ? { ...s, spriteUrl: data.sprite_url, loading: false }
            : s
        ));
      }
    } catch (err) {
      console.error('Pine pet regeneration failed:', err);
    }
  }, []);

  // Behavior state machine
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    // Clear existing timers
    behaviorTimers.current.forEach(t => clearTimeout(t));
    behaviorTimers.current.clear();

    slots.forEach((slot, idx) => {
      if (slot.pet.is_memorial) return; // Always sleep

      const cycleBehavior = () => {
        const behaviors: BehaviorState[] = ['idle', 'look', 'alert', 'idle'];
        const next = behaviors[Math.floor(Math.random() * behaviors.length)];
        const duration = next === 'alert' ? 2000 : next === 'look' ? 3000 : 4000;

        setSlots(prev => prev.map((s, i) =>
          i === idx ? { ...s, behavior: next } : s
        ));

        // Return to idle after behavior duration
        const resetTimer = setTimeout(() => {
          setSlots(prev => prev.map((s, i) =>
            i === idx ? { ...s, behavior: 'idle' } : s
          ));

          // Schedule next behavior
          const nextDelay = 30000 + Math.random() * 60000;
          const nextTimer = setTimeout(cycleBehavior, nextDelay);
          behaviorTimers.current.set(`${slot.pet.id}-cycle`, nextTimer);
        }, duration);

        behaviorTimers.current.set(`${slot.pet.id}-reset`, resetTimer);
      };

      // Initial delay before first behavior change
      const initialDelay = 10000 + Math.random() * 30000 + idx * 5000;
      const timer = setTimeout(cycleBehavior, initialDelay);
      behaviorTimers.current.set(`${slot.pet.id}-init`, timer);
    });

    return () => {
      behaviorTimers.current.forEach(t => clearTimeout(t));
      behaviorTimers.current.clear();
    };
  }, [slots.map(s => s.pet.id).join(',')]);

  if (slots.length === 0) return null;

  return (
    <>
      <style>{PET_CSS}</style>
      {slots.map((slot, idx) => {
        const pos = PET_POSITIONS[idx] || PET_POSITIONS[0];
        const jx = seededJitter(slot.pet.id, pos.jitterX);
        const jy = seededJitter(slot.pet.id + 'y', pos.jitterY);
        const behaviorAnim = prefersReducedMotion.current
          ? 'none'
          : `${BEHAVIOR_CSS[slot.behavior]} ${slot.behavior === 'idle' ? '4s' : slot.behavior === 'sleep' ? '6s' : '2s'} ease-in-out infinite`;

        return (
          <div
            key={slot.pet.id}
            className="absolute group"
            style={{
              left: `calc(${pos.left} + ${jx}px)`,
              bottom: `calc(${pos.bottom} + ${jy}px)`,
              width: 48,
              height: 48,
              zIndex: 7,
              transition: 'opacity 0.5s ease-in-out',
              opacity: slot.loading ? 0 : 1,
            }}
          >
            {slot.loading ? (
              <div
                className="w-full h-full rounded-full cabin-pet-shimmer"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              />
            ) : slot.spriteUrl ? (
              <img
                src={slot.spriteUrl}
                alt={slot.pet.name}
                loading="lazy"
                className="w-full h-full object-contain"
                style={{
                  animation: behaviorAnim,
                  filter: slot.pet.is_memorial ? 'sepia(0.2) brightness(1.1)' : 'none',
                }}
              />
            ) : null}

            {/* Name tooltip */}
            <div
              className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
              style={{ zIndex: 12 }}
            >
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-body"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {slot.pet.is_memorial && '✦ '}{slot.pet.name}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default CabinPets;
