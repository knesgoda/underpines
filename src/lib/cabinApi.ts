/**
 * Cabin client wrappers.
 *
 * Reads go through RLS; anything ownable — gifts, trades, cooking, event
 * rewards, guestbook writes — goes through SECURITY DEFINER RPCs that
 * re-check blocks, privacy modes, and rate limits server-side. This module
 * only shapes requests; it grants nothing.
 */
import { supabase } from '@/integrations/supabase/client';

// New tables aren't in the generated Database types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface CabinConfig {
  theme: string;
  biome_key: string | null;
  weather_source: 'account' | 'cabin_location' | 'default';
  cabin_location_key: string | null;
  location_visibility: 'hidden' | 'region' | 'cabin_location';
  window_style: string;
  curtain_state: 'open' | 'half' | 'closed';
  auto_lighting: boolean;
  ambient_audio: boolean;
  presence_visible: boolean;
  visibility: 'everyone' | 'friends' | 'only_me';
  guestbook_mode: 'everyone' | 'friends' | 'only_me' | 'off';
  notes_mode: 'everyone' | 'friends' | 'off';
  gifts_mode: 'everyone' | 'friends' | 'off';
  knock_mode: 'everyone' | 'friends' | 'off';
  pets_visibility: 'everyone' | 'friends' | 'only_me';
}

export interface CabinPlacementView {
  id: string;
  zone: string;
  slot: number;
  visibility: string;
  user_item_id: string;
  item_key: string;
  custom_name: string | null;
  acquired_at: string;
  acquisition_source: string;
  provenance_note: string | null;
  gifted_by_name: string | null;
  name: string;
  emoji: string;
  category: string;
  description: string | null;
  rarity: string;
}

export interface CabinPetView {
  id: string;
  name: string;
  animal_type: string;
  sprite_cache: Record<string, string>;
  is_memorial: boolean;
  is_resting: boolean;
  created_at: string;
  personality_traits: string[];
  story: string | null;
  memorial_years: string | null;
  can_interact: boolean;
}

export interface CabinView {
  found: boolean;
  restricted?: boolean;
  is_owner?: boolean;
  relationship?: 'self' | 'friends' | 'member';
  profile?: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    default_avatar_key: string | null;
    bio?: string | null;
    mantra?: string | null;
    created_at?: string | null;
    atmosphere?: string | null;
    biome?: string | null;
    cabin_mood?: string | null;
    zip_code?: string | null;
    country_code?: string | null;
  };
  cabin?: CabinConfig;
  weather_hint?: { lat?: number; lng?: number; location_key?: string } | null;
  presence?: 'active' | 'today' | 'away' | 'hidden';
  placements?: CabinPlacementView[];
  pets?: CabinPetView[];
  permissions?: {
    sign_guestbook: boolean;
    leave_note: boolean;
    knock: boolean;
    leave_gift: boolean;
    trade: boolean;
  };
}

export interface ItemDefinition {
  key: string;
  name: string;
  description: string | null;
  category: string;
  emoji: string;
  valid_zones: string[];
  rarity: string;
  tradable: boolean;
  giftable: boolean;
  availability: string;
}

export interface InventoryItem {
  id: string;
  item_key: string;
  acquired_at: string;
  acquisition_source: string;
  gifted_by: string | null;
  provenance_note: string | null;
  custom_name: string | null;
  event_key: string | null;
}

export interface IngredientDefinition {
  key: string;
  name: string;
  emoji: string;
  category: string;
  rarity: string;
  giftable: boolean;
}

export interface PantryRow {
  ingredient_key: string;
  quantity: number;
}

export interface RecipeRow {
  key: string;
  name: string;
  description: string | null;
  emoji: string;
  required: string[];
  optional: string[];
  rarity: string;
  secret: boolean;
}

export interface CookbookRow {
  recipe_key: string;
  discovered_at: string;
  times_cooked: number;
}

export interface GuestbookEntry {
  id: string;
  owner_id: string;
  author_id: string;
  content: string;
  hidden: boolean;
  created_at: string;
  author?: { handle: string; display_name: string; avatar_url: string | null; default_avatar_key: string | null } | null;
}

export interface CabinNote {
  id: string;
  author_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  author?: { handle: string; display_name: string } | null;
}

export interface PorchGift {
  id: string;
  owner_id: string;
  sender_id: string;
  item_key: string | null;
  ingredient_key: string | null;
  quantity: number;
  message: string | null;
  status: 'on_porch' | 'kept' | 'tossed';
  created_at: string;
  sender?: { handle: string; display_name: string } | null;
}

export interface TradeItemRow {
  id: string;
  side: 'proposer' | 'recipient';
  ingredient_key: string | null;
  quantity: number;
  user_item_id: string | null;
}

