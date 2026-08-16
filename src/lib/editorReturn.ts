/**
 * Remembering where someone came from before they opened "Edit my page".
 *
 * The editor is reached from several places (Settings, My Page, the friends
 * module), so a bare history step is unreliable. Entry points hand over the
 * route they were on plus the scroll offset; the editor's back link uses that
 * to put the person back exactly where they tapped.
 */
export type EditorReturn = { from: string; scrollY: number };

export const editorReturnState = (): { editorReturn: EditorReturn } => ({
  editorReturn: {
    from: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    scrollY: typeof window === 'undefined' ? 0 : window.scrollY,
  },
});

export const readEditorReturn = (state: unknown): EditorReturn | null => {
  const candidate = (state as { editorReturn?: EditorReturn } | null)?.editorReturn;
  if (!candidate || typeof candidate.from !== 'string') return null;
  return { from: candidate.from, scrollY: Number(candidate.scrollY) || 0 };
};

/**
 * Browsers restore scroll on POP navigations, but not when we push the origin
 * route ourselves (a direct link, a refresh). Nudging twice covers the frame
 * where the destination is still laying out.
 */
export const restoreScroll = (scrollY: number) => {
  if (typeof window === 'undefined' || scrollY <= 0) return;
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY);
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  });
};
