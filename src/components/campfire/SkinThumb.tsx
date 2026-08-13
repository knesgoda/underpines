import type { MessengerSkin } from '@/contexts/ThemeContext';

/**
 * Tiny static preview of a messenger skin: title bar, two bubbles and the
 * accent send chip. Palette comes from `.skin-thumb--<skin>` in
 * messenger-skins.css so a thumb shows its own skin regardless of the
 * currently selected one.
 */
const SkinThumb = ({ skin }: { skin: MessengerSkin }) => (
  <span className={`skin-thumb skin-thumb--${skin}`} aria-hidden="true">
    <span className="skin-thumb-title" />
    <span className="skin-thumb-body">
      <span className="skin-thumb-bubble" />
      <span className="skin-thumb-bubble is-mine" />
    </span>
    <span className="skin-thumb-compose">
      <span className="skin-thumb-input" />
      <span className="skin-thumb-send" />
    </span>
  </span>
);

export default SkinThumb;
