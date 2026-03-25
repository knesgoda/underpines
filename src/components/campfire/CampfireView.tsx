import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Camera, ArrowUpRight, Send, Pin, Trash2, X, Image as ImageIcon, Search, Lock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimeAgo } from '@/lib/time';
import { toast } from 'sonner';
import CampfireLog from './CampfireLog';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessageBubble from './VoiceMessageBubble';
import CampfireSearch from './CampfireSearch';
import CrossPostCard from './CrossPostCard';
import { extractFirstUrl, stripFirstUrl } from '@/lib/linkify';
import LinkPreviewCard from '@/components/feed/LinkPreviewCard';

interface Message {
  id: string;
  campfire_id: string;
  sender_id: string;
  content: string | null;
  message_type: string | null;
  media_url: string | null;
  cross_post_id: string | null;
  is_faded: boolean | null;
  created_at: string | null;
  voice_duration_seconds?: number | null;
  voice_waveform_data?: number[] | null;
  voice_mime_type?: string | null;
  senderName?: string;
  senderHandle?: string;
}

interface Participant {
  user_id: string;
  display_name: string;
  handle: string;
  isFirekeeper: boolean;
}

interface CampfireData {
  id: string;
  name: string | null;
  campfire_type: string;
  vibe: string | null;
  firekeeper_id: string | null;
  is_active: boolean | null;
  is_embers: boolean | null;
  expires_at: string | null;
  camp_id: string | null;
}

interface Props {
  campfireId: string;
  onBack: () => void;
  onRefreshList: () => void;
  autoFocusInput?: boolean;
  isScout?: boolean;
  scoutDays?: number | null;
}
const REACTIONS = ['🔥', '🌲', '💚', '😂', '👀', '🫂', '🌧️', '✨'];

