/**
 * Cabin data hooks — react-query bindings over cabinApi.
 *
 * The page reads one big `get_cabin_view` payload (the get_boot_state
 * pattern: one round-trip, no waterfalls), then the owner-only surfaces
 * (inventory, pantry, mailbox, history) load lazily when their sheet opens.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/cabinApi';

export const useCabinView = (handle: string | undefined) =>
  useQuery({
    queryKey: ['cabin-view', handle],
    enabled: !!handle,
    queryFn: () => api.getCabinView(handle!),
  });

export const useItemDefinitions = (enabled: boolean) =>
  useQuery({
    queryKey: ['cabin-item-defs'],
    enabled,
    staleTime: 30 * 60 * 1000,
    queryFn: api.listItemDefinitions,
  });

export const useInventory = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-inventory'], enabled, queryFn: api.listInventory });

export const useIngredientDefinitions = (enabled: boolean) =>
  useQuery({
    queryKey: ['cabin-ingredient-defs'],
    enabled,
    staleTime: 30 * 60 * 1000,
    queryFn: api.listIngredientDefinitions,
  });

export const usePantry = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-pantry'], enabled, queryFn: api.listPantry });

export const useRecipes = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-recipes'], enabled, queryFn: api.listRecipes });

export const useCookbook = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-cookbook'], enabled, queryFn: api.listCookbook });

export const useGuestbook = (ownerId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['cabin-guestbook', ownerId],
    enabled: enabled && !!ownerId,
    queryFn: () => api.listGuestbook(ownerId!),
  });

export const useCabinNotes = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-notes'], enabled, queryFn: api.listNotes });

export const usePorchGifts = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-porch-gifts'], enabled, queryFn: () => api.listPorchGifts('on_porch') });

export const useTrades = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-trades'], enabled, queryFn: api.listTrades });

export const useCabinHistory = (enabled: boolean) =>
  useQuery({ queryKey: ['cabin-history'], enabled, queryFn: api.listHistory });

/** Invalidate the caches a cabin mutation may have touched. */
export const useCabinInvalidate = () => {
  const qc = useQueryClient();
  return (keys: string[]) => {
    for (const key of keys) qc.invalidateQueries({ queryKey: [key] });
  };
};

export const useUpdateCabin = (userId: string | undefined, handle: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<api.CabinConfig>) => api.updateCabin(userId!, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cabin-view', handle] }),
  });
};
