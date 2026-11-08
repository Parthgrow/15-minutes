"use client";

import { useState } from "react";
import { Project } from "@/lib/types";
import { IconButton } from "./TaskPanel";

export default function ProjectList({
  projects,
  currentProjectId,
  onSelect,
  onCreate,
  onDelete,
}: {
  projects: Project[];
  currentProjectId: string | undefined;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (project: Project) => void;
}) {
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col">
        {projects.map((p) => {
          const current = p.id === currentProjectId;
          return (
            <li key={p.id} className="group flex items-center gap-2 -mx-2 px-2 rounded-lg hover:bg-surface">
              <button
                onClick={() => onSelect(p.id)}
                className={`flex-1 min-w-0 py-3 text-left truncate ${current ? "text-ink" : "text-muted"}`}
              >
                {current && <span className="mr-2 text-accent">●</span>}
                {p.name}
              </button>
              <span className="text-xs tabular text-faint">{p.tasksCompleted ?? 0} done</span>
              <IconButton
                label={`Delete project ${p.name}`}
                onClick={() => onDelete(p)}
                className="sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </IconButton>
            </li>
          );
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = name.trim();
          if (!value) return;
          onCreate(value);
          setName("");
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project"
          className="flex-1 min-w-0 h-11 px-3 rounded-lg bg-surface border border-line text-[15px] text-ink placeholder:text-faint focus:border-muted"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="h-11 px-4 rounded-lg bg-ink text-bg text-sm font-medium disabled:opacity-30 transition-opacity"
        >
          Create
        </button>
      </form>
    </div>
  );
}
