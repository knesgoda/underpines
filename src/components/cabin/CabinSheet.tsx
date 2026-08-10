import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The cabin's one modal primitive: a bottom sheet on mobile, a centered
 * panel on desktop. Plain CSS + a focus trap-lite (initial focus, Escape,
 * backdrop click) — the cabin chunk stays light and the styling stays in
 * cabin.css with everything else.
 */
const CabinSheet = ({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cabin-sheet-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`cabin-sheet panel ${wide ? 'cabin-sheet-wide' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="cabin-sheet-head">
          <h2 tabIndex={-1} ref={headingRef}>{title}</h2>
          <button type="button" className="cabin-sheet-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="cabin-sheet-body">{children}</div>
      </section>
    </div>
  );
};

export default CabinSheet;
