/**
 * Stats Helper Functions
 *
 * Handles updating user statistics for task completion tracking.
 * - Summary stats stored in users/{userId}.stats object
 * - Daily stats stored in dailyStats/{userId}_{date} collection
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
 * Increment stats when a task is completed
 */
export async function incrementCompletedStats(
  userId: string,
  completedDate: string // "YYYY-MM-DD"
) {
  const batch = db.batch();

  // Update user's stats object
  const userRef = db.doc(`users/${userId}`);
  batch.set(
    userRef,
    {
      stats: {
        totalCompleted: FieldValue.increment(1),
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
 * Decrement stats when a task is uncompleted
 */
export async function decrementCompletedStats(
  userId: string,
  completedDate: string
) {
  const batch = db.batch();

  // Update user's stats object
  const userRef = db.doc(`users/${userId}`);
  batch.set(
    userRef,
    {
      stats: {
        totalCompleted: FieldValue.increment(-1),
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

/**
 * Decrement completed count when a completed task is deleted
 */
export async function decrementCompletedStatsOnDelete(
  userId: string,
  completedDate: string
) {
  const batch = db.batch();

  // Update user's stats object
  const userRef = db.doc(`users/${userId}`);
  batch.set(
    userRef,
    {
      stats: {
        totalCompleted: FieldValue.increment(-1),
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
