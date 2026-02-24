// useNotifications hook - Push notification management
import { useState, useEffect, useCallback } from 'react';
import { notificationService, PushNotification } from '@/services/device/notificationService';

interface UseNotificationsReturn {
  notifications: PushNotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  return { notifications, unreadCount, isLoading, markAsRead, refresh };
}
