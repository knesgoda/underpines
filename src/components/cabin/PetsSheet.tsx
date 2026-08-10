/**
 * Pets at the cabin (spec §33–44).
 *
 * Owner: full management — the restored Pine Pets pipeline (photo →
 * stylized sprite) plus the new personality, story, visibility, and
 * memorial fields. Visitor: meet the pets the owner shares, pet the ones
 * that allow it. Living and departed pets stand side by side unless the
 * owner chooses memorial presentation; nothing here is ever paywalled.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import CabinSheet from './CabinSheet';
import PinePetsSection from './PinePetsSection';
import type { CabinPetView } from '@/lib/cabinApi';
import { updatePet } from '@/lib/cabinApi';
import { useCabinInvalidate } from '@/hooks/useCabin';
import { PET_TRAITS, TRAIT_LABELS, MAX_TRAITS, type PetTrait } from '@/lib/cabin/petBrain';

const PET_EMOJI: Record<string, string> = {
  dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🐦', fish: '🐠', hamster: '🐹', turtle: '🐢',
};

const PetEditor = ({ pet, onSaved }: { pet: CabinPetView; onSaved: () => void }) => {
  const [traits, setTraits] = useState<string[]>(pet.personality_traits ?? []);
  const [story, setStory] = useState(pet.story ?? '');
  const [memorial, setMemorial] = useState(pet.is_memorial);
  const [years, setYears] = useState(pet.memorial_years ?? '');
  const [busy, setBusy] = useState(false);

  const toggleTrait = (t: PetTrait) => {
    if (traits.includes(t)) setTraits(traits.filter(x => x !== t));
    else if (traits.length < MAX_TRAITS) setTraits([...traits, t]);
  };

  const save = async () => {
    setBusy(true);
    try {
      await updatePet(pet.id, {
        personality_traits: traits,
        story: story.trim() || null,
        is_memorial: memorial,
        memorial_years: memorial ? years.trim() || null : null,
      });
      toast.success(`${pet.name} noted.`);
      onSaved();
    } catch {
      toast.error('Could not save that.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cabin-pet-editor">
      <p className="cabin-label">Personality — up to {MAX_TRAITS}</p>
      <div className="cabin-trait-grid" role="group" aria-label={`${pet.name}'s personality`}>
        {PET_TRAITS.map(t => (
          <button
            key={t}
            type="button"
            className={`cabin-trait ${traits.includes(t) ? 'active' : ''}`}
            aria-pressed={traits.includes(t)}
            onClick={() => toggleTrait(t)}
          >
            {TRAIT_LABELS[t]}
          </button>
        ))}
      </div>

      <label className="cabin-label" htmlFor={`story-${pet.id}`}>Their story (optional)</label>
      <textarea
        id={`story-${pet.id}`}
        value={story}
        onChange={e => setStory(e.target.value)}
        maxLength={600}
        placeholder="Where they came from, what they ruin, who they love."
      />

      <label className="cabin-check">
        <input type="checkbox" checked={memorial} onChange={e => setMemorial(e.target.checked)} />
        Remember them with a memorial note
      </label>
      {memorial && (
        <input
          type="text"
          value={years}
          onChange={e => setYears(e.target.value)}
          maxLength={40}
          placeholder="2011 – 2024"
          aria-label="Years"
        />
      )}

      <button type="button" className="solid-button" disabled={busy} onClick={save}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
};

const PetsSheet = ({
  open, onClose, isOwner, pets, atmosphere,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  pets: CabinPetView[];
  atmosphere: string;
}) => {
  const invalidate = useCabinInvalidate();
  const [editing, setEditing] = useState<string | null>(null);
  const [petted, setPetted] = useState<Record<string, boolean>>({});

  const petThem = (p: CabinPetView) => {
    setPetted({ ...petted, [p.id]: true });
    toast(`You pet ${p.name}. ${p.name} approves.`, { icon: PET_EMOJI[p.animal_type] ?? '🐾' });
  };

  return (
    <CabinSheet open={open} onClose={onClose} title={isOwner ? 'Your pets' : 'Who lives here'} wide>
      {!isOwner && pets.length === 0 && (
        <p className="quiet">No pets around right now.</p>
      )}

      {!isOwner && pets.map(p => (
        <div key={p.id} className="cabin-pet-card">
          <span className="cabin-pet-face" aria-hidden="true">{PET_EMOJI[p.animal_type] ?? '🐾'}</span>
          <div className="min-w-0">
            <b>
              {p.name}
              {p.is_memorial && <span className="cabin-pet-heart" title="Remembered"> ♥</span>}
            </b>
            {p.is_memorial && p.memorial_years && <small>{p.memorial_years}</small>}
            {p.story && <p>{p.story}</p>}
            {(p.personality_traits?.length ?? 0) > 0 && (
              <small className="quiet">
                {p.personality_traits.map(t => TRAIT_LABELS[t as PetTrait] ?? t).join(' · ')}
              </small>
            )}
          </div>
          {p.can_interact && !p.is_memorial && (
            <button type="button" className="outline-button" disabled={!!petted[p.id]} onClick={() => petThem(p)}>
              {petted[p.id] ? 'Petted' : 'Pet'}
            </button>
          )}
        </div>
      ))}

      {isOwner && (
        <>
          {/* The restored Pine Pets pipeline: creation, photos, sprites. */}
          <PinePetsSection activeAtmosphere={atmosphere} />

          {pets.length > 0 && <h3 className="cabin-subhead">Personality & stories</h3>}
          {pets.map(p => (
            <div key={p.id} className="cabin-pet-card">
              <span className="cabin-pet-face" aria-hidden="true">{PET_EMOJI[p.animal_type] ?? '🐾'}</span>
              <div className="min-w-0">
                <b>{p.name}</b>
                {editing === p.id ? (
                  <PetEditor
                    pet={p}
                    onSaved={() => { setEditing(null); invalidate(['cabin-view']); }}
                  />
                ) : (
                  <button type="button" className="album-link" onClick={() => setEditing(p.id)}>
                    Edit personality & story
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </CabinSheet>
  );
};

export default PetsSheet;
