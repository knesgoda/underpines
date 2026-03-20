import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  mediaUrl: string;
  durationSeconds: number | null;
  waveformData: number[] | null;
  mimeType: string | null;
  isMine: boolean;
  onPlay: () => void; // notify parent to pause other players
  isPlaying: boolean;
  onPause: () => void;
}

const VoiceMessageBubble = ({ mediaUrl, durationSeconds, waveformData, mimeType, isMine, onPlay, isPlaying, onPause }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const waveform = waveformData || Array.from({ length: 50 }, () => Math.random() * 0.5 + 0.1);
  const duration = durationSeconds || 0;

  // Get signed URL for private bucket
  useEffect(() => {
    const getUrl = async () => {
      // mediaUrl could be a full URL or a storage path
      const path = mediaUrl.includes('voice-messages/') ? mediaUrl.split('voice-messages/').pop() : mediaUrl;
      if (!path) return;
      const { data } = await supabase.storage.from('voice-messages').createSignedUrl(path, 3600);
      if (data?.signedUrl) setSignedUrl(data.signedUrl);
      setLoading(false);
    };
    getUrl();
  }, [mediaUrl]);

  // Playback progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const ended = () => { setProgress(0); onPause(); };
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('ended', ended);
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('ended', ended); };
  }, [signedUrl, onPause]);

  // Play/pause sync
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !signedUrl) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, signedUrl]);

  const togglePlay = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
    if (!isPlaying) onPlay();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  const currentTime = audioRef.current?.currentTime || 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[200px] max-w-[280px] ${
        isMine
          ? 'bg-primary/15 rounded-br-md'
          : 'bg-card border border-border rounded-bl-md'
      }`}
    >
      {signedUrl && <audio ref={audioRef} src={signedUrl} preload="metadata" />}

      <button
        onClick={togglePlay}
        disabled={loading || !signedUrl}
        className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary disabled:opacity-40"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex items-center gap-px h-8 cursor-pointer" onClick={handleSeek}>
        {waveform.slice(0, 40).map((amp, i) => {
          const barProgress = i / 40;
          const filled = barProgress <= progress;
          return (
            <div
              key={i}
              className={`w-[2px] rounded-full transition-colors ${filled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              style={{ height: `${Math.max(3, amp * 24)}px` }}
            />
          );
        })}
      </div>

      <span className="font-mono text-[10px] text-muted-foreground w-8 text-right shrink-0">
        {isPlaying ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  );
};

export default VoiceMessageBubble;
