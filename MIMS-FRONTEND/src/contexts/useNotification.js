import { useContext } from 'react';
import { NotificationContext } from './NotificationContextCreate';

/**
 * useNotification Hook
 *
 * Provides access to the notification context
 * Usage:
 *   const { addNotification, markAsRead, clearAll } = useNotification();
 *   addNotification({ title: 'Success', message: 'Action completed' });
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export default useNotification;
