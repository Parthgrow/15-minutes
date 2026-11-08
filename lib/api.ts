import { Feature, Project, Task } from './types';

// Thin client for the app's API routes. Throws with the server's message on failure.
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface Stats {
  completedCount: number;
  pendingCount: number;
  totalCount: number;
  totalMinutes: number;
}

export interface TimelineEntry {
  date: string;
  label: string;
  count: number;
  minutes: number;
}

export const api = {
  listProjects: () => request<Project[]>('/api/projects'),
  createProject: (name: string) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteProject: (id: string) => request<unknown>(`/api/projects/${id}`, { method: 'DELETE' }),

  listFeatures: (projectId: string) =>
    request<Feature[]>(`/api/features?projectId=${encodeURIComponent(projectId)}`),
  createFeature: (projectId: string, name: string) =>
    request<Feature>('/api/features', {
      method: 'POST',
      body: JSON.stringify({ projectId, name }),
    }),
  deleteFeature: (id: string) => request<unknown>(`/api/features/${id}`, { method: 'DELETE' }),

  // Pending tasks only (the API's default)
  listTasks: (featureId: string) =>
    request<Task[]>(`/api/tasks?featureId=${encodeURIComponent(featureId)}`),
  createTask: (featureId: string, description: string, duration: 15 | 30) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ featureId, description, duration }),
    }),
  setTaskCompleted: (id: string, completed: boolean) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
  deleteTask: (id: string) => request<unknown>(`/api/tasks/${id}`, { method: 'DELETE' }),

  stats: () => request<Stats>('/api/tasks/stats'),
  timeline: (period: 'daily' | 'weekly' | 'monthly') =>
    request<{ period: string; data: TimelineEntry[] }>(
      `/api/tasks/stats/timeline?period=${period}`
    ),
};
