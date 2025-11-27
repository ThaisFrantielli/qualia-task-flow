import type { Notification } from '@/types';

/**
 * Determines if a notification requires user action.
 * Currently checks if the notification type is 'warning' or 'error'.
 * Can be extended to check specific data fields.
 */
export const requiresAction = (notification: Notification): boolean => {
  return notification.type === 'warning' || notification.type === 'error';
};
