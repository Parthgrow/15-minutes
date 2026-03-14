/**
 * Stats Helper Functions
 *
 * Handles updating user statistics for task completion tracking.
 * - Summary stats stored in users/{userId}.stats object
 * - Daily stats stored in dailyStats/{userId}_{date} collection
 *
 * Philosophy: stats are a permanent ledger of work done.
 * Completed task stats are never decremented on delete — only on uncomplete.
 */

import { db } from './config';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Convert timestamp to YYYY-MM-DD format
 */
export function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0];
}

/**
 * Increment pending count when task is created
 */
export async function incrementPendingStats(userId: string) {
  await db.doc(`users/${userId}`).set(
    {
      stats: {
        totalPending: FieldValue.increment(1),
        lastUpdated: Date.now(),
      },
    },
    { merge: true }
  );
}

/**
 * Decrement pending count when pending task is deleted
 */
export async function decrementPendingStats(userId: string) {
  await db.doc(`users/${userId}`).set(
    {
      stats: {
        totalPending: FieldValue.increment(-1),
        lastUpdated: Date.now(),
      },
    },
    { merge: true }
  );
}

/**
 * Increment stats when a task is completed.
 * Stores duration permanently — never reversed on delete.
 */
export async function incrementCompletedStats(
  userId: string,
  completedDate: string, // "YYYY-MM-DD"
  duration: number       // in minutes
) {
  const batch = db.batch();

  const userRef = db.doc(`users/${userId}`);
  batch.set(
    userRef,
    {
      stats: {
        totalCompleted: FieldValue.increment(1),
        totalMinutes: FieldValue.increment(duration),
        totalPending: FieldValue.increment(-1),
        lastUpdated: Date.now(),
      },
    },
    { merge: true }
  );

  // Update daily stats (flat collection)
  const dailyRef = db.doc(`dailyStats/${userId}_${completedDate}`);
  batch.set(
    dailyRef,
    {
      userId,
      date: completedDate,
      count: FieldValue.increment(1),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Decrement stats when a task is uncompleted (user reversing their action).
 * This is the only case where completed stats go down.
 */
export async function decrementCompletedStats(
  userId: string,
  completedDate: string,
  duration: number // in minutes
) {
  const batch = db.batch();

  const userRef = db.doc(`users/${userId}`);
  batch.set(
    userRef,
    {
      stats: {
        totalCompleted: FieldValue.increment(-1),
        totalMinutes: FieldValue.increment(-duration),
        totalPending: FieldValue.increment(1),
        lastUpdated: Date.now(),
      },
    },
    { merge: true }
  );

  // Update daily stats
  const dailyRef = db.doc(`dailyStats/${userId}_${completedDate}`);
  batch.set(
    dailyRef,
    {
      count: FieldValue.increment(-1),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  await batch.commit();
}
