"use client";

import { useState } from "react";
import { Task } from "@/lib/types";
import { FeatureGroup } from "@/hooks/useWorkspace";

interface TaskPanelProps {
  groups: FeatureGroup[] | null;
  hasProject: boolean;
  currentTaskId: string | null;
  // The task under a running or paused timer can't be swapped out
  lockedTaskId: string | null;
  onSelect: (task: Task) => void;
  onComplete: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onCreateTask: (featureId: string, description: string, duration: 15 | 30) => void;
  onCreateFeature: (name: string) => void;
  onDeleteFeature: (featureId: string, name: string) => void;
}

export default function TaskPanel({
  groups,
  hasProject,
  currentTaskId,
  lockedTaskId,
  onSelect,
  onComplete,
  onDeleteTask,
  onCreateTask,
  onCreateFeature,
  onDeleteFeature,
}: TaskPanelProps) {
  if (!hasProject) {
    return <Empty>Create a project to start adding tasks.</Empty>;
  }
  if (groups === null) {
    return <Empty>Loading…</Empty>;
  }

  return (
    <div className="flex flex-col gap-8 pb-6">
      {groups.length === 0 && (
        <p className="text-sm text-muted">
          Group your tasks into features, like &ldquo;Auth&rdquo; or &ldquo;Landing page&rdquo;.
        </p>
      )}

      {groups.map(({ feature, tasks }) => (
        <section key={feature.id} className="group/feature">
          <header className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs uppercase tracking-widest text-muted truncate">
              {feature.name}
              <span className="ml-2 text-faint">{tasks.length}</span>
            </h3>
            <IconButton
              label={`Delete feature ${feature.name}`}
              onClick={() => onDeleteFeature(feature.id, feature.name)}
              className="lg:opacity-0 lg:group-hover/feature:opacity-100 focus:opacity-100"
            >
              <TrashIcon />
            </IconButton>
          </header>

          <ul className="flex flex-col">
            {tasks.map((task) => {
              const current = task.id === currentTaskId;
              const selectable = !lockedTaskId;
              return (
                <li
                  key={task.id}
                  className={`group/task flex items-center gap-3 -mx-2 px-2 rounded-lg ${
                    current ? "bg-surface" : ""
                  }`}
                >
                  <button
                    onClick={() => onComplete(task)}
                    aria-label={`Tick off ${task.description}`}
                    className="shrink-0 w-5 h-5 rounded border border-faint hover:border-ink transition-colors"
                  />
                  <button
                    onClick={() => selectable && onSelect(task)}
                    disabled={!selectable && !current}
                    className={`flex-1 min-w-0 py-3 text-left text-[15px] leading-snug transition-colors ${
                      current ? "text-ink" : "text-muted hover:text-ink"
                    } disabled:hover:text-muted`}
                  >
                    {task.description}
                  </button>
                  {task.duration === 30 && (
                    <span className="shrink-0 text-[11px] tabular text-faint">30m</span>
                  )}
                  {task.id !== lockedTaskId && (
                    <IconButton
                      label={`Delete ${task.description}`}
                      onClick={() => onDeleteTask(task)}
                      className="lg:opacity-0 lg:group-hover/task:opacity-100 focus:opacity-100"
                    >
                      <TrashIcon />
                    </IconButton>
                  )}
                </li>
              );
            })}
          </ul>

          <AddTask onAdd={(desc, duration) => onCreateTask(feature.id, desc, duration)} />
        </section>
      ))}

      <AddFeature onAdd={onCreateFeature} />
    </div>
  );
}

function AddTask({ onAdd }: { onAdd: (description: string, duration: 15 | 30) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [duration, setDuration] = useState<15 | 30>(15);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 py-2 text-sm text-faint hover:text-ink transition-colors"
      >
        + Add task
      </button>
    );
  }

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value, duration);
    // Stay open so several tasks can be added in a row
    setText("");
  };

  return (
    <form
      className="mt-2 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => !text.trim() && setOpen(false)}
        placeholder="A task you can finish in one block"
        className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-surface border border-line text-[15px] text-ink placeholder:text-faint focus:border-muted"
      />
      <div className="flex shrink-0 rounded-lg border border-line overflow-hidden text-xs tabular">
        {([15, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setDuration(d)}
            className={`h-10 w-10 transition-colors ${
              duration === d ? "bg-ink text-bg" : "text-muted hover:text-ink"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </form>
  );
}

function AddFeature({ onAdd }: { onAdd: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="self-start py-2 text-sm text-muted hover:text-ink transition-colors"
      >
        + New feature
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        onAdd(value);
        setText("");
        setOpen(false);
      }}
    >
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        onBlur={() => !text.trim() && setOpen(false)}
        placeholder="Feature name"
        className="w-full h-10 px-3 rounded-lg bg-surface border border-line text-[15px] text-ink placeholder:text-faint focus:border-muted"
      />
    </form>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted py-4">{children}</p>;
}

export function IconButton({
  children,
  label,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-faint hover:text-ink hover:bg-surface transition ${className}`}
    >
      {children}
    </button>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  );
}
