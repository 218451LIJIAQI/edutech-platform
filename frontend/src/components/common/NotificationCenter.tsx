import { useState, useEffect, useCallback, useId, useRef } from 'react';
import clientLogger from '@/utils/logger';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserPlus,
  BookOpen,
  CreditCard,
  Star,
  ShieldAlert,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';
import notificationService, { type Notification } from '@/services/notification.service';
import { formatDistanceToNow, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility } from '@/hooks';

/**
 * Returns the icon that matches the notification type.
 */
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'welcome':
      return <UserPlus className="w-5 h-5 text-blue-600" />;
    case 'enrollment':
      return <BookOpen className="w-5 h-5 text-indigo-600" />;
    case 'payment':
      return <CreditCard className="w-5 h-5 text-emerald-600" />;
    case 'review':
      return <Star className="w-5 h-5 text-amber-500" />;
    case 'report':
      return <ShieldAlert className="w-5 h-5 text-red-600" />;
    case 'verification':
      return <BadgeCheck className="w-5 h-5 text-green-600" />;
    case 'progress':
      return <TrendingUp className="w-5 h-5 text-primary-600" />;
    default:
      return <Bell className="w-5 h-5 text-gray-600" />;
  }
};

/**
 * Safely formats notification creation time.
 */
const formatNotificationTime = (createdAt: Notification['createdAt']) => {
  const date = new Date(createdAt);

  return isValid(date) ? formatDistanceToNow(date, { addSuffix: true }) : 'Recently';
};

/**
 * Notification Center Component
 * Displays user notifications in an accessible dropdown panel.
 */
const NotificationCenter = () => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const markAllButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);
  const [activeNotificationActionId, setActiveNotificationActionId] = useState<string | null>(null);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  useOverlayAccessibility({
    isOpen,
    containerRef: panelRef,
    initialFocusRef: unreadCount > 0 ? markAllButtonRef : panelRef,
    returnFocusRef: triggerRef,
    onClose: closePanel,
    trapFocus: true,
    lockBodyScroll: false,
  });

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      clientLogger.error('Failed to fetch unread count:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await notificationService.getNotifications({ limit: 10 });
      setNotifications(data.items ?? []);
    } catch (error) {
      clientLogger.error('Failed to fetch notifications:', error);
      toast.error(extractErrorMessage(error, 'Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUnreadCount();

    const intervalId = window.setInterval(() => {
      void fetchUnreadCount();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      const notification = notifications.find((item) => item.id === id);

      if (!notification || notification.isRead || activeNotificationActionId) {
        return;
      }

      setActiveNotificationActionId(id);

      try {
        await notificationService.markAsRead(id);

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
          )
        );

        setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
      } catch (error) {
        clientLogger.error('Failed to mark notification as read:', error);
        toast.error(extractErrorMessage(error, 'Failed to mark notification as read'));
      } finally {
        setActiveNotificationActionId(null);
      }
    },
    [notifications, activeNotificationActionId]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (isMarkingAllAsRead || unreadCount === 0) {
      return;
    }

    setIsMarkingAllAsRead(true);

    try {
      await notificationService.markAllAsRead();

      setNotifications((currentNotifications) =>
        currentNotifications.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      clientLogger.error('Failed to mark all notifications as read:', error);
      toast.error(extractErrorMessage(error, 'Failed to mark all notifications as read'));
    } finally {
      setIsMarkingAllAsRead(false);
    }
  }, [isMarkingAllAsRead, unreadCount]);

  const handleDelete = useCallback(
    async (id: string) => {
      const notification = notifications.find((item) => item.id === id);

      if (!notification || activeNotificationActionId) {
        return;
      }

      setActiveNotificationActionId(id);

      try {
        await notificationService.deleteNotification(id);

        setNotifications((currentNotifications) =>
          currentNotifications.filter((item) => item.id !== id)
        );

        if (!notification.isRead) {
          setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
        }

        toast.success('Notification deleted');
      } catch (error) {
        clientLogger.error('Failed to delete notification:', error);
        toast.error(extractErrorMessage(error, 'Failed to delete notification'));
      } finally {
        setActiveNotificationActionId(null);
      }
    },
    [notifications, activeNotificationActionId]
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((currentOpen) => !currentOpen)}
        className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={panelId}
      >
        <Bell className="h-6 w-6" aria-hidden="true" />

        {unreadCount > 0 && (
          <span
            className="absolute right-0 top-0 inline-flex -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-bold leading-none text-white"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 m-0 appearance-none border-0 bg-transparent p-0"
            onClick={closePanel}
            tabIndex={-1}
            aria-label="Close notifications panel"
          />

          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            tabIndex={-1}
            className="absolute right-0 z-50 mt-2 flex max-h-[600px] w-96 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl focus:outline-none"
          >
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <h3 id={`${panelId}-title`} className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <button
                  ref={markAllButtonRef}
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                  className="flex items-center space-x-1 text-sm text-primary-600 transition-colors hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCheck className="h-4 w-4" aria-hidden="true" />
                  <span>{isMarkingAllAsRead ? 'Marking...' : 'Mark all as read'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8" role="status">
                  <div className="spinner" aria-hidden="true" />
                  <span className="sr-only">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Bell className="mb-2 h-12 w-12 text-gray-300" aria-hidden="true" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const isActionLoading = activeNotificationActionId === notification.id;

                    return (
                      <div
                        key={notification.id}
                        className={`p-4 transition-colors hover:bg-gray-50 ${
                          !notification.isRead ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                            {getNotificationIcon(notification.type)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>

                              <div className="ml-2 flex items-center space-x-1">
                                {!notification.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => void handleMarkAsRead(notification.id)}
                                    disabled={isActionLoading}
                                    className="p-1 text-gray-400 transition-colors hover:text-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Mark as read"
                                    aria-label={`Mark "${notification.title}" as read`}
                                  >
                                    <Check className="h-4 w-4" aria-hidden="true" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => void handleDelete(notification.id)}
                                  disabled={isActionLoading}
                                  className="p-1 text-gray-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  title="Delete notification"
                                  aria-label={`Delete "${notification.title}"`}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            <p className="mt-1 text-sm text-gray-600">
                              {notification.message}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {formatNotificationTime(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;