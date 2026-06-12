/** Retry queue for health sync writes that fail due to network/server issues.
 *  Stores pending actions in localStorage and drains on next app open. */

const STORAGE_KEY = 'pending_health_syncs';

export interface PendingSync {
  userId: string;
  habitId: string;
  value: number;
  label?: string;
  timestamp?: number;
}

export function getPendingSyncs(): PendingSync[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function addPendingSync(sync: PendingSync): void {
  const queue = getPendingSyncs();
  queue.push(sync);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function clearPendingSyncs(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Attempt to drain the queue. Returns number of successfully written items. */
export async function drainPendingSyncs(logHabitAction: (userId: string, habitId: string, value: number, bodyweight?: number, label?: string, timestamp?: number) => Promise<any>): Promise<number> {
  const queue = getPendingSyncs();
  if (!queue.length) return 0;

  const failed: PendingSync[] = [];
  let success = 0;

  for (const sync of queue) {
    try {
      await logHabitAction(sync.userId, sync.habitId, sync.value, undefined, sync.label, sync.timestamp);
      success++;
    } catch {
      failed.push(sync);
    }
  }

  if (failed.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(failed));
  } else {
    clearPendingSyncs();
  }

  return success;
}
