import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { PAGE_THEME_WIDGET, type PageTheme } from '@/hooks/useProfilePage';
import { toModuleRows } from '@/lib/pageModules';

/**
 * The generated `Json` type has no optional-property variant, so an interface
 * with `?` fields is not assignable to it however plain its values are. Widen
 * once here rather than casting at each write.
 */
const asJson = (theme: PageTheme): Json => ({ ...theme }) as Json;

/**
 * Write side of the page customizer.
 *
 * Phase 3c retired CabinEditDrawer and WidgetShelf along with the scene they
 * mostly edited, which left the profile with nothing to edit it — a hole,
 * given the decision to ungate customization for everyone. These mutations
 * back the replacement.
 *
 * Everything here writes to columns and tables that already exist, so the
 * customizer works before the Phase 3 migrations land.
 */

export interface ProfileBasics {
  display_name: string;
  mantra: string | null;
  bio: string | null;
  city: string | null;
  currently_type: string | null;
  currently_value: string | null;
  pinned_song_title: string | null;
  pinned_song_artist: string | null;
  pinned_song_preview_url: string | null;
  accent_color: string | null;
}

/** The blurb kinds a page can carry — MySpace's sections, renamed to ours. */
export const MODULE_TYPES = [
  { key: 'blurb', label: 'About me' },
  { key: 'interests', label: 'Interests' },
  { key: 'music', label: 'Music' },
  { key: 'films', label: 'Films & TV' },
  { key: 'books', label: 'Books' },
  { key: 'quote', label: 'A quote' },
] as const;

export type ModuleType = (typeof MODULE_TYPES)[number]['key'];

export interface PageModuleDraft {
  /** Absent on a module that has not been saved yet. */
  id?: string;
  widget_type: string;
  text: string;
}

export const useSaveBasics = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (basics: ProfileBasics) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...basics,
          // Empty strings are how a cleared input reads; store absence as null
          // so "unset" and "set to nothing" are the same state.
          mantra: basics.mantra || null,
          bio: basics.bio || null,
          city: basics.city || null,
          currently_value: basics.currently_value || null,
          pinned_song_title: basics.pinned_song_title || null,
          pinned_song_artist: basics.pinned_song_artist || null,
          pinned_song_preview_url: basics.pinned_song_preview_url || null,
        })
        .eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Your picture. Both fields are member-writable columns on `profiles`; the photo
 * itself lives in the owner-scoped `avatars` bucket.
 *
 * The boot state is invalidated too, so the top bar's avatar changes without a
 * reload — it reads from that one RPC rather than from the page queries.
 */
export const useSaveAvatar = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: { avatar_url?: string | null; default_avatar_key?: string }) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['boot-state'] });
    },
  });
};

export const useSavePageTheme = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (theme: PageTheme) => {
      // Upsert by hand: cabin_widgets has no unique constraint on
      // (user_id, widget_type), so onConflict has nothing to target.
      const { data: existing } = await supabase
        .from('cabin_widgets')
        .select('id')
        .eq('user_id', userId!)
        .eq('widget_type', PAGE_THEME_WIDGET)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from('cabin_widgets').update({ widget_data: asJson(theme) }).eq('id', existing.id)
        : await supabase.from('cabin_widgets').insert({
            user_id: userId!,
            widget_type: PAGE_THEME_WIDGET,
            widget_data: asJson(theme),
            position: -1, // sorts ahead of every real module; it is filtered out anyway
          });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-theme'] }),
  });
};

/** The page can hold twelve, matching `top_friends_position_range`. */
export const MAX_TOP_FRIENDS = 12;

/**
 * Replace someone's top friends with an ordered list of friend ids.
 *
 * Positions are 1-based and contiguous, which `top_friends_position_range`
 * requires. The unique constraint on (owner_id, position) is
 * DEFERRABLE INITIALLY DEFERRED specifically so this can delete and reinsert
 * inside one statement batch without the intermediate state — where two rows
 * momentarily share a position — tripping it.
 *
 * Unlike page modules, this deletes first. There is no content to lose: a top
 * friend is a reference and an ordinal, both reconstructible from the list the
 * editor is holding, and inserting first would mean twelve rows colliding on
 * positions with the twelve already there.
 */
export const useSaveTopFriends = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendIds: string[]) => {
      const { error: delError } = await supabase
        .from('top_friends')
        .delete()
        .eq('owner_id', userId!);
      if (delError) throw delError;

      const rows = friendIds.slice(0, MAX_TOP_FRIENDS).map((friend_id, i) => ({
        owner_id: userId!,
        friend_id,
        position: i + 1,
      }));
      if (rows.length === 0) return;

      const { error } = await supabase.from('top_friends').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['top-friends'] }),
  });
};

/**
 * Replace the whole module set in one go.
 *
 * The editor is a list you rearrange, so a diff would mean tracking moves and
 * deletes across renders for a table holding a handful of rows per user.
 * Replacing wholesale is honest about what it does and cheap at this size.
 *
 * Insert first, then delete the rows we started with. There is no transaction
 * available from the client, so one of the two can fail alone: inserting first
 * means a failure leaves the old modules intact, and a failed delete leaves
 * duplicates. Duplicated blurbs are an annoyance the user can fix in the
 * editor; the other order loses their writing.
 */
export const useSaveModules = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modules: PageModuleDraft[]) => {
      const rows = toModuleRows(userId!, modules);

      // Captured before writing, so the delete can never reach a new row — and
      // never the reserved theme row, which is excluded from the select.
      const { data: previous, error: readError } = await supabase
        .from('cabin_widgets')
        .select('id')
        .eq('user_id', userId!)
        .neq('widget_type', PAGE_THEME_WIDGET);
      if (readError) throw readError;

      if (rows.length > 0) {
        const { error } = await supabase.from('cabin_widgets').insert(rows);
        if (error) throw error;
      }

      const staleIds = (previous ?? []).map(r => r.id);
      if (staleIds.length > 0) {
        const { error } = await supabase.from('cabin_widgets').delete().in('id', staleIds);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['page-modules'] }),
  });
};
