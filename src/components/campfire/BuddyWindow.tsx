import { useState } from 'react';
import UserAvatar from '@/components/UserAvatar';
import { useNavigation } from '@/contexts/NavigationContext';
import { useViewerProfile } from '@/hooks/queries';
import { formatTimeAgo } from '@/lib/time';

export interface BuddyItem {
  id: string;
  name: string;
  campfire_type: string;
  is_embers: boolean | null;
  expires_at: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  otherUserId?: string;
  daysSinceLastMessage?: number;
}

const timeLeft = (expiresAt: string | null): string => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const h = Math.floor(diff / 3600000);
  return h >= 1 ? `${h}h left` : `${Math.floor(diff / 60000)}m left`;
};

/**
 * The buddy list, in the handoff's window chrome.
 *
 * Conversations are grouped by lifecycle rather than sorted flat, which is what
 * the era's clients did and what makes the Idle and Expiring states legible
 * instead of just being rows that look the same as every other row.
 */
export const BuddyWindow = ({
  items,
  selectedId,
  onSelect,
  onNudge,
  onNew,
  query,
  setQuery,
}: {
  items: BuddyItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNudge: (id: string) => void;
  onNew: () => void;
  query: string;
  setQuery: (q: string) => void;
}) => {
  const { onlineIds } = useNavigation();
  const { data: me } = useViewerProfile();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const expiring = items.filter(c => c.campfire_type === 'flicker');
  const idle = items.filter(c => c.campfire_type !== 'flicker' && c.is_embers);
  const active = items.filter(c => c.campfire_type !== 'flicker' && !c.is_embers);

  const groups: { key: string; label: string; rows: BuddyItem[] }[] = [
    { key: 'active', label: 'Available', rows: active },
    { key: 'expiring', label: 'Expiring soon', rows: expiring },
    { key: 'idle', label: 'Idle', rows: idle },
  ];

  const toggle = (key: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div className="buddy-window">
      <div className="window-title">
        <b>Buddy List</b>
        <span className="skin-mark" aria-hidden="true">✦</span>
        <span className="window-controls" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>
      </div>

      <div className="self-card">
        <UserAvatar
          avatarUrl={me?.avatar_url ?? null}
          defaultAvatarKey={me?.default_avatar_key ?? null}
          displayName={me?.display_name ?? ''}
          size={38}
        />
        <div>
          <b>{me?.display_name ?? '—'}</b>
          <small>Available</small>
        </div>
      </div>

      <div className="buddy-tools">
        <button type="button" onClick={onNew}>New</button>
        <button type="button" onClick={() => setQuery('')}>All</button>
        <button type="button" onClick={() => setQuery('')}>Sort</button>
        <button type="button" onClick={onNew}>Add</button>
      </div>

      <label className="buddy-search">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Find a conversation"
          aria-label="Find a conversation"
        />
      </label>

      <div className="buddy-group">
        {groups.map(group => {
          if (group.rows.length === 0) return null;
          const isCollapsed = collapsed.has(group.key);
          return (
            <div key={group.key}>
              <button
                type="button"
                className="group-label"
                onClick={() => toggle(group.key)}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? '▸' : '▾'} {group.label} ({group.rows.length})
              </button>

              {!isCollapsed && group.rows.map(c => {
                const online = c.otherUserId ? onlineIds.has(c.otherUserId) : false;
                const expiry = timeLeft(c.expires_at);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`buddy ${selectedId === c.id ? 'active' : ''}`}
                    onClick={() => onSelect(c.id)}
                  >
                    <span className="buddy-presence" aria-hidden="true">{online ? '●' : '○'}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{c.name}</b>
                      <small className="block truncate">
                        {group.key === 'idle' && c.daysSinceLastMessage
                          ? `Quiet for ${c.daysSinceLastMessage} days`
                          : expiry
                            ? expiry
                            : c.lastMessage || (c.lastMessageTime ? formatTimeAgo(c.lastMessageTime) : 'No messages yet')}
                      </small>
                    </span>
                    {group.key === 'idle' && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: 'var(--msg-accent)' }}
                        onClick={e => { e.stopPropagation(); onNudge(c.id); }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onNudge(c.id); } }}
                      >
                        Nudge
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="px-3 py-6 text-center text-xs" style={{ color: 'var(--msg-text)', opacity: 0.6 }}>
            No conversations yet.
          </p>
        )}
      </div>

      <div className="buddy-footer">
        <button type="button" onClick={onNew}>New</button>
        <button type="button" onClick={onNew}>Invite</button>
        <button type="button" onClick={() => setQuery('')}>Clear</button>
      </div>
    </div>
  );
};

export default BuddyWindow;
