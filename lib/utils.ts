/**
 * Converts focused minutes to a task count.
 * 1 task = 15 minutes of focused work.
 */
export function minutesToTasks(minutes: number): number {
  return Math.floor(minutes / 15);
}
