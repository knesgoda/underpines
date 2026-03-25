import { useNavigation } from '@/contexts/NavigationContext';

interface LanternIconProps {
  className?: string;
  size?: number;
}

const LanternIcon = ({ className, size = 22 }: LanternIconProps) => {
  const { unreadCount } = useNavigation();

  const src =
    unreadCount >= 5
      ? '/icons/lantern_hot.png'
      : unreadCount >= 1
        ? '/icons/lantern_active.png'
        : '/icons/lantern_inactive.png';

  return (
    <img
      src={src}
      alt="Lantern notifications"
      width={size}
      height={size}
      className={className}
    />
  );
};

export default LanternIcon;
