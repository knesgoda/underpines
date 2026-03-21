import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onSend: (blob: Blob, durationSec: number, waveform: number[], mimeType: string) => void;
}

const MAX_DURATION = 180; // 3 minutes
const CANCEL_SLIDE_PX = 60;

const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || 'audio/webm';
};

const VoiceRecorder = ({ onSend }: Props) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [denied, setDenied] = useState(false);
  const [slideX, setSlideX] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const amplitudesRef = useRef<number[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const waveIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const mimeRef = useRef('audio/webm');
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    setRecording(false);
    setElapsed(0);
    setSlideX(0);
    cancelledRef.current = false;
    setCancelled(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setDenied(false);

      // Web Audio API for waveform
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      amplitudesRef.current = [];

      // Sample amplitude ~10 times/sec
      waveIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        amplitudesRef.current.push(Math.sqrt(sum / data.length));
      }, 100);

      const mime = getSupportedMimeType();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        if (cancelledRef.current) {
          cleanup();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);

        // Downsample to ~50 points
        const raw = amplitudesRef.current;
        const waveform: number[] = [];
        const step = Math.max(1, Math.floor(raw.length / 50));
        for (let i = 0; i < raw.length; i += step) {
          const slice = raw.slice(i, i + step);
          const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
          waveform.push(Math.min(1, avg * 3)); // normalize, amplify
        }
        while (waveform.length < 50) waveform.push(0);

        onSend(blob, duration, waveform.slice(0, 50), mime);
        cleanup();
      };

      startTimeRef.current = Date.now();
      recorder.start(200);
      setRecording(true);
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const s = Math.round((Date.now() - startTimeRef.current) / 1000);
        setElapsed(s);
        if (s >= MAX_DURATION) {
          recorder.stop();
        }
      }, 500);
    } catch {
      setDenied(true);
    }
  }, [onSend, cleanup]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    setCancelled(true);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  // Pointer handlers for slide-to-cancel
  const handlePointerDown = (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!recording) return;
    const dx = e.clientX - startXRef.current;
    if (dx < 0) setSlideX(dx);
    if (dx < -CANCEL_SLIDE_PX) {
      cancelRecording();
    }
  };

  const handlePointerUp = () => {
    if (!recording) return;
    if (!cancelledRef.current) {
      stopRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (denied) {
    return (
      <div className="p-2 text-center">
        <p className="font-body text-xs text-muted-foreground">
          Microphone access is needed for voice messages. Enable it in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-0 right-0 mb-1 px-3 py-2 bg-card border border-border rounded-xl flex items-center gap-3"
            style={{ transform: `translateX(${Math.max(slideX, -CANCEL_SLIDE_PX)}px)`, opacity: slideX < -CANCEL_SLIDE_PX * 0.5 ? 0.5 : 1 }}
          >
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <div className="flex-1 flex items-center gap-1 h-6">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary/60 rounded-full transition-all"
                  style={{
                    height: `${Math.max(4, (amplitudesRef.current[amplitudesRef.current.length - 30 + i] || 0) * 24)}px`,
                  }}
                />
              ))}
            </div>
            <span className="font-mono text-xs text-foreground w-10 text-right">{formatTime(elapsed)}</span>
            <span className="font-body text-[10px] text-muted-foreground">← slide to cancel</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelRecording}
        className={`p-2 shrink-0 transition-colors touch-none select-none ${
          recording ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Hold to record voice message"
      >
        <Mic size={18} />
      </button>
    </div>
  );
};

export default VoiceRecorder;
