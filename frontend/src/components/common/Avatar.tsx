import clsx from 'clsx';

interface AvatarProps {
  /** Image source URL */
  src?: string | null;
  /** Alt text for the image */
  alt?: string;
  /** Fallback initials when no image */
  initials?: string;
  /** Size of the avatar */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Whether to show online status indicator */
  showStatus?: boolean;
  /** Online status */
  status?: 'online' | 'offline' | 'away' | 'busy';
  /** Additional className */
  className?: string;
}

/**
 * Avatar Component
 * Displays user avatar with fallback to initials
 * 
 * @example
 * <Avatar 
 *   src={user.avatar} 
 *   initials={`${user.firstName[0]}${user.lastName[0]}`}
 *   size="lg"
 *   showStatus
 *   status="online"
 * />
 */
const Avatar = ({
  src,
  alt = 'Avatar',
  initials = '?',
  size = 'md',
  showStatus = false,
  status = 'offline',
  className,
}: AvatarProps) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] ring-1',
    sm: 'w-8 h-8 text-xs ring-2',
    md: 'w-10 h-10 text-sm ring-2',
    lg: 'w-14 h-14 text-base ring-2',
    xl: 'w-20 h-20 text-xl ring-4',
    '2xl': 'w-28 h-28 text-2xl ring-4',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-4 h-4 ring-2',
    '2xl': 'w-5 h-5 ring-2',
  };

  const statusColorClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  return (
    <div className={clsx('relative inline-flex', className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={clsx(
            'rounded-full object-cover ring-white shadow-md',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={clsx(
            'rounded-full flex items-center justify-center font-semibold',
            'bg-gradient-to-br from-primary-500 to-primary-700 text-white ring-white shadow-md',
            sizeClasses[size]
          )}
        >
          {initials.substring(0, 2).toUpperCase()}
        </div>
      )}

      {showStatus && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full ring-white',
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

/**
 * AvatarGroup Component
 * Displays multiple avatars stacked
 */
export const AvatarGroup = ({
  children,
  max = 4,
  size = 'md',
}: {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps['size'];
}) => {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleAvatars = childArray.slice(0, max);
  const remainingCount = childArray.length - max;

  return (
    <div className="flex -space-x-3">
      {visibleAvatars}
      {remainingCount > 0 && (
        <Avatar initials={`+${remainingCount}`} size={size} />
      )}
    </div>
  );
};

export default Avatar;
