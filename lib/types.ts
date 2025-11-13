export interface Project {
  id: string;
  name: string;
  createdAt: number;
  tasksCompleted: number;
}

export interface Task {
  id: string;
  projectId: string;
  description: string;
  completedAt: number | null;
  createdAt: number;
  duration: number; // in minutes, default 15
}

export interface Streak {
  id: string;
  partnerId: string;
  partnerName: string;
  currentStreak: number;
  lastCompletedDate: string;
  longestStreak: number;
}

export interface SharedTask {
  id: string;
  taskId: string;
  taskDescription: string;
  sharedWith: string;
  sharedAt: number;
}

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}
