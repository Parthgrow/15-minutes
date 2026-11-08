"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import FocusTimer from "@/components/focus/FocusTimer";
import TaskPanel from "@/components/focus/TaskPanel";
import ProjectList from "@/components/focus/ProjectList";
import Sheet from "@/components/focus/Sheet";
import CompletionAnimation from "@/components/CompletionAnimation";
import { useProject } from "@/contexts/ProjectContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { formatClock, useFocusTimer } from "@/hooks/useFocusTimer";
import { api } from "@/lib/api";
import { computeStreak } from "@/lib/streak";
import { Project, Task } from "@/lib/types";

const selectedKey = (projectId: string) => `currentTask:${projectId}`;

export default function Home() {
  const { currentProjectId, setCurrentProjectId } = useProject();
  const { data: session } = useSession();
  const ws = useWorkspace(currentProjectId);
  const timer = useFocusTimer();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [undo, setUndo] = useState<Task | null>(null);
  const [streak, setStreak] = useState<number | null>(null);
  const [today, setToday] = useState<{ count: number; minutes: number } | null>(null);
  const [statsKey, setStatsKey] = useState(0);

  // Stats are computed server-side; refetch after anything that changes them
  useEffect(() => {
    api
      .timeline("yearly")
      .then((t) => {
        const days = t.data ?? [];
        const last = days[days.length - 1];
        setToday({ count: last?.count ?? 0, minutes: last?.minutes ?? 0 });
        setStreak(computeStreak(days).current);
      })
      .catch(() => {});
  }, [statsKey]);

  // Remember the chosen task per project
  useEffect(() => {
    if (!currentProjectId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore from localStorage on project change
    setSelectedTaskId(localStorage.getItem(selectedKey(currentProjectId)));
  }, [currentProjectId]);

  // Fall back to the first project if the stored one is gone
  useEffect(() => {
    if (!ws.projects) return;
    if (!currentProjectId || !ws.projects.some((p) => p.id === currentProjectId)) {
      setCurrentProjectId(ws.projects[0]?.id);
    }
  }, [ws.projects, currentProjectId, setCurrentProjectId]);

  const allTasks = useMemo(() => ws.groups?.flatMap((g) => g.tasks) ?? [], [ws.groups]);
  const currentProject = ws.projects?.find((p) => p.id === currentProjectId);

  // While a block is on, the timer's task is the current one
  const timerActive = timer.status !== "idle";
  const currentTask: Task | null = timerActive
    ? allTasks.find((t) => t.id === timer.taskId) ?? null
    : allTasks.find((t) => t.id === selectedTaskId) ?? allTasks[0] ?? null;
  const upNext = allTasks.filter((t) => t.id !== currentTask?.id).slice(0, 3);

  const selectTask = (task: Task) => {
    setSelectedTaskId(task.id);
    if (currentProjectId) localStorage.setItem(selectedKey(currentProjectId), task.id);
    setTasksOpen(false);
  };

  const completeTask = async (task: Task) => {
    if (timer.taskId === task.id) timer.reset();
    setCelebrate(true);
    setUndo(task);
    const ok = await ws.completeTask(task);
    if (ok) setStatsKey((k) => k + 1);
  };

  const undoComplete = async () => {
    if (!undo) return;
    const task = undo;
    setUndo(null);
    const ok = await ws.undoComplete(task);
    if (ok) setStatsKey((k) => k + 1);
  };

  const deleteTask = (task: Task) => {
    if (confirm(`Delete "${task.description}"?`)) ws.deleteTask(task);
  };

  const deleteFeature = (id: string, name: string) => {
    if (confirm(`Delete feature "${name}" and all its tasks?`)) ws.deleteFeature(id);
  };

  const createProject = async (name: string) => {
    const project = await ws.createProject(name);
    if (project) {
      setCurrentProjectId(project.id);
      setProjectsOpen(false);
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Delete project "${project.name}" with all its features and tasks?`)) return;
    const ok = await ws.deleteProject(project.id);
    if (ok && project.id === currentProjectId) setCurrentProjectId(undefined);
  };

  // Hide the undo toast after a few seconds
  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 6000);
    return () => clearTimeout(id);
  }, [undo]);

  // Show the remaining time in the tab title
  useEffect(() => {
    document.title =
      timer.status === "running" || timer.status === "paused"
        ? `${formatClock(timer.remainingMs)} · 15 Minutes`
        : timer.status === "finished"
          ? "Time's up · 15 Minutes"
          : "15 Minutes";
  }, [timer.status, timer.remainingMs]);

  // Keyboard: Space starts/pauses, D ticks off the current task
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [role=dialog]") || e.metaKey || e.ctrlKey) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (timer.status === "idle") timer.start(currentTask);
        else if (timer.status === "running") timer.pause();
        else if (timer.status === "paused") timer.resume();
      } else if (e.key === "d" && currentTask) {
        completeTask(currentTask);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const endCelebration = useCallback(() => setCelebrate(false), []);

  const taskPanel = (
    <TaskPanel
      groups={ws.groups}
      hasProject={!!currentProjectId}
      currentTaskId={currentTask?.id ?? null}
      lockedTaskId={timerActive ? timer.taskId : null}
      onSelect={selectTask}
      onComplete={completeTask}
      onDeleteTask={deleteTask}
      onCreateTask={ws.createTask}
      onCreateFeature={ws.createFeature}
      onDeleteFeature={deleteFeature}
    />
  );

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col min-h-dvh lg:min-h-0 lg:h-dvh">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
          <button
            onClick={() => setProjectsOpen(true)}
            className="flex items-center gap-1.5 min-w-0 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            <span className="truncate">{currentProject?.name ?? (ws.projects ? "New project" : "…")}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            <Link
              href="/stats"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-muted hover:text-ink transition-colors"
              title="Day streak"
            >
              <FlameIcon active={!!streak} />
              <span className="tabular">{streak ?? "–"}</span>
            </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account"
                className="w-9 h-9 rounded-full bg-surface border border-line text-xs text-muted hover:text-ink transition-colors"
              >
                {(session?.user?.name ?? session?.user?.email ?? "?").charAt(0).toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 z-30 w-56 rounded-xl bg-surface border border-line p-1 text-sm">
                    {session?.user?.email && (
                      <div className="px-3 py-2 text-faint truncate">{session.user.email}</div>
                    )}
                    <Link href="/stats" className="block px-3 py-2 rounded-lg text-muted hover:text-ink hover:bg-bg">
                      Stats
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
                      className="w-full text-left px-3 py-2 rounded-lg text-muted hover:text-ink hover:bg-bg"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Timer */}
        <main className="flex-1 flex flex-col items-center justify-center px-5 py-8">
          {ws.projects && ws.projects.length === 0 ? (
            <div className="w-full max-w-sm text-center">
              <p className="text-2xl text-ink">What are you building?</p>
              <p className="mt-2 mb-8 text-muted">Name your first project to get started.</p>
              <ProjectList
                projects={[]}
                currentProjectId={undefined}
                onSelect={() => {}}
                onCreate={createProject}
                onDelete={() => {}}
              />
            </div>
          ) : (
            <FocusTimer
              status={timer.status}
              remainingMs={timer.remainingMs}
              progress={timer.progress}
              task={currentTask}
              timerLabel={timer.taskLabel}
              onStart={() => timer.start(currentTask)}
              onPause={timer.pause}
              onResume={timer.resume}
              onStop={timer.reset}
              onExtend={timer.extend}
              onComplete={() => currentTask && completeTask(currentTask)}
              onPickTask={() => setTasksOpen(true)}
            />
          )}
        </main>

        {/* Today + up next (phones and tablets; desktop has the side panel) */}
        <footer className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <TodayLine today={today} />
          {currentProjectId && (
            <div className="lg:hidden mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-widest text-faint">Up next</span>
                <button
                  onClick={() => setTasksOpen(true)}
                  className="text-sm text-muted hover:text-ink transition-colors py-1"
                >
                  All tasks
                </button>
              </div>
              {upNext.length === 0 ? (
                <button
                  onClick={() => setTasksOpen(true)}
                  className="py-2 text-sm text-faint hover:text-ink transition-colors"
                >
                  + Add a task
                </button>
              ) : (
                <ul>
                  {upNext.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                      <button
                        onClick={() => completeTask(t)}
                        aria-label={`Tick off ${t.description}`}
                        className="shrink-0 w-5 h-5 rounded border border-faint"
                      />
                      <button
                        onClick={() => !timerActive && selectTask(t)}
                        className="flex-1 min-w-0 py-2.5 text-left text-[15px] text-muted truncate"
                      >
                        {t.description}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </footer>
      </div>

      {/* Desktop side panel */}
      <aside className="hidden lg:flex flex-col w-[380px] h-dvh border-l border-line">
        <div className="px-6 pt-6 pb-3 text-xs uppercase tracking-widest text-faint">Tasks</div>
        <div className="flex-1 overflow-y-auto px-6">{taskPanel}</div>
      </aside>

      <Sheet open={tasksOpen} onClose={() => setTasksOpen(false)} title="Tasks">
        {taskPanel}
      </Sheet>

      <Sheet open={projectsOpen} onClose={() => setProjectsOpen(false)} title="Projects">
        <ProjectList
          projects={ws.projects ?? []}
          currentProjectId={currentProjectId}
          onSelect={(id) => {
            setCurrentProjectId(id);
            setProjectsOpen(false);
          }}
          onCreate={createProject}
          onDelete={deleteProject}
        />
      </Sheet>

      {/* Toasts */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pointer-events-none">
        <AnimatePresence>
          {undo && (
            <Toast key="undo">
              <span className="truncate">Ticked off</span>
              <button onClick={undoComplete} className="font-medium text-ink">
                Undo
              </button>
            </Toast>
          )}
          {ws.error && (
            <Toast key="error">
              <span className="truncate text-red-300">{ws.error}</span>
              <button onClick={ws.clearError} className="text-muted">
                Dismiss
              </button>
            </Toast>
          )}
        </AnimatePresence>
      </div>

      <CompletionAnimation show={celebrate} onComplete={endCelebration} />
    </div>
  );
}

function TodayLine({ today }: { today: { count: number; minutes: number } | null }) {
  const count = today?.count ?? 0;
  const dots = Math.max(4, count);
  return (
    <div className="flex items-center justify-center gap-3 text-xs text-faint">
      <span className="uppercase tracking-widest">Today</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: Math.min(dots, 12) }, (_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < count ? "bg-ink" : "bg-line"}`} />
        ))}
      </span>
      <span className="tabular">
        {count} · {today?.minutes ?? 0}m
      </span>
    </div>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 20, opacity: 0 }}
      className="pointer-events-auto flex items-center justify-between gap-6 w-full max-w-sm px-4 py-3 rounded-xl bg-surface border border-line text-sm text-muted shadow-lg"
    >
      {children}
    </motion.div>
  );
}

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      className={active ? "text-accent" : "text-faint"}
      aria-hidden
    >
      <path d="M12 2c1 3.5 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.5 3 2.5 3 0-3-1-6 0-9Z" />
    </svg>
  );
}
