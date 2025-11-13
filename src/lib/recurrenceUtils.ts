import { parseISODateSafe, dateToLocalDateOnlyISO } from '@/lib/dateUtils';
import type { TaskWithDetails, TaskInsert } from '@/types';

type Pattern = 'daily' | 'weekly' | 'monthly' | null | undefined;

function asNumberArray(csv?: string | null) {
  if (!csv) return [] as number[];
  return csv.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n));
}

export function calculateNextDate(from: Date, pattern: Pattern, interval = 1, recurrenceDays?: string | null): Date | null {
  if (!pattern) return null;
  const next = new Date(from);

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + (interval || 1));
      return next;
    case 'weekly': {
      const days = asNumberArray(recurrenceDays);
      if (!days || days.length === 0) {
        next.setDate(next.getDate() + (7 * (interval || 1)));
        return next;
      }

      // Find next matching weekday within a reasonable window
      const maxLookahead = Math.max(7 * (interval || 1) + 7, 14);
      for (let i = 1; i <= maxLookahead; i++) {
        const cand = new Date(from);
        cand.setDate(cand.getDate() + i);
        const w = cand.getDay(); // 0=Sun .. 6=Sat
        if (days.includes(w)) return cand;
      }
      // Fallback to simple weekly increment
      next.setDate(next.getDate() + (7 * (interval || 1)));
      return next;
    }
    case 'monthly': {
      const day = next.getDate();
      next.setMonth(next.getMonth() + (interval || 1));
      // handle month overflow (e.g., 31 -> last day of month)
      const overflowDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (day > overflowDay) next.setDate(overflowDay);
      else next.setDate(day);
      return next;
    }
    default:
      return null;
  }
}

export function generateNextOccurrences(parentTask: TaskWithDetails, count = 5): TaskInsert[] {
  const occurrences: TaskInsert[] = [];
  const baseDate = parseISODateSafe(parentTask.due_date as any) || new Date();
  let current = baseDate;

  for (let i = 0; i < count; i++) {
    const next = calculateNextDate(current, parentTask.recurrence_pattern as Pattern, (parentTask.recurrence_interval as any) || 1, parentTask.recurrence_days);
    if (!next) break;

    const recurrenceEnd = parseISODateSafe(parentTask.recurrence_end as any);
    if (recurrenceEnd && next > recurrenceEnd) break;

    occurrences.push({
      title: parentTask.title,
      description: parentTask.description || null,
      status: 'todo',
      priority: parentTask.priority || null,
      due_date: dateToLocalDateOnlyISO(next),
      is_recurring: false,
      recurrence_pattern: null,
      recurrence_days: null,
      recurrence_end: null,
      parent_task_id: parentTask.id,
      project_id: parentTask.project_id || null,
      assignee_id: parentTask.assignee_id || null,
      category_id: parentTask.category_id || null,
    } as TaskInsert);

    current = next;
  }

  return occurrences;
}

export default {
  calculateNextDate,
  generateNextOccurrences,
};
