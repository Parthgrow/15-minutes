"use client";

import { Task } from "@/lib/types";
import { formatClock, TimerStatus } from "@/hooks/useFocusTimer";

interface FocusTimerProps {
  status: TimerStatus;
  remainingMs: number;
  progress: number;
  // The task the timer is on, or the one that would start next
  task: Task | null;
  // Label kept by the timer, used when its task is no longer in the list
  timerLabel: string | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onExtend: () => void;
  onComplete: () => void;
  onPickTask: () => void;
}

export default function FocusTimer({
  status,
  remainingMs,
  progress,
  task,
  timerLabel,
  onStart,
  onPause,
  onResume,
  onStop,
  onExtend,
  onComplete,
  onPickTask,
}: FocusTimerProps) {
  const idle = status === "idle";
  const running = status === "running";
  const paused = status === "paused";
  const finished = status === "finished";

  const clockMs = idle ? (task?.duration ?? 15) * 60 * 1000 : remainingMs;
  const label = idle ? task?.description : task?.description ?? timerLabel;
  const lastMinute = running && remainingMs <= 60_000;

  return (
    <div className="flex flex-col items-center text-center w-full max-w-md">
      <div
        className={`tabular font-light tracking-tight leading-none select-none text-[min(28vw,9rem)] transition-colors duration-500 ${
          running ? "text-accent" : paused ? "text-faint" : "text-ink"
        } ${lastMinute ? "soft-pulse" : ""}`}
        aria-live="off"
      >
        {finished ? "00:00" : formatClock(clockMs)}
      </div>

      {/* Progress line */}
      <div className="mt-6 h-0.5 w-48 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ${running ? "bg-accent" : "bg-muted"}`}
          style={{ width: `${idle ? 0 : progress * 100}%` }}
        />
      </div>

      {/* Current task */}
      <div className="mt-8 min-h-14 flex flex-col items-center gap-1 px-4">
        {finished ? (
          <p className="text-lg text-ink">Time&apos;s up. Done?</p>
        ) : label ? (
          <button
            onClick={onPickTask}
            disabled={!idle}
            className="text-lg text-ink enabled:hover:text-muted transition-colors line-clamp-2 disabled:cursor-default"
            title={idle ? "Change task" : undefined}
          >
            {label}
          </button>
        ) : (
          <button
            onClick={onPickTask}
            className="text-lg text-muted hover:text-ink transition-colors"
          >
            What will you build in the next 15 minutes?
          </button>
        )}
        {paused && <span className="text-xs uppercase tracking-widest text-faint">Paused</span>}
        {idle && task?.duration === 30 && (
          <span className="text-xs text-faint">Two blocks</span>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col items-center gap-4 w-full">
        {idle && (
          <PrimaryButton onClick={onStart}>Start</PrimaryButton>
        )}
        {running && <PrimaryButton onClick={onPause}>Pause</PrimaryButton>}
        {paused && <PrimaryButton onClick={onResume}>Resume</PrimaryButton>}
        {finished && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {task && <PrimaryButton onClick={onComplete}>Tick it off</PrimaryButton>}
            <SecondaryButton onClick={onExtend}>+15 min</SecondaryButton>
            <SecondaryButton onClick={onStop}>Not yet</SecondaryButton>
          </div>
        )}

        {!finished && (
          <div className="flex items-center gap-6 text-sm">
            {task && (
              <button
                onClick={onComplete}
                className="flex items-center gap-2 text-muted hover:text-ink transition-colors py-2"
              >
                <span className="w-4 h-4 rounded border border-current" aria-hidden />
                Tick off
              </button>
            )}
            {!idle && (
              <button
                onClick={onStop}
                className="text-muted hover:text-ink transition-colors py-2"
              >
                Stop
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-w-40 h-12 px-8 rounded-full bg-ink text-bg font-medium hover:opacity-90 active:scale-[0.98] transition"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="min-w-32 h-12 px-6 rounded-full border border-line text-ink hover:bg-surface active:scale-[0.98] transition"
    >
      {children}
    </button>
  );
}
