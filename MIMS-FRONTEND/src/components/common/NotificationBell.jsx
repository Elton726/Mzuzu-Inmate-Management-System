import React, { useState, useRef, useEffect } from 'react';
import { BiBell } from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

/**
 * NotificationBell Component
 *
 * Displays a notification bell icon with a dropdown menu showing notifications.
 * Features:
 * - Bell icon with unread count badge
 * - Dropdown menu with notification list
 * - Mark notifications as read
 * - Clear all notifications
 * - Click outside to close dropdown
 */
export const NotificationBell = ({ notifications = [], onMarkAsRead, onClearAll, buttonClassName = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = (notificationId) => {
    if (onMarkAsRead) {
      onMarkAsRead(notificationId);
    }
  };

  const handleAction = (notification) => {
    if (onMarkAsRead) onMarkAsRead(notification.id);
    // prefer url navigation
    if (notification?.action?.url) {
      navigate(notification.action.url);
    } else if (typeof notification?.action?.onClick === 'function') {
      notification.action.onClick(notification);
    }
    setIsOpen(false);
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 text-white hover:bg-blue-700 rounded-lg transition duration-200 ${buttonClassName}`}
        aria-label="Notifications"
      >
        <BiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-50 border-b px-4 py-3 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {notification.timestamp && (
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {notification.action && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); handleAction(notification); }}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
                          aria-label={notification.action.label || 'Open'}
                        >
                          {notification.action.label || 'Open'}
                        </button>
                      )}
                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); handleMarkAsRead(notification.id); }}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          aria-label="Mark as read"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
