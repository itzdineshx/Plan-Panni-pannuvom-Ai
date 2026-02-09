import { AppNotification, Task, Milestone } from '../types';

// ─── Browser Notification Permission ────────────────────────────────────────

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    permissionGranted = permission === 'granted';
    return permissionGranted;
  }
  return false;
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (!permissionGranted && Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
  } catch {
    // Silently fail on environments that block notifications
  }
}

// ─── In-app Notification Store ──────────────────────────────────────────────

type NotificationListener = (notifications: AppNotification[]) => void;

let notifications: AppNotification[] = [];
const listeners = new Set<NotificationListener>();

function notify() {
  listeners.forEach(fn => fn([...notifications]));
}

export function subscribeNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  listener([...notifications]);
  return () => listeners.delete(listener);
}

export function getNotifications(): AppNotification[] {
  return [...notifications];
}

export function addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const n: AppNotification = {
    ...notification,
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    read: false,
  };
  notifications = [n, ...notifications];
  notify();

  // Also push browser notification for critical types
  if (['overdue', 'critical-path'].includes(n.type)) {
    sendBrowserNotification(n.title, { body: n.message, tag: n.id });
  }

  return n;
}

export function markAsRead(id: string): void {
  notifications = notifications.map(n =>
    n.id === id ? { ...n, read: true } : n
  );
  notify();
}

export function markAllAsRead(): void {
  notifications = notifications.map(n => ({ ...n, read: true }));
  notify();
}

export function dismissNotification(id: string): void {
  notifications = notifications.filter(n => n.id !== id);
  notify();
}

export function clearAllNotifications(): void {
  notifications = [];
  notify();
}

// ─── Task Monitoring Helpers ────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Check tasks and generate overdue / critical-path notifications */
export function checkTaskAlerts(tasks: Task[]): AppNotification[] {
  const today = todayISO();
  const generated: AppNotification[] = [];

  for (const task of tasks) {
    if (task.status === 'done') continue;

    // Overdue check
    if (task.deadline && task.deadline !== 'No Deadline' && task.deadline < today) {
      const existing = notifications.find(
        n => n.type === 'overdue' && n.relatedTaskId === task.id
      );
      if (!existing) {
        const n = addNotification({
          type: 'overdue',
          title: 'Task Overdue',
          message: `"${task.title}" was due on ${task.deadline} and is still ${task.status}.`,
          relatedTaskId: task.id,
        });
        generated.push(n);
      }
    }

    // Critical path alert
    if (task.criticalPath && task.status !== 'done' && task.status !== 'in-progress') {
      const existing = notifications.find(
        n => n.type === 'critical-path' && n.relatedTaskId === task.id
      );
      if (!existing) {
        const n = addNotification({
          type: 'critical-path',
          title: 'Critical Path Task Waiting',
          message: `"${task.title}" is on the critical path and hasn't started yet.`,
          relatedTaskId: task.id,
        });
        generated.push(n);
      }
    }
  }

  return generated;
}

/** Check milestones for overdue alerts */
export function checkMilestoneAlerts(milestones: Milestone[]): AppNotification[] {
  const today = todayISO();
  const generated: AppNotification[] = [];

  for (const ms of milestones) {
    if (ms.status === 'completed') continue;
    if (ms.targetDate && ms.targetDate < today && ms.status !== 'overdue') {
      const existing = notifications.find(
        n => n.type === 'milestone' && n.relatedMilestoneId === ms.id
      );
      if (!existing) {
        const n = addNotification({
          type: 'milestone',
          title: 'Milestone Overdue',
          message: `"${ms.title}" target date (${ms.targetDate}) has passed with ${ms.completionPercentage || 0}% completion.`,
          relatedMilestoneId: ms.id,
        });
        generated.push(n);
      }
    }
  }

  return generated;
}

/** Check tasks for upcoming deadlines and send reminders */
export function checkDeadlineReminders(tasks: Task[]): AppNotification[] {
  const today = todayISO();
  const generated: AppNotification[] = [];

  for (const task of tasks) {
    if (task.status === 'done') continue;

    if (task.deadline && task.deadline !== 'No Deadline') {
      const daysLeft = Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

      // Send reminder for tasks due in 3 days or less
      if (daysLeft <= 3 && daysLeft >= 0) {
        const existing = notifications.find(
          n => n.type === 'info' && n.relatedTaskId === task.id && n.message.includes('due in')
        );
        if (!existing) {
          const n = addNotification({
            type: 'info',
            title: 'Upcoming Deadline',
            message: `"${task.title}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${task.deadline}).`,
            relatedTaskId: task.id,
          });
          generated.push(n);
        }
      }

      // Send reminder for tasks due today
      if (daysLeft === 0) {
        const existing = notifications.find(
          n => n.type === 'info' && n.relatedTaskId === task.id && n.message.includes('due today')
        );
        if (!existing) {
          const n = addNotification({
            type: 'info',
            title: 'Task Due Today',
            message: `"${task.title}" is due today! Make sure to complete it.`,
            relatedTaskId: task.id,
          });
          generated.push(n);
        }
      }
    }
  }

  return generated;
}
