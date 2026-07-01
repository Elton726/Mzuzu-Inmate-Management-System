import React, { useState, useCallback } from 'react';
import { NotificationContext } from './NotificationContextCreate';
import { getModuleFromPathname } from '../utils/helpers';

/**
 * NotificationContext
 *
 * Provides global notification state management
 * Allows components to add, remove, and clear notifications
 */
const STORAGE_KEY = 'mims_notifications';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Persistence removed: notifications are cleared on page refresh.

  /**
   * Remove a single notification
   */
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  }, []);

  /**
   * Add a new notification
   * @param {Object} notification - Notification object
   * @param {string} notification.title - Notification title
   * @param {string} notification.message - Notification message
   * @param {string} [notification.type] - 'info', 'success', 'warning', 'error'
   * @param {number} [notification.duration] - Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  const addNotification = useCallback((notification) => {
    const id = notification.id || Date.now().toString();
    
    setNotifications(prev => {
      // Prevent duplicates by ID
      if (prev.some(n => n.id === id)) {
        return prev;
      }
      
      const newNotification = {
        id,
        isRead: false,
        timestamp: new Date(),
        type: 'info',
        module: getModuleFromPathname(),
        ...notification,
      };
      return [newNotification, ...prev];
    });

    // Auto-dismiss if duration is set
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, [removeNotification]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  }, []);

  /**
   * Clear all notifications
   */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    addNotification,
    markAsRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
