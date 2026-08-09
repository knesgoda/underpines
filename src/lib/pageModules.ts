import type { PageModuleDraft } from '@/hooks/usePageEditor';

/**
 * List operations for the page-module editor, kept out of the component so
 * they can be tested without a DOM or a fake Supabase.
 *
 * Reordering is where this kind of editor usually goes wrong — an off-by-one
 * at either end silently drops or duplicates a blurb — so the bounds are
 * explicit and the functions are pure.
 */

export const addModule = (modules: PageModuleDraft[], widget_type: string): PageModuleDraft[] => [
  ...modules,
  { widget_type, text: '' },
];

export const updateModule = (
  modules: PageModuleDraft[],
  index: number,
  patch: Partial<PageModuleDraft>,
): PageModuleDraft[] => modules.map((m, i) => (i === index ? { ...m, ...patch } : m));

export const removeModule = (modules: PageModuleDraft[], index: number): PageModuleDraft[] =>
  modules.filter((_, i) => i !== index);

/**
 * Swap with the neighbour `delta` away. Out of range is a no-op, not a throw.
 *
 * Generic because the top-friends editor reorders the same way and there is no
 * reason for two implementations of the operation most likely to drop an item.
 */
export const moveItem = <T,>(items: T[], index: number, delta: number): T[] => {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;

  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

export const moveModule = (
  modules: PageModuleDraft[],
  index: number,
  delta: number,
): PageModuleDraft[] => moveItem(modules, index, delta);

/**
 * The rows a save writes: blank blurbs dropped, text trimmed, and `position`
 * renumbered from the surviving order rather than the editor's indices — so a
 * gap left by a dropped module never becomes a gap in the page.
 */
export const toModuleRows = (userId: string, modules: PageModuleDraft[]) =>
  modules
    .filter(m => m.text.trim())
    .map((m, i) => ({
      user_id: userId,
      widget_type: m.widget_type,
      widget_data: { text: m.text.trim() },
      position: i,
    }));
