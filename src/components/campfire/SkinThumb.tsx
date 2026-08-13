import type { MessengerSkin } from '@/contexts/ThemeContext';

/**
 * Tiny static preview of a messenger skin. Palette comes from
 * `.skin-thumb--<skin>` in messenger-skins.css so a thumb shows its own skin
 * regardless of the currently selected one. The retro skins draw their real
 * transcript shapes: flower + nick lines for ICU, a buddy tree with blue/red
 * screen-name lines for Bullseye, and a "says:" pair for Emessen.
 */
const SkinThumb = ({ skin }: { skin: MessengerSkin }) => (
  <span className={`skin-thumb skin-thumb--${skin}`} aria-hidden="true">
    <span className="skin-thumb-title" />
    <span className="skin-thumb-body">
      {skin === 'pines' ? (
        <>
          <span className="skin-thumb-bubble" />
          <span className="skin-thumb-bubble is-mine" />
        </>
      ) : skin === 'icu' ? (
        <>
          <span className="skin-thumb-row"><i className="skin-thumb-dot" /><i className="skin-thumb-line is-them" /></span>
          <span className="skin-thumb-row"><i className="skin-thumb-dot" /><i className="skin-thumb-line is-mine" /></span>
        </>
      ) : skin === 'bullseye' ? (
        <>
          <span className="skin-thumb-row"><i className="skin-thumb-line is-header" /></span>
          <span className="skin-thumb-row is-indent"><i className="skin-thumb-line is-them" /></span>
          <span className="skin-thumb-row is-indent"><i className="skin-thumb-line is-mine" /></span>
        </>
      ) : (
        <>
          <span className="skin-thumb-row"><i className="skin-thumb-line is-says" /></span>
          <span className="skin-thumb-row is-indent"><i className="skin-thumb-line is-text" /></span>
        </>
      )}
    </span>
    <span className="skin-thumb-compose">
      <span className="skin-thumb-input" />
      <span className="skin-thumb-send" />
    </span>
  </span>
);

export default SkinThumb;
