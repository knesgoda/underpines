import { useNavigation } from '@/contexts/NavigationContext';

const LanternIcon = ({ active = false }: { active?: boolean }) => {
  const { unreadCount } = useNavigation();

  // Glow states based on unread count
  const getGlowClass = () => {
    if (unreadCount === 0) return '';
    if (unreadCount <= 5) return 'shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    return 'shadow-[0_0_16px_rgba(245,158,11,0.6)] animate-[lantern-pulse_3s_ease-in-out_infinite]';
  };

  return (
    <div className="relative">
      <span className={`text-lg transition-all ${active ? '' : unreadCount === 0 ? 'opacity-50 grayscale' : ''}`}>
        🏮
      </span>
      {unreadCount > 0 && (
        <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-glow ${getGlowClass()}`} />
      )}
    </div>
  );
};

export default LanternIcon;