const CampfireView = ({ campfireId, onBack, onRefreshList, autoFocusInput, isScout, scoutDays }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [campfire, setCampfire] = useState<CampfireData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isPinesPlus, setIsPinesPlus] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [highlightMsgId, setHighlightMsgId] = useState<string | null>(null);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [flickerTimeLeft, setFlickerTimeLeft] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [newMsgPill, setNewMsgPill] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened via "Stoke it?"
  useEffect(() => {
    if (autoFocusInput && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [autoFocusInput, campfire]);

  // Load campfire data
  const loadCampfire = useCallback(async () => {
    const { data } = await supabase.from('campfires').select('*').eq('id', campfireId).maybeSingle();
    if (data) setCampfire(data);
  }, [campfireId]);

  // Load participants
  const loadParticipants = useCallback(async () => {
    if (!campfire) return;
    const { data: parts } = await supabase
      .from('campfire_participants')
      .select('user_id')
      .eq('campfire_id', campfireId);

    if (parts) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', parts.map(p => p.user_id));

      setParticipants((profiles || []).map(p => ({
        user_id: p.id,
        display_name: p.display_name,
        handle: p.handle,
        isFirekeeper: p.id === campfire.firekeeper_id,
      })));
    }
  }, [campfireId, campfire]);

  // Load messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('campfire_messages')
      .select('*')
      .eq('campfire_id', campfireId)
      .order('created_at', { ascending: true })
      .limit(200);

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, handle')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      setMessages(data.map(m => ({
        ...m,
        voice_waveform_data: m.voice_waveform_data as number[] | null,
        senderName: profileMap.get(m.sender_id)?.display_name,
        senderHandle: profileMap.get(m.sender_id)?.handle,
      })));
    } else {
      setMessages([]);
    }
  }, [campfireId]);

  useEffect(() => { loadCampfire(); }, [loadCampfire]);
  useEffect(() => { if (campfire) loadParticipants(); }, [campfire, loadParticipants]);
  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Check Pines+ status
  useEffect(() => {
    if (!user) return;
    supabase
      .from('pines_plus_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => setIsPinesPlus(!!data));
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Scroll detection
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
    if (isNearBottom) setNewMsgPill(false);
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`campfire-${campfireId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'campfire_messages',
        filter: `campfire_id=eq.${campfireId}`,
      }, async (payload) => {
        const msg = payload.new as any;
        // Fetch sender info
        const { data: prof } = await supabase.from('profiles').select('display_name, handle').eq('id', msg.sender_id).maybeSingle();
        const enriched: Message = { ...msg, senderName: prof?.display_name, senderHandle: prof?.handle };

        setMessages(prev => [...prev, enriched]);

        if (!autoScroll) {
          setNewMsgPill(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campfireId, autoScroll]);

  // Flicker countdown
  useEffect(() => {
    if (!campfire || campfire.campfire_type !== 'flicker' || !campfire.expires_at) return;
    const update = () => {
      const diff = new Date(campfire.expires_at!).getTime() - Date.now();
      if (diff <= 0) { setFlickerTimeLeft('expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setFlickerTimeLeft(`${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [campfire]);

  const sendMessage = async () => {
    if (!user || !input.trim()) return;
    setSending(true);

    const content = input.trim();
    setInput('');

    await supabase.from('campfire_messages').insert({
      campfire_id: campfireId,
      sender_id: user.id,
      content,
      message_type: 'text',
    });

    setSending(false);
    setAutoScroll(true);
    inputRef.current?.focus();
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incoming = Array.from(e.target.files);
    e.target.value = '';

    const next: File[] = [...stagedFiles];
    for (const f of incoming) {
      if (f.size > 10 * 1024 * 1024) { toast.error('Files must be under 10MB'); continue; }
      if (f.type.startsWith('video')) {
        if (next.some(x => x.type.startsWith('video'))) { toast('Only one video per message'); continue; }
      } else if (!f.type.startsWith('image')) {
        continue;
      }
      if (next.length < 10) next.push(f);
    }

    stagedPreviews.forEach(u => URL.revokeObjectURL(u));
    setStagedFiles(next);
    setStagedPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const removeStagedFile = (idx: number) => {
    URL.revokeObjectURL(stagedPreviews[idx]);
    const nextFiles = stagedFiles.filter((_, i) => i !== idx);
    const nextPreviews = stagedPreviews.filter((_, i) => i !== idx);
    setStagedFiles(nextFiles);
    setStagedPreviews(nextPreviews);
  };

  const clearStaged = () => {
    stagedPreviews.forEach(u => URL.revokeObjectURL(u));
    setStagedFiles([]);
    setStagedPreviews([]);
  };

  const sendStagedMedia = async () => {
    if (!user) return;
    const snapshot = [...stagedFiles];
    if (snapshot.length === 0) return;

    // Snapshot text now before clearing state
    const captionText = input.trim() || null;

    setUploadingMedia(true);
    setInput('');
    clearStaged();

    for (let i = 0; i < snapshot.length; i++) {
      const file = snapshot[i];
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/campfire/${campfireId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, file, { contentType: file.type, cacheControl: '31536000' });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload — ' + uploadError.message);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(path);

      const { error: insertError } = await supabase.from('campfire_messages').insert({
        campfire_id: campfireId,
        sender_id: user.id,
        message_type: 'photo',
        media_url: publicUrl,
        content: i === 0 ? captionText : null, // only attach text to first photo
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast.error('Failed to send — ' + insertError.message);
      }
    }

    setUploadingMedia(false);
    setAutoScroll(true);
  };

  const sendVoiceMessage = async (blob: Blob, durationSec: number, waveform: number[], mimeType: string) => {
    if (!user) return;
    const msgId = crypto.randomUUID();
    const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const storagePath = `${user.id}/${campfireId}/${msgId}.${ext}`;

    const { error } = await supabase.storage.from('voice-messages').upload(storagePath, blob, { contentType: mimeType });
    if (error) { toast.error('Failed to upload voice message'); return; }

    await supabase.from('campfire_messages').insert({
      id: msgId,
      campfire_id: campfireId,
      sender_id: user.id,
      message_type: 'voice',
      media_url: storagePath,
      voice_duration_seconds: durationSec,
      voice_waveform_data: waveform,
      voice_mime_type: mimeType,
    });
    setAutoScroll(true);
  };

  const jumpToMessage = (messageId: string) => {
    setShowSearch(false);
    setHighlightMsgId(messageId);
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    setTimeout(() => setHighlightMsgId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (stagedFiles.length > 0) {
        sendStagedMedia();
      } else {
        sendMessage();
      }
    }
  };

  const addReaction = async (msgId: string, reaction: string) => {
    if (!user) return;
    await supabase.from('campfire_reactions').upsert({
      message_id: msgId,
      user_id: user.id,
      reaction_type: reaction,
    }, { onConflict: 'message_id,user_id' });
    setReactionMsgId(null);
  };

  const otherParticipant = participants.find(p => p.user_id !== user?.id);
  const headerName = campfire?.campfire_type === 'one_on_one'
    ? otherParticipant?.display_name || 'Campfire'
    : campfire?.name || 'Group Campfire';

  const isFlickerExpired = campfire?.campfire_type === 'flicker' && flickerTimeLeft === 'expired';
  const isFirekeeper = user?.id === campfire?.firekeeper_id;

  if (!campfire) return null;

  // Show search view
  if (showSearch) {
    return (
      <CampfireSearch
        campfireId={campfireId}
        campfireName={headerName}
        onBack={() => setShowSearch(false)}
        onJumpToMessage={jumpToMessage}
      />
    );
  }

  // Expired flicker
  if (isFlickerExpired) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-xs">
          <p className="text-5xl mb-4">🕯️</p>
          <p className="font-display text-lg text-foreground mb-1">This Flicker has burned out.</p>
          <p className="font-body text-sm text-muted-foreground mb-6">The warmth lingers, even after the light fades.</p>
          <button onClick={onBack} className="font-body text-sm text-primary hover:underline">← Back to Campfires</button>
        </div>
      </div>
    );
  }

  // Should we show time divider?
  const shouldShowTimeDivider = (msg: Message, prevMsg?: Message) => {
    if (!prevMsg || !msg.created_at || !prevMsg.created_at) return false;
    const diff = new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
    return diff > 30 * 60 * 1000; // 30 minutes
  };

  const formatTimeDivider = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === now.toDateString()) {
      return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
      `, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm">{campfire.campfire_type === 'flicker' ? '🕯️' : '🔥'}</span>
            <h2 className="font-body text-sm font-medium text-foreground truncate">{headerName}</h2>
            {campfire.campfire_type === 'flicker' && flickerTimeLeft && flickerTimeLeft !== 'expired' && (
              <span className="font-body text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                {flickerTimeLeft}
              </span>
            )}
          </div>
          {campfire.vibe && (
            <p className="font-body text-xs text-muted-foreground truncate">{campfire.vibe}</p>
          )}
          {campfire.campfire_type === 'group' && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {participants.slice(0, 5).map(p => (
                <div key={p.user_id} className="w-5 h-5 -mr-1 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-secondary-foreground border border-card">
                  {p.display_name[0]?.toUpperCase()}
                </div>
              ))}
              {participants.length > 5 && (
                <span className="ml-2 font-body text-[10px] text-muted-foreground">+{participants.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {campfire.campfire_type === 'group' && (
            <button onClick={() => setShowLog(!showLog)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted" title="The Log">
              🪵
            </button>
          )}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted">
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-30"
                >
                  {campfire.campfire_type === 'one_on_one' && otherParticipant && (
                    <MenuBtn onClick={() => { setMenuOpen(false); navigate(`/${otherParticipant.handle}`); }}>
                      View {otherParticipant.display_name}'s Cabin
                    </MenuBtn>
                  )}
                  {campfire.campfire_type === 'group' && (
                    <>
                      <MenuBtn onClick={() => { setMenuOpen(false); setShowParticipants(true); }}>Participants</MenuBtn>
                      {isFirekeeper && <MenuBtn onClick={() => { setMenuOpen(false); toast.info('Rename coming soon'); }}>Edit name & vibe</MenuBtn>}
                    </>
                  )}
                  <div className="h-px bg-border" />
                  <MenuBtn onClick={() => { setMenuOpen(false); isPinesPlus ? setShowSearch(true) : toast.info('Search Campfires is available with Pines+'); }}>
                    <span className="flex items-center gap-2">
                      <Search size={14} /> Search this Campfire
                      {!isPinesPlus && <Lock size={12} className="text-muted-foreground" />}
                    </span>
                  </MenuBtn>
                  <div className="h-px bg-border" />
                  <MenuBtn onClick={() => { setMenuOpen(false); }}>Notification settings</MenuBtn>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Embers banner */}
      {campfire.is_embers && (
        <div className="px-4 py-2 bg-muted text-center">
          <p className="font-body text-xs text-muted-foreground">This fire has been embers. The history is still here.</p>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex min-h-0">
        {/* Messages */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-3 space-y-1" style={{ touchAction: 'pan-y' }}>
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">🔥</p>
                <p className="font-body text-sm text-muted-foreground">The fire's lit. Say something.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user?.id;
              const prevMsg = messages[i - 1];
              const showDivider = shouldShowTimeDivider(msg, prevMsg);

              return (
                <div key={msg.id} id={`msg-${msg.id}`}>
                  {showDivider && msg.created_at && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="font-body text-[10px] text-muted-foreground">{formatTimeDivider(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group transition-colors ${highlightMsgId === msg.id ? 'bg-amber-light/30 rounded-xl' : ''}`}>
                    <div className="max-w-[75%]">
                      {/* Sender name for group chats */}
                      {!isMine && campfire.campfire_type === 'group' && (
                        prevMsg?.sender_id !== msg.sender_id || showDivider
                      ) && (
                        <p className="font-body text-[10px] text-muted-foreground mb-0.5 px-3">{msg.senderName}</p>
                      )}

                      {msg.is_faded ? (
                        <div className="px-3 py-2 rounded-2xl bg-muted">
                          <p className="font-body text-xs text-muted-foreground italic">
                            A message from {msg.created_at ? new Date(msg.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'the past'} · Keep messages forever with Pines+
                          </p>
                        </div>
                      ) : msg.message_type === 'photo' && msg.media_url ? (
                        <div
                          className={`rounded-2xl overflow-hidden cursor-pointer ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}
                          onContextMenu={(e) => { e.preventDefault(); setReactionMsgId(msg.id); }}
                          onDoubleClick={() => setReactionMsgId(msg.id)}
                        >
                          {/\.(mp4|mov|webm)(?:\?.*)?$/i.test(msg.media_url) ? (
                            <video src={msg.media_url} className="max-w-full max-h-[240px] object-cover" controls playsInline preload="metadata" />
                          ) : (
                            <img src={msg.media_url} alt="" className="max-w-full max-h-[240px] object-cover" />
                          )}
                          {msg.content && (
                            <p className={`font-body text-sm whitespace-pre-wrap px-3 py-1.5 ${isMine ? 'bg-primary/15' : 'bg-card border-t border-border'}`}>{linkifyText(msg.content)}</p>
                          )}
                        </div>
                      ) : msg.message_type === 'voice' && msg.media_url ? (
                        <VoiceMessageBubble
                          mediaUrl={msg.media_url}
                          durationSeconds={msg.voice_duration_seconds ?? null}
                          waveformData={msg.voice_waveform_data ?? null}
                          mimeType={msg.voice_mime_type ?? null}
                          isMine={isMine}
                          isPlaying={playingVoiceId === msg.id}
                          onPlay={() => setPlayingVoiceId(msg.id)}
                          onPause={() => setPlayingVoiceId(null)}
                        />
                      ) : msg.message_type === 'cross_post' && msg.cross_post_id ? (
                        <CrossPostCard
                          postId={msg.cross_post_id}
                          note={msg.content}
                          isMine={isMine}
                        />
                      ) : (
                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isMine
                              ? 'bg-primary/15 text-foreground rounded-br-md'
                              : 'bg-card border border-border text-foreground rounded-bl-md'
                          }`}
                          onContextMenu={(e) => { e.preventDefault(); setReactionMsgId(msg.id); }}
                          onDoubleClick={() => setReactionMsgId(msg.id)}
                        >
                          <p className="font-body text-sm whitespace-pre-wrap">{linkifyText(msg.content || '')}</p>
                        </div>
                      )}

                      {/* Timestamp on hover */}
                      {msg.created_at && (
                        <p className={`font-body text-[9px] text-muted-foreground mt-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'text-right' : ''}`}>
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}

                      {/* Reaction fan */}
                      <AnimatePresence>
                        {reactionMsgId === msg.id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`flex gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            {REACTIONS.map((r, ri) => (
                              <motion.button
                                key={r}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: ri * 0.015 }}
                                onClick={() => addReaction(msg.id, r)}
                                className="text-lg hover:scale-125 transition-transform"
                              >
                                {r}
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* New message pill */}
          {newMsgPill && (
            <button
              onClick={() => { setAutoScroll(true); setNewMsgPill(false); if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-primary text-primary-foreground font-body text-xs shadow-lg"
            >
              ↓ New message
            </button>
          )}

          {/* Input area */}
          {isScout ? (
            <div className="border-t border-border px-4 py-3 text-center shrink-0">
              <p className="font-body text-xs text-muted-foreground">
                🌱 You're a Scout in this Camp for {scoutDays ?? 0} more days. Explore and react — messaging unlocks soon.
              </p>
            </div>
          ) : (
            <div className="border-t border-border shrink-0" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
              {/* Media preview strip */}
              {stagedPreviews.length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {stagedPreviews.map((src, i) => (
                      <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border">
                        {stagedFiles[i]?.type.startsWith('video') ? (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-lg">▶</span>
                          </div>
                        ) : (
                          <img src={src} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => removeStagedFile(i)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input row */}
              <div className="px-3 py-2 flex items-end gap-2">
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4"
                  multiple
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                <button
                  onClick={() => mediaInputRef.current?.click()}
                  className="p-2 text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-transform"
                  type="button"
                  aria-label="Attach photo or video"
                >
                  <Camera size={18} />
                </button>
                <VoiceRecorder onSend={sendVoiceMessage} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 resize-none max-h-[120px] py-2 px-3 rounded-xl border border-border bg-background font-body text-sm outline-none"
                  style={{ minHeight: '36px' }}
                  onInput={(e) => {
                    const t = e.currentTarget;
                    t.style.height = '36px';
                    t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  type="button"
                  onClick={() => { stagedFiles.length > 0 ? sendStagedMedia() : sendMessage(); }}
                  disabled={uploadingMedia || (stagedFiles.length === 0 && !input.trim() && !sending)}
                  className="p-2 text-primary hover:opacity-80 disabled:opacity-30 shrink-0"
                >
                  {uploadingMedia ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* The Log side panel (desktop only) */}
        <AnimatePresence>
          {showLog && !isMobile && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border overflow-hidden shrink-0"
            >
              <CampfireLog campfireId={campfireId} isFirekeeper={isFirekeeper} onClose={() => setShowLog(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The Log bottom sheet (mobile) */}
      <AnimatePresence>
        {showLog && isMobile && (
          <div className="fixed inset-0 z-50 flex items-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowLog(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-card rounded-t-2xl w-full max-h-[70dvh] overflow-hidden"
            >
              <CampfireLog campfireId={campfireId} isFirekeeper={isFirekeeper} onClose={() => setShowLog(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Participants panel */}
      <AnimatePresence>
        {showParticipants && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowParticipants(false)} />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-card rounded-t-2xl md:rounded-2xl w-full max-w-sm max-h-[60dvh] overflow-hidden border border-border"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-body text-sm font-medium text-foreground">The Fire ({participants.length})</h3>
                <button onClick={() => setShowParticipants(false)} className="text-muted-foreground"><X size={18} /></button>
              </div>
              <div className="p-4 space-y-2">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
                      {p.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-foreground truncate">
                        {p.isFirekeeper && '🔑 '}{p.display_name} {p.user_id === user?.id && '(You)'}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">@{p.handle}</p>
                    </div>
                  </div>
                ))}
                {(() => {
                  const isBonfire = !!campfire?.camp_id;
                  const maxCap = isBonfire ? 150 : (campfire?.campfire_type === 'flicker' ? 10 : 20);
                  const isFull = participants.length >= maxCap;
                  return isFull ? (
                    <p className="font-body text-xs text-muted-foreground text-center pt-3 pb-1">
                      {isBonfire
                        ? 'This Bonfire has reached its 150-person limit.'
                        : 'This Campfire is full. Start a new one?'}
                    </p>
                  ) : null;
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuBtn = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="w-full text-left px-3 py-2 text-sm font-body text-foreground hover:bg-muted transition-colors">
    {children}
  </button>
);

export default CampfireView;
