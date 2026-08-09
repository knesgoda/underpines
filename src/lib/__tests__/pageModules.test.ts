import { describe, it, expect } from 'vitest';
import { addModule, moveModule, removeModule, toModuleRows, updateModule } from '@/lib/pageModules';
import type { PageModuleDraft } from '@/hooks/usePageEditor';

const draft = (widget_type: string, text: string): PageModuleDraft => ({ widget_type, text });

const three = (): PageModuleDraft[] => [
  draft('blurb', 'one'),
  draft('music', 'two'),
  draft('books', 'three'),
];

describe('addModule', () => {
  it('appends an empty module of the requested kind', () => {
    expect(addModule([], 'blurb')).toEqual([{ widget_type: 'blurb', text: '' }]);
  });

  it('does not mutate the input', () => {
    const before = three();
    addModule(before, 'quote');
    expect(before).toHaveLength(3);
  });
});

describe('updateModule', () => {
  it('patches only the module at the index', () => {
    const next = updateModule(three(), 1, { text: 'changed' });
    expect(next.map(m => m.text)).toEqual(['one', 'changed', 'three']);
    expect(next[1].widget_type).toBe('music');
  });

  it('ignores an index that is not there', () => {
    expect(updateModule(three(), 9, { text: 'nope' })).toEqual(three());
  });
});

describe('removeModule', () => {
  it('drops the module at the index and keeps order', () => {
    expect(removeModule(three(), 0).map(m => m.text)).toEqual(['two', 'three']);
    expect(removeModule(three(), 2).map(m => m.text)).toEqual(['one', 'two']);
  });
});

describe('moveModule', () => {
  it('swaps with the neighbour', () => {
    expect(moveModule(three(), 1, -1).map(m => m.text)).toEqual(['two', 'one', 'three']);
    expect(moveModule(three(), 1, 1).map(m => m.text)).toEqual(['one', 'three', 'two']);
  });

  /** Both ends, because this is exactly where a list editor drops an item. */
  it('is a no-op past either end', () => {
    expect(moveModule(three(), 0, -1)).toEqual(three());
    expect(moveModule(three(), 2, 1)).toEqual(three());
    expect(moveModule(three(), -1, 1)).toEqual(three());
    expect(moveModule(three(), 3, -1)).toEqual(three());
  });

  it('never loses or duplicates a module', () => {
    const moved = moveModule(three(), 0, 1);
    expect(moved).toHaveLength(3);
    expect(new Set(moved.map(m => m.text))).toEqual(new Set(['one', 'two', 'three']));
  });
});

describe('toModuleRows', () => {
  it('trims text and numbers positions from zero', () => {
    const rows = toModuleRows('u1', [draft('blurb', '  hello  '), draft('music', 'a band')]);
    expect(rows).toEqual([
      { user_id: 'u1', widget_type: 'blurb', widget_data: { text: 'hello' }, position: 0 },
      { user_id: 'u1', widget_type: 'music', widget_data: { text: 'a band' }, position: 1 },
    ]);
  });

  /** A blank module in the middle must not leave a hole in the numbering. */
  it('drops empty modules and renumbers what is left', () => {
    const rows = toModuleRows('u1', [
      draft('blurb', 'kept'),
      draft('music', '   '),
      draft('books', 'also kept'),
    ]);
    expect(rows.map(r => r.position)).toEqual([0, 1]);
    expect(rows.map(r => r.widget_type)).toEqual(['blurb', 'books']);
  });

  it('returns nothing when every module is blank', () => {
    expect(toModuleRows('u1', [draft('blurb', ''), draft('music', '  ')])).toEqual([]);
  });
});
