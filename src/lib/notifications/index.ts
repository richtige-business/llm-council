// ============================================
// index.ts - Notifications Exports
// 
// Zweck: Zentraler Export für alle Benachrichtigungs-Utilities
// ============================================

// Notification Bus - Core
export {
  useNotificationBus,
  publishNotification,
  subscribeToNotifications,
  type NotificationPriority,
  type NotificationSource,
  type NewNotification,
  type SystemNotification,
} from './notification-bus';

// Vordefinierte Benachrichtigungs-Funktionen
export {
  sendCalendarReminder,
  sendTaskReminder,
  sendSystemNotification,
} from './notification-bus';

