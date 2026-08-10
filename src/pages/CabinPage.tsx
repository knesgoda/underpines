/**
 * The Cabin — /u/:handle. Not a profile page; the place itself (spec §1).
 *
 * Owner at home: objects are utilities. Visitor: the same room becomes a
 * curated visit. One RPC (`get_cabin_view`) paints everything; the restored
 * environment engine (solar, weather, seasons, wildlife) runs the world
 * outside the window; the event engine occasionally puts something in the
 * trees worth clicking.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useBootState } from '@/hooks/useBootState';
import PineTreeLoading from '@/components/PineTreeLoading';
import StatePanel, { ErrorPanel } from '@/components/StatePanel';
import UserAvatar from '@/components/UserAvatar';
import CircleButton from '@/components/circles/CircleButton';
import CabinScene from '@/components/cabin/CabinScene';
import CabinExterior from '@/components/cabin/CabinExterior';
import CabinRoom from '@/components/cabin/CabinRoom';
import CabinDrawer from '@/components/cabin/CabinDrawer';
import CabinItemInspect from '@/components/cabin/CabinItemInspect';
import BioSheet from '@/components/cabin/BioSheet';
import GuestbookSheet from '@/components/cabin/GuestbookSheet';
import MailboxSheet from '@/components/cabin/MailboxSheet';
import PorchSheet from '@/components/cabin/PorchSheet';
import KitchenSheet from '@/components/cabin/KitchenSheet';
import TradeSheet from '@/components/cabin/TradeSheet';
import PetsSheet from '@/components/cabin/PetsSheet';
import HistorySheet from '@/components/cabin/HistorySheet';
import RadioSheet from '@/components/cabin/RadioSheet';
import FixUpCabin from '@/components/cabin/FixUpCabin';
import { useCabinView, useUpdateCabin } from '@/hooks/useCabin';
import { knock, rollEvent, type CabinPlacementView, type CabinEventResult } from '@/lib/cabinApi';
import type { FixtureAction } from '@/lib/cabin/fixtures';
import { getCabinLocation, DEFAULT_LOCATION } from '@/lib/cabin/locations';
import { deriveEnvironment, toTimeSlot } from '@/lib/cabin/environment';
import { getMoonPhase } from '@/lib/moon';
import useSolarCycle from '@/hooks/useSolarCycle';
import { useWeather } from '@/hooks/useWeather';
import '@/styles/cabin.css';

type SheetKey =
  | 'drawer' | 'bio' | 'guestbook' | 'mailbox' | 'porch' | 'kitchen'
  | 'trade' | 'pets' | 'history' | 'radio' | 'fixup' | null;

const KNOCK_ERRORS: Record<string, string> = {
  rate_limited: 'You knocked not long ago. Give it a while.',
  not_allowed: 'Knocking is off at this cabin.',
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
};

const CabinPage = () => {
  const { handle } = useParams<{ handle?: string }>();
  const { user } = useAuth();
  const { data: boot } = useBootState();
  const myProfile = boot?.profile ?? null;
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  // /cabin (no handle) → your own cabin.
  useEffect(() => {
    if (!handle && myProfile?.handle) {
      navigate(`/u/${myProfile.handle}`, { replace: true });
    }
  }, [handle, myProfile?.handle, navigate]);

  const { data: view, isLoading, isError } = useCabinView(handle);
  const isOwner = !!view?.is_owner;
  const cabin = view?.cabin;
  const profile = view?.profile;
  const updateCabin = useUpdateCabin(user?.id, handle);

  const [sheet, setSheet] = useState<SheetKey>(null);
  const [inspecting, setInspecting] = useState<CabinPlacementView | null>(null);
  const [activeEvent, setActiveEvent] = useState<CabinEventResult['event'] | null>(null);
  const [knocked, setKnocked] = useState(false);
  const rolledRef = useRef(false);

  // ── Where the weather comes from (spec §12) ──
  const weatherSpot = useMemo(() => {
    if (cabin?.weather_source === 'cabin_location') {
      const loc = getCabinLocation(view?.weather_hint?.location_key ?? cabin.cabin_location_key);
      if (loc) return { lat: loc.lat, lng: loc.lng, biome: loc.biome };
    }
    if (cabin?.weather_source === 'account' && view?.weather_hint?.lat != null) {
      return { lat: view.weather_hint.lat, lng: view.weather_hint.lng!, biome: null };
    }
    return { lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, biome: null };
  }, [cabin?.weather_source, cabin?.cabin_location_key, view?.weather_hint]);

  const biome = cabin?.biome_key || weatherSpot.biome || profile?.biome || 'pacific-northwest';
  const solar = useSolarCycle(weatherSpot.lat, weatherSpot.lng);
  const weather = useWeather(weatherSpot.lat, weatherSpot.lng);
  const moonPhase = useMemo(() => getMoonPhase(), []);

  const env = useMemo(() => deriveEnvironment({
    timeOfDay: solar.timeOfDay,
    condition: weather.condition,
    isRaining: weather.isRaining,
    isSnowing: weather.isSnowing,
    windIntensity: weather.windIntensity,
    temperature: weather.temperature,
    latitude: weatherSpot.lat,
  }), [solar.timeOfDay, weather.condition, weather.isRaining, weather.isSnowing,
    weather.windIntensity, weather.temperature, weatherSpot.lat]);

  // ── The forest occasionally does something (server decides what) ──
  const tryRoll = useCallback(async () => {
    if (!view?.found || view.restricted || !isOwner) return;
    try {
      const res = await rollEvent(biome, env.weather, env.slot, env.season);
      if (res.event) setActiveEvent(res.event);
    } catch {
      // The forest can fail silently; the cabin never breaks over atmosphere.
    }
  }, [view?.found, view?.restricted, isOwner, biome, env.weather, env.slot, env.season]);

  useEffect(() => {
    if (!view?.found || rolledRef.current) return;
    rolledRef.current = true;
    const t = setTimeout(tryRoll, 4000 + Math.random() * 8000);
    const interval = setInterval(tryRoll, 6 * 60 * 1000);
    return () => { clearTimeout(t); clearInterval(interval); };
  }, [view?.found, tryRoll]);

  const onEventTap = () => {
    if (!activeEvent) return;
    const e = activeEvent;
    setActiveEvent(null);
    if (e.kind === 'discovery' && e.reward) {
      toast.success(`${e.emoji} ${e.description ?? e.name}`, { duration: 6000 });
    } else {
      toast(`${e.emoji} ${e.description ?? e.name}`, { duration: 8000 });
    }
  };

  const doKnock = async () => {
    if (!profile) return;
    try {
      const res = await knock(profile.id);
      if (!res.success) toast.error(KNOCK_ERRORS[res.error ?? ''] ?? 'The knock did not land.');
      else {
        setKnocked(true);
        toast.success('You knocked. No pressure on anyone.');
      }
    } catch {
      toast.error('The knock did not land.');
    }
  };

  const onFixture = (action: FixtureAction) => {
    switch (action) {
      case 'open_journal':
      case 'read_journal':
        navigate(`/${profile?.handle}`);
        return;
      case 'open_guestbook':
      case 'sign_guestbook':
        setSheet('guestbook'); return;
      case 'open_mailbox':
      case 'leave_note':
        setSheet('mailbox'); return;
      case 'open_radio':
      case 'listen_radio':
        setSheet('radio'); return;
      case 'open_kitchen':
      case 'view_shared_recipes':
        setSheet('kitchen'); return;
      case 'open_pets':
      case 'visit_pets':
        setSheet('pets'); return;
      case 'open_porch':
      case 'leave_gift':
        setSheet('porch'); return;
      case 'open_history':
        setSheet('history'); return;
      case 'read_bio':
        setSheet('bio'); return;
      case 'propose_trade':
        setSheet('trade'); return;
      case 'fix_up_cabin':
        setSheet('fixup'); return;
    }
  };

  const petContext = useMemo(() => ({
    env,
    visitorPresent: !isOwner,
    wildlifeVisible: false,
    cookingActive: sheet === 'kitchen',
  }), [env, isOwner, sheet]);

  // No handle means /cabin: wait for boot state, then the effect above
  // replaces the URL with /u/<own handle>.
  if (isLoading || !handle) return <PineTreeLoading />;

  if (isError) {
    return (
      <div className="page-shell">
        <ErrorPanel what="the cabin" />
      </div>
    );
  }

  if (!view?.found || !profile) {
    return (
      <div className="page-shell">
        <StatePanel
          title="No cabin out this way."
          action={<Link to="/explore" className="outline-button">Have a look around</Link>}
        >
          Nobody here goes by that name.
        </StatePanel>
      </div>
    );
  }

  if (view.restricted) {
    return (
      <div className="page-shell">
        <section className="panel cabin-restricted">
          <UserAvatar
            avatarUrl={profile.avatar_url}
            defaultAvatarKey={profile.default_avatar_key}
            displayName={profile.display_name}
            size={48}
          />
          <div>
            <b>{profile.display_name}</b>
            <p className="quiet">The curtains are drawn. This cabin is kept for closer company.</p>
          </div>
          <CircleButton profileId={profile.id} profileName={profile.display_name} />
        </section>
      </div>
    );
  }

  const placements = view.placements ?? [];
  const pets = view.pets ?? [];
  const perms = view.permissions;
  const presence = view.presence ?? 'away';
  const slot = toTimeSlot(solar.timeOfDay);
  const isNight = slot === 'night' || slot === 'dusk';
  const atmosphere = profile.atmosphere || 'morning-mist';

  return (
    <div className="page-shell cabin-page">
      {/* The world outside */}
      <div className="cabin-scene-wrap" aria-label={`${profile.display_name}'s cabin. ${env.weather.replace(/-/g, ' ')}, ${slot}.`}>
        <CabinScene
          atmosphere={atmosphere}
          moonPhase={moonPhase}
          latitude={weatherSpot.lat}
          longitude={weatherSpot.lng}
          biome={biome}
          creatureKey={profile.default_avatar_key ?? undefined}
          userId={profile.id}
          handle={profile.handle}
          visitorCreatureKey={!isOwner ? myProfile?.default_avatar_key ?? undefined : undefined}
        />
        <CabinExterior
          presence={presence}
          isNight={isNight}
          placements={placements}
          activeEvent={activeEvent}
          onInspectItem={setInspecting}
          onEventTap={onEventTap}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Identity strip — always reachable, visually quiet (spec §24) */}
      <section className="panel cabin-identity">
        <button type="button" className="cabin-identity-main" onClick={() => setSheet('bio')}>
          <UserAvatar
            avatarUrl={profile.avatar_url}
            defaultAvatarKey={profile.default_avatar_key}
            displayName={profile.display_name}
            size={40}
          />
          <span className="min-w-0">
            <b className="truncate">{isOwner ? 'Your cabin' : `${profile.display_name}’s cabin`}</b>
            <small>@{profile.handle}</small>
          </span>
        </button>
        <div className="cabin-identity-actions">
          {!isOwner && <CircleButton profileId={profile.id} profileName={profile.display_name} />}
          <button type="button" className="outline-button" onClick={() => setSheet('drawer')}>
            Things in this Cabin
          </button>
        </div>
      </section>

      {/* The room */}
      {cabin && (
        <CabinRoom
          cabin={cabin}
          placements={placements}
          pets={pets}
          slot={slot}
          weather={env.weather}
          isOwner={isOwner}
          petContext={petContext}
          reducedMotion={reducedMotion}
          onInspectItem={setInspecting}
          onFixture={onFixture}
          onToggleCurtains={isOwner ? () => updateCabin.mutate({
            curtain_state: cabin.curtain_state === 'open' ? 'closed'
              : cabin.curtain_state === 'closed' ? 'half' : 'open',
          }) : undefined}
          onPetTap={() => setSheet('pets')}
        />
      )}

      {/* Action row */}
      <div className="cabin-actions">
        {isOwner ? (
          <>
            <button type="button" className="solid-button" onClick={() => setSheet('fixup')}>
              🛠️ Fix Up Cabin
            </button>
            <button type="button" className="outline-button" onClick={() => setSheet('kitchen')}>Campfire</button>
            <button type="button" className="outline-button" onClick={() => setSheet('mailbox')}>Mailbox</button>
            <button type="button" className="outline-button" onClick={() => setSheet('porch')}>Porch</button>
            <button type="button" className="outline-button" onClick={() => setSheet('history')}>Ledger</button>
          </>
        ) : (
          <>
            {perms?.knock && (
              <button type="button" className="outline-button" disabled={knocked} onClick={doKnock}>
                {knocked ? 'Knocked' : '✊ Knock'}
              </button>
            )}
            {perms?.sign_guestbook && (
              <button type="button" className="outline-button" onClick={() => setSheet('guestbook')}>
                Sign guestbook
              </button>
            )}
            {perms?.leave_note && (
              <button type="button" className="outline-button" onClick={() => setSheet('mailbox')}>
                Leave a note
              </button>
            )}
            {perms?.leave_gift && (
              <button type="button" className="outline-button" onClick={() => setSheet('porch')}>
                Porch gift
              </button>
            )}
            {perms?.trade && (
              <button type="button" className="outline-button" onClick={() => setSheet('trade')}>
                Trade
              </button>
            )}
          </>
        )}
      </div>

      {/* Sheets */}
      <CabinDrawer
        open={sheet === 'drawer'}
        onClose={() => setSheet(null)}
        isOwner={isOwner}
        placements={placements}
        pets={pets}
        onFixture={onFixture}
        onInspectItem={p => { setSheet(null); setInspecting(p); }}
        onPetTap={() => setSheet('pets')}
      />
      <BioSheet open={sheet === 'bio'} onClose={() => setSheet(null)} view={view} />
      <GuestbookSheet
        open={sheet === 'guestbook'}
        onClose={() => setSheet(null)}
        ownerId={profile.id}
        ownerName={profile.display_name}
        canSign={!!perms?.sign_guestbook}
        isOwner={isOwner}
      />
      <MailboxSheet
        open={sheet === 'mailbox'}
        onClose={() => setSheet(null)}
        isOwner={isOwner}
        ownerId={profile.id}
        ownerName={profile.display_name}
      />
      <PorchSheet
        open={sheet === 'porch'}
        onClose={() => setSheet(null)}
        isOwner={isOwner}
        ownerId={profile.id}
        ownerName={profile.display_name}
      />
      <KitchenSheet open={sheet === 'kitchen'} onClose={() => setSheet(null)} isOwner={isOwner} />
      <TradeSheet
        open={sheet === 'trade'}
        onClose={() => setSheet(null)}
        ownerId={profile.id}
        ownerName={profile.display_name}
        ownerPlacements={placements}
      />
      <PetsSheet
        open={sheet === 'pets'}
        onClose={() => setSheet(null)}
        isOwner={isOwner}
        pets={pets}
        atmosphere={atmosphere.replace(/-/g, '_')}
      />
      <HistorySheet open={sheet === 'history'} onClose={() => setSheet(null)} />
      <RadioSheet
        open={sheet === 'radio'}
        onClose={() => setSheet(null)}
        ownerId={profile.id}
        ownerName={profile.display_name}
        isOwner={isOwner}
      />
      {isOwner && cabin && user && (
        <FixUpCabin
          open={sheet === 'fixup'}
          onClose={() => setSheet(null)}
          userId={user.id}
          cabin={cabin}
          placements={placements}
          onSave={patch => updateCabin.mutate(patch)}
        />
      )}
      <CabinItemInspect item={inspecting} onClose={() => setInspecting(null)} />
    </div>
  );
};

export default CabinPage;
