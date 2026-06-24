## Notification System Documentation

The MIMS frontend now includes a comprehensive notification system with a notification bell displayed in the top navigation bar.

### Components

#### 1. **NotificationBell Component**
Located in: `src/components/common/NotificationBell.jsx`

A UI component that displays a bell icon with an unread count badge and a dropdown menu showing all notifications.

**Features:**
- Bell icon with unread notification badge
- Dropdown menu with notification list
- Mark notifications as read when clicked
- Clear all notifications button
- Auto-closes when clicking outside
- Timestamps on notifications

#### 2. **NotificationContext**
Located in: `src/contexts/NotificationContext.js`

Provides global notification state management using React Context.

#### 3. **useNotification Hook**
Located in: `src/contexts/useNotification.js`

Custom React hook for easy access to the notification context.

### Usage

#### Adding a Notification

```javascript
import { useNotification } from '../contexts/useNotification';

function MyComponent() {
  const { addNotification } = useNotification();

  const handleAction = () => {
    // Perform your action
    
    // Add a notification
    addNotification({
      title: 'Success',
      message: 'Your action was completed successfully',
      type: 'success',
      duration: 5000, // Auto-dismiss after 5 seconds (0 = no auto-dismiss)
    });
  };

  return <button onClick={handleAction}>Take Action</button>;
}
```

#### Notification Object Structure

```javascript
{
  title: string,              // Required: Notification title
  message: string,            // Required: Notification message
  type: 'info' | 'success' | 'warning' | 'error', // Optional: defaults to 'info'
  duration: number,           // Optional: Auto-dismiss time in ms (0 = persistent)
  timestamp: Date,            // Auto-set: Creation time
  id: string,                 // Auto-set: Unique identifier
  isRead: boolean,            // Auto-set: Read status
}
```

#### Marking as Read

```javascript
const { markAsRead } = useNotification();

// Mark a specific notification as read
markAsRead(notificationId);
```

#### Clearing All Notifications

```javascript
const { clearAll } = useNotification();

// Clear all notifications
clearAll();
```

### Integration Points

The notification system is integrated in:
1. **App.jsx** - NotificationProvider wraps the entire app
2. **Navigation.jsx** - NotificationBell component is displayed in the top navigation
3. Available in any component that uses the `useNotification` hook

### Example Usage in Different Modules

#### Admissions Module
```javascript
import { useNotification } from '../../../contexts/useNotification';

function AdmissionForm() {
  const { addNotification } = useNotification();

  const handleSubmit = async (data) => {
    try {
      const response = await submitAdmission(data);
      addNotification({
        title: 'Admission Recorded',
        message: `Inmate ${data.name} has been successfully admitted`,
        type: 'success',
      });
    } catch (error) {
      addNotification({
        title: 'Error',
        message: 'Failed to record admission. Please try again.',
        type: 'error',
      });
    }
  };

  return {/* form JSX */};
}
```

#### Admin Module
```javascript
function UserManagement() {
  const { addNotification } = useNotification();

  const handleUserCreate = async (userData) => {
    const userId = await createUser(userData);
    addNotification({
      title: 'User Created',
      message: `User ${userData.name} has been created successfully`,
      type: 'success',
      duration: 5000,
    });
  };

  return {/* admin UI JSX */};
}
```

### Styling

Notifications use Tailwind CSS classes for styling. The NotificationBell component includes:
- Blue notification bell icon
- Red badge for unread count
- Dropdown with proper spacing and shadows
- Hover effects for interactivity
- Responsive width (w-80 = 20rem)

### Best Practices

1. **Always provide meaningful titles and messages** - Users should understand what happened
2. **Use appropriate types** - Choose the right notification type (success, error, warning, info)
3. **Set duration wisely** - Use auto-dismiss for temporary notifications, persistent for important ones
4. **Check isRead status** - The notification bell automatically handles this for visual indicators
5. **Clear old notifications** - For long-running pages, periodically clear old notifications
6. **Handle errors gracefully** - Always add error notifications when operations fail

### Accessibility

- The bell button has proper ARIA labels
- Notifications are visually distinct (color, size, badge)
- Keyboard navigation supported (click outside to close)
- Screen reader friendly notification text

### Future Enhancements

Possible additions:
- Notification categories/grouping
- Sound/browser notifications
- Persistence (localStorage or server)
- Real-time notifications via WebSocket
- Notification history
- Notification filtering/search
