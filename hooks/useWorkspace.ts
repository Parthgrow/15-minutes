"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Feature, Project, Task } from "@/lib/types";

export interface FeatureGroup {
  feature: Feature;
  tasks: Task[];
}

const byCreated = <T extends { createdAt: number }>(a: T, b: T) => a.createdAt - b.createdAt;

// Projects, plus the features and pending tasks of the current project.
export function useWorkspace(projectId: string | undefined) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [groups, setGroups] = useState<FeatureGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const list = await api.listProjects();
      setProjects([...list].sort(byCreated));
    } catch (e) {
      setError((e as Error).message);
      setProjects([]);
    }
  }, []);

  const loadGroups = useCallback(async (id: string) => {
    try {
      const features = (await api.listFeatures(id)).sort(byCreated);
      const tasks = await Promise.all(features.map((f) => api.listTasks(f.id)));
      setGroups(features.map((feature, i) => ({ feature, tasks: tasks[i].sort(byCreated) })));
    } catch (e) {
      setError((e as Error).message);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when no project is selected
      setGroups([]);
      return;
    }
    setGroups(null);
    loadGroups(projectId);
  }, [projectId, loadGroups]);

  // Wraps a mutation so failures surface as an error message and reload state
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        setError(null);
        return await fn();
      } catch (e) {
        setError((e as Error).message);
        if (projectId) loadGroups(projectId);
        return undefined;
      }
    },
    [projectId, loadGroups]
  );

  const updateTasks = (featureId: string, fn: (tasks: Task[]) => Task[]) =>
    setGroups((gs) =>
      gs?.map((g) => (g.feature.id === featureId ? { ...g, tasks: fn(g.tasks) } : g)) ?? gs
    );

  const createProject = (name: string) =>
    run(async () => {
      const project = await api.createProject(name);
      setProjects((ps) => [...(ps ?? []), project]);
      return project;
    });

  const deleteProject = (id: string) =>
    run(async () => {
      await api.deleteProject(id);
      setProjects((ps) => ps?.filter((p) => p.id !== id) ?? ps);
      return true;
    });

  const createFeature = (name: string) =>
    run(async () => {
      if (!projectId) throw new Error("Pick a project first");
      const feature = await api.createFeature(projectId, name);
      setGroups((gs) => [...(gs ?? []), { feature, tasks: [] }]);
      return feature;
    });

  const deleteFeature = (id: string) =>
    run(async () => {
      await api.deleteFeature(id);
      setGroups((gs) => gs?.filter((g) => g.feature.id !== id) ?? gs);
      return true;
    });

  const createTask = (featureId: string, description: string, duration: 15 | 30) =>
    run(async () => {
      const task = await api.createTask(featureId, description, duration);
      updateTasks(featureId, (ts) => [...ts, task]);
      return task;
    });

  const deleteTask = (task: Task) =>
    run(async () => {
      updateTasks(task.featureId, (ts) => ts.filter((t) => t.id !== task.id));
      await api.deleteTask(task.id);
      return true;
    });

  // Completed tasks drop out of the list (the API only returns pending ones)
  const completeTask = (task: Task) =>
    run(async () => {
      updateTasks(task.featureId, (ts) => ts.filter((t) => t.id !== task.id));
      await api.setTaskCompleted(task.id, true);
      return true;
    });

  const undoComplete = (task: Task) =>
    run(async () => {
      await api.setTaskCompleted(task.id, false);
      updateTasks(task.featureId, (ts) => [...ts, task].sort(byCreated));
      return true;
    });

  return {
    projects,
    groups,
    error,
    clearError: () => setError(null),
    createProject,
    deleteProject,
    createFeature,
    deleteFeature,
    createTask,
    deleteTask,
    completeTask,
    undoComplete,
  };
}