export interface TradeRow {
  id: string;
  proposer_id: string;
  recipient_id: string;
  status: 'open' | 'accepted' | 'declined' | 'cancelled';
  message: string | null;
  created_at: string;
  items?: TradeItemRow[];
  proposer?: { handle: string; display_name: string } | null;
  recipient?: { handle: string; display_name: string } | null;
}

export interface HistoryRow {
  id: string;
  kind: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface CabinEventResult {
  event: {
    key: string;
    kind: 'discovery' | 'sighting' | 'keepsake';
    name: string;
    description: string | null;
    emoji: string;
    secret: boolean;
    reward: { type: 'item' | 'ingredient'; item_key?: string; ingredient_key?: string; quantity?: number } | null;
  } | null;
}

interface RpcResult {
  success: boolean;
  error?: string;
  [k: string]: unknown;
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function getCabinView(handle: string): Promise<CabinView> {
  const { data, error } = await db.rpc('get_cabin_view', { _handle: handle });
  if (error) throw error;
  return (data ?? { found: false }) as CabinView;
}

export async function listItemDefinitions(): Promise<ItemDefinition[]> {
  const { data, error } = await db
    .from('cabin_item_definitions')
    .select('key, name, description, category, emoji, valid_zones, rarity, tradable, giftable, availability')
    .order('sort');
  if (error) throw error;
  return data ?? [];
}

export async function listInventory(): Promise<InventoryItem[]> {
  const { data, error } = await db
    .from('user_cabin_items')
    .select('id, item_key, acquired_at, acquisition_source, gifted_by, provenance_note, custom_name, event_key')
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listIngredientDefinitions(): Promise<IngredientDefinition[]> {
  const { data, error } = await db
    .from('cabin_ingredient_definitions')
    .select('key, name, emoji, category, rarity, giftable')
    .order('key');
  if (error) throw error;
  return data ?? [];
}

export async function listPantry(): Promise<PantryRow[]> {
  const { data, error } = await db
    .from('cabin_pantry')
    .select('ingredient_key, quantity')
    .gt('quantity', 0);
  if (error) throw error;
  return data ?? [];
}

export async function listRecipes(): Promise<RecipeRow[]> {
  const { data, error } = await db
    .from('cabin_recipes')
    .select('key, name, description, emoji, required, optional, rarity, secret');
  if (error) throw error;
  return data ?? [];
}

export async function listCookbook(): Promise<CookbookRow[]> {
  const { data, error } = await db
    .from('cabin_recipe_book')
    .select('recipe_key, discovered_at, times_cooked')
    .order('discovered_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

const MINI_PROFILE = 'id, handle, display_name, avatar_url, default_avatar_key';

async function attachProfiles<T>(rows: T[], idField: keyof T, into: string): Promise<T[]> {
  const ids = [...new Set(rows.map(r => r[idField]).filter(Boolean))] as string[];
  if (ids.length === 0) return rows;
  const { data } = await supabase.from('profiles').select(MINI_PROFILE).in('id', ids);
  const byId = new Map((data ?? []).map(p => [p.id, p]));
  return rows.map(r => ({ ...r, [into]: byId.get(r[idField] as string) ?? null }));
}

export async function listGuestbook(ownerId: string): Promise<GuestbookEntry[]> {
  const { data, error } = await db
    .from('cabin_guestbook_entries')
    .select('id, owner_id, author_id, content, hidden, created_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return attachProfiles(data ?? [], 'author_id', 'author');
}

export async function listNotes(): Promise<CabinNote[]> {
  const { data, error } = await db
    .from('cabin_notes')
    .select('id, owner_id, author_id, content, is_read, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  const uid = (await supabase.auth.getUser()).data.user?.id;
  const mine = (data ?? []).filter((n: { owner_id: string }) => n.owner_id === uid);
  return attachProfiles(mine, 'author_id', 'author');
}

export async function listPorchGifts(status?: 'on_porch'): Promise<PorchGift[]> {
  let q = db
    .from('cabin_porch_gifts')
    .select('id, owner_id, sender_id, item_key, ingredient_key, quantity, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  const uid = (await supabase.auth.getUser()).data.user?.id;
  const mine = (data ?? []).filter((g: { owner_id: string }) => g.owner_id === uid);
  return attachProfiles(mine, 'sender_id', 'sender');
}

export async function listTrades(): Promise<TradeRow[]> {
  const { data, error } = await db
    .from('cabin_trades')
    .select('id, proposer_id, recipient_id, status, message, created_at')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  const trades: TradeRow[] = data ?? [];
  if (trades.length === 0) return [];
  const { data: items } = await db
    .from('cabin_trade_items')
    .select('id, trade_id, side, ingredient_key, quantity, user_item_id')
    .in('trade_id', trades.map(t => t.id));
  const byTrade = new Map<string, TradeItemRow[]>();
  for (const it of (items ?? []) as (TradeItemRow & { trade_id: string })[]) {
    const list = byTrade.get(it.trade_id) ?? [];
    list.push(it);
    byTrade.set(it.trade_id, list);
  }
  let out = trades.map(t => ({ ...t, items: byTrade.get(t.id) ?? [] }));
  out = await attachProfiles(out, 'proposer_id', 'proposer');
  out = await attachProfiles(out, 'recipient_id', 'recipient');
  return out;
}

export async function listHistory(): Promise<HistoryRow[]> {
  const { data, error } = await db
    .from('cabin_history')
    .select('id, kind, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// ── Writes (all via RPC or owner-scoped RLS) ────────────────────────────────

const rpc = async (name: string, args: Record<string, unknown>): Promise<RpcResult> => {
  const { data, error } = await db.rpc(name, args);
  if (error) throw error;
  return (data ?? { success: false, error: 'empty_response' }) as RpcResult;
};

export const signGuestbook = (ownerId: string, content: string) =>
  rpc('cabin_sign_guestbook', { _owner: ownerId, _content: content });

export const leaveNote = (ownerId: string, content: string) =>
  rpc('cabin_leave_note', { _owner: ownerId, _content: content });

export const knock = (ownerId: string) => rpc('cabin_knock', { _owner: ownerId });

export const leaveGift = (
  ownerId: string,
  gift: { item_key?: string; ingredient_key?: string; quantity?: number; message?: string },
) =>
  rpc('cabin_leave_gift', {
    _owner: ownerId,
    _item_key: gift.item_key ?? null,
    _ingredient_key: gift.ingredient_key ?? null,
    _qty: gift.quantity ?? 1,
    _message: gift.message ?? null,
  });

export const respondGift = (giftId: string, keep: boolean) =>
  rpc('cabin_respond_gift', { _gift_id: giftId, _keep: keep });

export const cook = (ingredients: string[]) => rpc('cabin_cook', { _ingredients: ingredients });

export type TradeLine = { ingredient_key: string; quantity: number } | { user_item_id: string };

export const proposeTrade = (recipientId: string, message: string, offer: TradeLine[], ask: TradeLine[]) =>
  rpc('cabin_propose_trade', { _recipient: recipientId, _message: message, _offer: offer, _ask: ask });

export const respondTrade = (tradeId: string, accept: boolean) =>
  rpc('cabin_respond_trade', { _trade_id: tradeId, _accept: accept });

export const cancelTrade = (tradeId: string) => rpc('cabin_cancel_trade', { _trade_id: tradeId });

export async function rollEvent(
  biome: string, weather: string, slot: string, season: string,
): Promise<CabinEventResult> {
  const { data, error } = await db.rpc('cabin_roll_event', {
    _biome: biome, _weather: weather, _time_of_day: slot, _season: season,
  });
  if (error) throw error;
  return (data ?? { event: null }) as CabinEventResult;
}

export async function updateCabin(userId: string, patch: Partial<CabinConfig>): Promise<void> {
  const { error } = await db.from('cabins').update(patch).eq('user_id', userId);
  if (error) throw error;
}

/** Owner-only; RLS + the placement trigger enforce ownership and zone rules. */
export async function placeItem(
  userId: string, userItemId: string, zone: string, slot = 0,
): Promise<{ error?: string }> {
  const { error } = await db.from('cabin_placements').upsert(
    { cabin_user_id: userId, user_item_id: userItemId, zone, slot },
    { onConflict: 'user_item_id' },
  );
  if (error) {
    if (String(error.message).includes('placement_zone_invalid')) return { error: 'zone_invalid' };
    if (String(error.message).includes('duplicate')) return { error: 'spot_taken' };
    throw error;
  }
  return {};
}

export async function removePlacement(userItemId: string): Promise<void> {
  const { error } = await db.from('cabin_placements').delete().eq('user_item_id', userItemId);
  if (error) throw error;
}

export async function markNotesRead(): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return;
  await db.from('cabin_notes').update({ is_read: true }).eq('owner_id', uid).eq('is_read', false);
}

export async function updatePet(
  petId: string,
  patch: {
    personality_traits?: string[];
    story?: string | null;
    visibility?: string;
    interaction_mode?: string;
    memorial_years?: string | null;
    is_memorial?: boolean;
    is_resting?: boolean;
  },
): Promise<void> {
  const { error } = await db.from('pine_pets').update(patch).eq('id', petId);
  if (error) throw error;
}
