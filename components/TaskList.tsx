"use client";

import { useEffect, useState } from "react";
import { Feature, Task } from "@/lib/types";

interface TaskListProps {
  projectId?: string;
  refreshKey?: number; // Triggers refetch when changed
}

interface FeatureWithTasks {
  feature: Feature;
  tasks: Task[];
  featureNumber: number;
}

export default function TaskList({ projectId, refreshKey }: TaskListProps) {
  const [featuresWithTasks, setFeaturesWithTasks] = useState<
    FeatureWithTasks[]
  >([]);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    if (!projectId) {
      // Reset state when no project is selected
      setFeaturesWithTasks([]);
      setTotalTasks(0);
      return;
    }

    const loadData = async () => {
      // Fetch features for this project
      const featuresRes = await fetch(`/api/features?projectId=${projectId}`);

      const features: Feature[] = await featuresRes.json();
      console.log("features", features);

      let total = 0;

      const featuresData: FeatureWithTasks[] = await Promise.all(
        features.map(async (feature, index) => {
          // Fetch tasks for each feature
          const tasksRes = await fetch(`/api/tasks?featureId=${feature.id}`);
          const tasks: Task[] = await tasksRes.json();
          total += tasks.length;
          return {
            feature,
            tasks,
            featureNumber: index + 1,
          };
        })
      );

      console.log("featuresData", featuresData);

      setFeaturesWithTasks(featuresData);
      setTotalTasks(total);
    };

    loadData();
  }, [projectId, refreshKey]); // Refetch when projectId or refreshKey changes

  if (!projectId) {
    return (
      <div className="p-4 font-mono text-sm text-gray-500">
        No active project. Create or switch to a project to see tasks.
      </div>
    );
  }

  if (featuresWithTasks.length === 0) {
    return (
      <div className="p-4 font-mono text-sm text-gray-500">
        No features yet. Create one with: new feature [name]
      </div>
    );
  }

  // if (totalTasks === 0) {
  //   return (
  //     <div className="p-4 font-mono text-sm text-gray-500">
  //       No pending tasks. Add one with: add task [description] [feature_id]
  //     </div>
  //   );
  // }

  return (
    <div className="p-4 font-mono text-sm">
      <div className="text-green-400 mb-3 border-b border-gray-700 pb-2">
        PENDING TASKS ({totalTasks})
      </div>
      <div className="space-y-4">
        {featuresWithTasks.map(({ feature, tasks, featureNumber }) => (
          <div key={feature.id} className="space-y-1">
            <div className="text-green-500 font-semibold">
              [{featureNumber}] {feature.name}
            </div>
            {tasks.length > 0 ? (
              <div className="ml-4 space-y-1">
                {tasks.map((task, taskIdx) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 text-gray-300"
                  >
                    <span className="text-green-500">
                      [{featureNumber}.{taskIdx + 1}]
                    </span>
                    <span className="flex-1">{task.description}</span>
                    <span className="text-gray-500 text-xs">{task.duration}min</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ml-4 text-gray-500 text-xs italic">
                (no tasks)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
