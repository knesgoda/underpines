import type { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import '@/styles/messenger-skins.css';

/**
 * Applies the user's chosen messenger skin to everything beneath it, and is
 * the only place that imports the skin stylesheet — so those styles are split
 * into the messenger route's chunk instead of the entry bundle.
 *
 * `display: contents` means this wrapper adds no box of its own, so it can sit
 * around the current messenger markup without changing its layout while the
 * handoff screens are ported in.
 */
export const MessengerSkinScope = ({ children }: { children: ReactNode }) => {
  const { skin } = useTheme();
  return (
    <div className={`skin-${skin}`} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};

export default MessengerSkinScope;
