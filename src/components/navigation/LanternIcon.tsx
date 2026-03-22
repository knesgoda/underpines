import { useNavigation } from '@/contexts/NavigationContext';

const LanternIcon = ({ active = false }: { active?: boolean }) => {
  const { hasUnreadNotifications } = useNavigation();

  return (
    <div className="relative">
      <span className={`text-lg transition-all ${
        active
          ? ''
          : hasUnreadNotifications
            ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'
            : 'opacity-50 grayscale'
      }`}>
        🏮
      </span>
      {hasUnreadNotifications && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
      )}
    </div>
  );
};

export default LanternIcon;
