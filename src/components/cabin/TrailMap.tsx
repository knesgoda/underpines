import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { X, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Pin {
  id: string;
  lat: number;
  lng: number;
  pin_type: 'been-here' | 'want-to-go';
  note: string | null;
}

interface TrailMapProps {
  userId: string;
  atmosphere: { cardBg: string; text: string; border: string; accent: string; background: string };
}

const BEEN_ICON = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#b45309;border:2px solid #fef3c7;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const WANT_ICON = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:transparent;border:2px solid #4d7c0f;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const TrailMap = ({ userId, atmosphere }: TrailMapProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === userId;
  const [pins, setPins] = useState<Pin[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [addingPin, setAddingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [newPinType, setNewPinType] = useState<'been-here' | 'want-to-go'>('been-here');
  const [newPinNote, setNewPinNote] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const fetchPins = async () => {
      const { data } = await supabase
        .from('trail_map_pins')
        .select('id, lat, lng, pin_type, note')
        .eq('user_id', userId);
      if (data) setPins(data as Pin[]);
    };
    fetchPins();
  }, [userId]);

  const initMap = useCallback((container: HTMLDivElement, interactive: boolean) => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(container, {
      center: [20, 0],
      zoom: 2,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      touchZoom: interactive,
      doubleClickZoom: false,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);

    const lg = L.layerGroup().addTo(map);
    markersRef.current = lg;
    mapRef.current = map;

    if (interactive && isOwner) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        setAddingPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        setNewPinNote('');
        setNewPinType('been-here');
      });
    }

    return map;
  }, [isOwner]);

  // Render markers whenever pins change
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();
    pins.forEach(pin => {
      const icon = pin.pin_type === 'been-here' ? BEEN_ICON : WANT_ICON;
      const marker = L.marker([pin.lat, pin.lng], { icon }).addTo(markersRef.current!);
      if (pin.note) {
        marker.bindPopup(`<span style="font-size:12px;font-family:system-ui;">${pin.note}</span>`, {
          closeButton: false,
          className: 'trail-pin-popup',
        });
      }
      if (isOwner) {
        marker.on('contextmenu', async () => {
          await supabase.from('trail_map_pins').delete().eq('id', pin.id);
          setPins(prev => prev.filter(p => p.id !== pin.id));
        });
      }
    });
  }, [pins, isOwner]);

  // Preview map (non-interactive)
  useEffect(() => {
    if (fullscreen) return;
    if (!mapContainerRef.current) return;
    const map = initMap(mapContainerRef.current, false);
    setTimeout(() => map.invalidateSize(), 100);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fullscreen, initMap]);

  const savePin = async () => {
    if (!addingPin || !user) return;
    const { data } = await supabase
      .from('trail_map_pins')
      .insert({
        user_id: user.id,
        lat: addingPin.lat,
        lng: addingPin.lng,
        pin_type: newPinType,
        note: newPinNote.trim() || null,
      })
      .select()
      .single();
    if (data) {
      setPins(prev => [...prev, data as Pin]);
    }
    setAddingPin(null);
  };

  const beenCount = pins.filter(p => p.pin_type === 'been-here').length;
  const wantCount = pins.filter(p => p.pin_type === 'want-to-go').length;

  return (
    <>
      {/* Preview card */}
      <div
        className="rounded-2xl overflow-hidden shadow-soft transition-colors duration-700 cursor-pointer"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
        onClick={() => setFullscreen(true)}
      >
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <h3 className="font-display text-base" style={{ color: atmosphere.text }}>
            🗺️ Trail Map
          </h3>
          <Maximize2 size={14} style={{ color: atmosphere.text, opacity: 0.4 }} />
        </div>
        <div ref={mapContainerRef} className="h-40 w-full" style={{ zIndex: 0 }} />
        {(beenCount > 0 || wantCount > 0) && (
          <div className="px-6 py-3 flex gap-4">
            {beenCount > 0 && (
              <span className="text-xs font-body flex items-center gap-1.5" style={{ color: atmosphere.text, opacity: 0.6 }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#b45309' }} />
                {beenCount} visited
              </span>
            )}
            {wantCount > 0 && (
              <span className="text-xs font-body flex items-center gap-1.5" style={{ color: atmosphere.text, opacity: 0.6 }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#4d7c0f' }} />
                {wantCount} someday
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <FullscreenMap
          pins={pins}
          isOwner={isOwner}
          addingPin={addingPin}
          newPinType={newPinType}
          newPinNote={newPinNote}
          setNewPinType={setNewPinType}
          setNewPinNote={setNewPinNote}
          setAddingPin={setAddingPin}
          onSavePin={savePin}
          onDeletePin={async (id) => {
            await supabase.from('trail_map_pins').delete().eq('id', id);
            setPins(prev => prev.filter(p => p.id !== id));
          }}
          onClose={() => { setFullscreen(false); setAddingPin(null); }}
          initMap={initMap}
        />
      )}
    </>
  );
};

interface FullscreenMapProps {
  pins: Pin[];
  isOwner: boolean;
  addingPin: { lat: number; lng: number } | null;
  newPinType: 'been-here' | 'want-to-go';
  newPinNote: string;
  setNewPinType: (t: 'been-here' | 'want-to-go') => void;
  setNewPinNote: (n: string) => void;
  setAddingPin: (p: { lat: number; lng: number } | null) => void;
  onSavePin: () => void;
  onDeletePin: (id: string) => void;
  onClose: () => void;
  initMap: (el: HTMLDivElement, interactive: boolean) => L.Map;
}

const FullscreenMap = ({
  pins, isOwner, addingPin, newPinType, newPinNote,
  setNewPinType, setNewPinNote, setAddingPin, onSavePin, onDeletePin, onClose, initMap,
}: FullscreenMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = initMap(containerRef.current, true);
    setTimeout(() => map.invalidateSize(), 50);
    return () => { map.remove(); };
  }, [initMap]);

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-display text-base text-foreground">Trail Map</h3>
        <div className="flex items-center gap-3">
          {isOwner && (
            <span className="text-xs text-muted-foreground font-body">Tap map to drop a pin</span>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-foreground" />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 relative" style={{ zIndex: 0 }} />

      {/* Pin creation popover */}
      {addingPin && isOwner && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[70] w-72 bg-card border border-border rounded-2xl p-4 shadow-lg space-y-3">
          <p className="text-sm font-body text-foreground font-medium">Drop a pin</p>
          <div className="flex gap-2">
            <button
              onClick={() => setNewPinType('been-here')}
              className={`flex-1 text-xs font-body rounded-full py-1.5 px-3 border transition-colors ${
                newPinType === 'been-here'
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'border-border text-muted-foreground hover:border-amber-700'
              }`}
            >
              Been here
            </button>
            <button
              onClick={() => setNewPinType('want-to-go')}
              className={`flex-1 text-xs font-body rounded-full py-1.5 px-3 border transition-colors ${
                newPinType === 'want-to-go'
                  ? 'bg-lime-700 text-white border-lime-700'
                  : 'border-border text-muted-foreground hover:border-lime-700'
              }`}
            >
              Want to go
            </button>
          </div>
          <Input
            value={newPinNote}
            onChange={e => setNewPinNote(e.target.value.slice(0, 100))}
            placeholder="A short note (optional)"
            className="rounded-xl text-sm h-9"
          />
          <div className="flex gap-2">
            <Button onClick={onSavePin} size="sm" className="rounded-full text-xs flex-1">
              <MapPin size={12} className="mr-1" /> Save pin
            </Button>
            <Button onClick={() => setAddingPin(null)} variant="ghost" size="sm" className="rounded-full text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border flex items-center gap-4 bg-background">
        <span className="text-xs font-body flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#b45309' }} />
          Been here
        </span>
        <span className="text-xs font-body flex items-center gap-1.5 text-muted-foreground">
          <span className="inline-block w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: '#4d7c0f' }} />
          Want to go
        </span>
        {isOwner && (
          <span className="text-xs font-body text-muted-foreground ml-auto">Long-press a pin to remove it</span>
        )}
      </div>
    </div>
  );
};

export default TrailMap;
