'use client';

import { useEffect, useState } from 'react';
import { Task } from '@/lib/types';
import { dbHelpers } from '@/lib/db';

interface TaskListProps {
  projectId?: string;
}

export default function TaskList({ projectId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    const loadTasks = async () => {
      const loadedTasks = await dbHelpers.getTasks(projectId);
      setTasks(loadedTasks);
    };

    loadTasks();

    // Poll for updates every 2 seconds
    const interval = setInterval(loadTasks, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="p-4 font-mono text-sm text-gray-500">
        No active project. Create or switch to a project to see tasks.
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="p-4 font-mono text-sm text-gray-500">
        No pending tasks. Add one with: add [description]
      </div>
    );
  }

  return (
    <div className="p-4 font-mono text-sm">
      <div className="text-green-400 mb-3 border-b border-gray-700 pb-2">
        PENDING TASKS ({tasks.length})
      </div>
      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div key={task.id} className="flex items-start gap-3 text-gray-300">
            <span className="text-green-500">[{idx + 1}]</span>
            <span className="flex-1">{task.description}</span>
            <span className="text-gray-500 text-xs">15min</span>
          </div>
        ))}
      </div>
    </div>
  );
}
