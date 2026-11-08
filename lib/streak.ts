import { TimelineEntry } from './api';

export interface Streak {
  current: number;
  longest: number;
}

// Streaks over a day-by-day timeline that ends today (oldest first).
// A day counts when at least one block was completed. Today with no block
// yet doesn't break the current streak, so it still shows yesterday's run.
export function computeStreak(days: TimelineEntry[]): Streak {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.minutes > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  let current = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].minutes === 0) i--;
  while (i >= 0 && days[i].minutes > 0) {
    current++;
    i--;
  }

  return { current, longest };
}
