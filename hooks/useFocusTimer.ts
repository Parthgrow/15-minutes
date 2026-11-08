"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The timer lives only in the browser. It stores timestamps rather than a
// ticking counter so a refresh, a background tab or a locked phone can't
// drift it: remaining time is always recomputed from the clock.

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export interface TimerState {
  status: TimerStatus;
  taskId: string | null;
  taskLabel: string | null;
  durationMs: number;
  // Time accumulated before the current run segment
  elapsedMs: number;
  // Start of the current run segment, set only while running
  segmentStart: number | null;
}

const STORAGE_KEY = "focusTimer";
export const BLOCK_MS = 15 * 60 * 1000;

const IDLE: TimerState = {
  status: "idle",
  taskId: null,
  taskLabel: null,
  durationMs: BLOCK_MS,
  elapsedMs: 0,
  segmentStart: null,
};

function load(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...IDLE, ...JSON.parse(raw) } : IDLE;
  } catch {
    return IDLE;
  }
}

function save(state: TimerState) {
  try {
    if (state.status === "idle") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode); the timer still works for this tab
  }
}

function elapsedAt(state: TimerState, now: number) {
  const running = state.status === "running" && state.segmentStart !== null;
  return state.elapsedMs + (running ? now - state.segmentStart! : 0);
}

type WakeLock = { release: () => Promise<void> };

export function useFocusTimer(onFinish?: () => void) {
  const [state, setState] = useState<TimerState>(IDLE);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Restore after mount so server and client render the same first frame
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    setState(load());
    setLoaded(true);
  }, []);

  const update = useCallback((next: TimerState) => {
    save(next);
    setState(next);
    setNow(Date.now());
  }, []);

  // Tick while running; also re-sync when the page becomes visible again.
  // Running out of time moves the timer to "finished".
  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      const t = Date.now();
      if (elapsedAt(state, t) < state.durationMs) {
        setNow(t);
        return;
      }
      update({ ...state, status: "finished", elapsedMs: state.durationMs, segmentStart: null });
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // Vibration not supported
      }
      onFinishRef.current?.();
    };
    const id = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state, update]);

  const elapsed = elapsedAt(state, now);
  const remainingMs = Math.max(0, state.durationMs - elapsed);

  // Keep the screen awake during a block where the browser allows it
  useEffect(() => {
    if (state.status !== "running") return;
    let lock: WakeLock | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const wakeLock = (navigator as Navigator & {
          wakeLock?: { request: (type: "screen") => Promise<WakeLock> };
        }).wakeLock;
        const l = await wakeLock?.request("screen");
        if (cancelled) l?.release();
        else lock = l ?? null;
      } catch {
        // Not supported or denied
      }
    };
    acquire();
    const reacquire = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", reacquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", reacquire);
      lock?.release().catch(() => {});
    };
  }, [state.status]);

  const start = useCallback(
    (task: { id: string; description: string; duration?: number } | null) => {
      const minutes = task?.duration ?? 15;
      update({
        status: "running",
        taskId: task?.id ?? null,
        taskLabel: task?.description ?? null,
        durationMs: minutes * 60 * 1000,
        elapsedMs: 0,
        segmentStart: Date.now(),
      });
    },
    [update]
  );

  const pause = useCallback(() => {
    if (state.status !== "running") return;
    update({ ...state, status: "paused", elapsedMs: elapsedAt(state, Date.now()), segmentStart: null });
  }, [state, update]);

  const resume = useCallback(() => {
    if (state.status !== "paused") return;
    update({ ...state, status: "running", segmentStart: Date.now() });
  }, [state, update]);

  // Add another block on top of the time already spent
  const extend = useCallback(() => {
    const spent = elapsedAt(state, Date.now());
    update({
      ...state,
      status: "running",
      durationMs: spent + BLOCK_MS,
      elapsedMs: spent,
      segmentStart: Date.now(),
    });
  }, [state, update]);

  const reset = useCallback(() => update(IDLE), [update]);

  return {
    ...state,
    loaded,
    remainingMs,
    progress: state.durationMs > 0 ? Math.min(1, elapsed / state.durationMs) : 0,
    start,
    pause,
    resume,
    extend,
    reset,
  };
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
