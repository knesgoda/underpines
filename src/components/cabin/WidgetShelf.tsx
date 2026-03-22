import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import TrailMap from './TrailMap';
import VintageRadio from './VintageRadio';
import { toast } from 'sonner';

interface BookEntry {
  title: string;
  author: string;
  coverUrl?: string;
  color?: string;
}

interface FieldNoteEntry {
  text: string;
  createdAt: string;
}

interface WidgetShelfProps {
  userId: string;
  isPinesPlus: boolean;
  atmosphere: { cardBg: string; text: string; border: string; accent: string; background: string };
  songTitle?: string | null;
  songArtist?: string | null;
  spotifyTrackId?: string | null;
  spotifyPreviewUrl?: string | null;
  onUpdate?: () => void;
}

const SPINE_COLORS = [
  '#7c2d12', '#92400e', '#166534', '#14532d', '#1e3a5f',
  '#4c1d95', '#6b21a8', '#9f1239', '#854d0e', '#1e293b',
  '#0c4a6e', '#365314',
];

const WidgetShelf = ({ userId, isPinesPlus, atmosphere }: WidgetShelfProps) => {
  const { user } = useAuth();
  const isOwner = user?.id === userId;
  const [bookshelf, setBookshelf] = useState<BookEntry[]>([]);
  const [fieldNotes, setFieldNotes] = useState<FieldNoteEntry[]>([]);
  const [bookshelfWidget, setBookshelfWidget] = useState<any>(null);
  const [fieldNotesWidget, setFieldNotesWidget] = useState<any>(null);
  const [addingBook, setAddingBook] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', author: '' });
  const [newNote, setNewNote] = useState('');
  const [trailMapVisible, setTrailMapVisible] = useState(false);

  useEffect(() => {
    const fetchTrailMapVisibility = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('trail_map_visible')
        .eq('id', userId)
        .single();
      if (data) setTrailMapVisible(data.trail_map_visible ?? true);
    };
    fetchTrailMapVisibility();
  }, [userId]);

  useEffect(() => {
    const fetchWidgets = async () => {
      const { data } = await supabase
        .from('cabin_widgets')
        .select('*')
        .eq('user_id', userId)
        .order('position');

      if (data) {
        const bw = data.find(w => w.widget_type === 'bookshelf');
        const fn = data.find(w => w.widget_type === 'field-notes');
        if (bw) {
          setBookshelfWidget(bw);
          setBookshelf((bw.widget_data as any)?.books || []);
        }
        if (fn) {
          setFieldNotesWidget(fn);
          setFieldNotes((fn.widget_data as any)?.notes || []);
        }
      }
    };

    fetchWidgets();
  }, [userId]);

  const saveBookshelf = async (books: BookEntry[]) => {
    setBookshelf(books);
    const data = { books };
    if (bookshelfWidget) {
      await supabase.from('cabin_widgets').update({ widget_data: data as any }).eq('id', bookshelfWidget.id);
    } else {
      const { data: inserted } = await supabase.from('cabin_widgets').insert({
        user_id: userId,
        widget_type: 'bookshelf',
        widget_data: data as any,
        position: 0,
      }).select().single();
      if (inserted) setBookshelfWidget(inserted);
    }
  };

  const saveFieldNotes = async (notes: FieldNoteEntry[]) => {
    setFieldNotes(notes);
    const data = { notes };
    if (fieldNotesWidget) {
      await supabase.from('cabin_widgets').update({ widget_data: data as any }).eq('id', fieldNotesWidget.id);
    } else {
      const { data: inserted } = await supabase.from('cabin_widgets').insert({
        user_id: userId,
        widget_type: 'field-notes',
        widget_data: data as any,
        position: 1,
      }).select().single();
      if (inserted) setFieldNotesWidget(inserted);
    }
  };

  const addBook = () => {
    if (!newBook.title.trim()) return;
    if (bookshelf.length >= 6) {
      toast.info('The shelf holds up to 6 books');
      return;
    }
    const color = SPINE_COLORS[bookshelf.length % SPINE_COLORS.length];
    const books = [...bookshelf, { ...newBook, color }];
    saveBookshelf(books);
    setNewBook({ title: '', author: '' });
    setAddingBook(false);
  };

  const removeBook = (index: number) => {
    const books = bookshelf.filter((_, i) => i !== index);
    saveBookshelf(books);
  };

  const addFieldNote = () => {
    if (!newNote.trim()) return;
    const notes = [{ text: newNote.trim(), createdAt: new Date().toISOString() }, ...fieldNotes].slice(0, 5);
    saveFieldNotes(notes);
    setNewNote('');
    setAddingNote(false);
  };

  const removeNote = (index: number) => {
    const notes = fieldNotes.filter((_, i) => i !== index);
    saveFieldNotes(notes);
  };

  if (!isPinesPlus) return null;

  return (
    <div className="space-y-6">
      {/* Bookshelf Widget */}
      <div
        className="rounded-2xl p-6 shadow-soft transition-colors duration-700"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
      >
        <h3 className="font-display text-base mb-4" style={{ color: atmosphere.text }}>
          📚 Bookshelf
        </h3>

        {bookshelf.length > 0 ? (
          <div className="flex items-end gap-1.5 h-32 px-2">
            {bookshelf.map((book, i) => (
              <div
                key={i}
                className="relative group flex-shrink-0 rounded-sm cursor-default"
                style={{
                  width: 28 + (book.title.length > 15 ? 6 : 0),
                  height: 90 + (i % 3) * 12,
                  backgroundColor: book.color || SPINE_COLORS[i],
                  boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.2), 2px 2px 4px rgba(0,0,0,0.1)',
                }}
                title={`${book.title} — ${book.author}`}
              >
                {/* Spine text */}
                <div
                  className="absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                  }}
                >
                  <span className="text-xs font-body truncate px-1" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, maxHeight: '80%' }}>
                    {book.title}
                  </span>
                </div>
                {/* Remove button */}
                {isOwner && (
                  <button
                    onClick={() => removeBook(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ fontSize: 10 }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            {/* Shelf base */}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            <p className="text-xs font-body" style={{ color: atmosphere.text, opacity: 0.35 }}>
              An empty shelf, waiting.
            </p>
          </div>
        )}

        {/* Shelf visual — the actual shelf plank */}
        <div
          className="h-2 rounded-sm mt-1"
          style={{ backgroundColor: '#92400e', opacity: 0.3, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        />

        {isOwner && (
          <div className="mt-3">
            {addingBook ? (
              <div className="space-y-2">
                <Input
                  value={newBook.title}
                  onChange={e => setNewBook(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                  className="rounded-xl bg-background text-sm h-9"
                  autoFocus
                />
                <Input
                  value={newBook.author}
                  onChange={e => setNewBook(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Author"
                  className="rounded-xl bg-background text-sm h-9"
                  onKeyDown={e => e.key === 'Enter' && addBook()}
                />
                <div className="flex gap-2">
                  <Button onClick={addBook} size="sm" className="rounded-pill text-xs font-body bg-primary text-primary-foreground">
                    Add to shelf
                  </Button>
                  <Button onClick={() => setAddingBook(false)} variant="ghost" size="sm" className="rounded-pill text-xs font-body">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : bookshelf.length < 6 ? (
              <button
                onClick={() => setAddingBook(true)}
                className="flex items-center gap-1.5 text-xs font-body transition-colors hover:opacity-80"
                style={{ color: atmosphere.accent }}
              >
                <Plus size={12} /> Add a book
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Field Notes Widget */}
      <div
        className="rounded-2xl p-6 shadow-soft transition-colors duration-700"
        style={{ backgroundColor: atmosphere.cardBg, borderColor: atmosphere.border, borderWidth: 1 }}
      >
        <h3 className="font-display text-base mb-4" style={{ color: atmosphere.text }}>
          📝 Field Notes
        </h3>

        {fieldNotes.length > 0 ? (
          <div className="space-y-3">
            {fieldNotes.map((note, i) => (
              <div key={i} className="group flex gap-2">
                <p className="text-sm font-body flex-1 leading-relaxed" style={{ color: atmosphere.text, opacity: 0.75 }}>
                  {note.text}
                </p>
                {isOwner && (
                  <button
                    onClick={() => removeNote(i)}
                    className="opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                    style={{ color: atmosphere.text }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-body" style={{ color: atmosphere.text, opacity: 0.35 }}>
            Nothing here yet. Add something that's yours.
          </p>
        )}

        {isOwner && (
          <div className="mt-3">
            {addingNote ? (
              <div className="space-y-2">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value.slice(0, 140))}
                  placeholder="A thought, a note, a moment..."
                  className="rounded-xl bg-background text-sm resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-body" style={{ color: atmosphere.text, opacity: 0.3 }}>
                    {newNote.length}/140
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={addFieldNote} size="sm" className="rounded-pill text-xs font-body bg-primary text-primary-foreground">
                      Save note
                    </Button>
                    <Button onClick={() => { setAddingNote(false); setNewNote(''); }} variant="ghost" size="sm" className="rounded-pill text-xs font-body">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : fieldNotes.length < 5 ? (
              <button
                onClick={() => setAddingNote(true)}
                className="flex items-center gap-1.5 text-xs font-body transition-colors hover:opacity-80"
                style={{ color: atmosphere.accent }}
              >
                <Plus size={12} /> Add a note
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Trail Map Widget */}
      {trailMapVisible && (
        <TrailMap userId={userId} atmosphere={atmosphere} />
      )}
    </div>
  );
};

export default WidgetShelf;
