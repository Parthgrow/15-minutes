"use client";

import { useEffect, useState } from "react";
import { Feature, Task } from "@/lib/types";
import { dbHelpers } from "@/lib/db";

interface TaskListProps {
  projectId?: string;
}

interface FeatureWithTasks {
  feature: Feature;
  tasks: Task[];
  featureNumber: number;
}

export default function TaskList({ projectId }: TaskListProps) {
  const [featuresWithTasks, setFeaturesWithTasks] = useState<
    FeatureWithTasks[]
  >([]);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    if (!projectId) {
      setFeaturesWithTasks([]);
      setTotalTasks(0);
      return;
    }

    const loadData = async () => {
      const features = await dbHelpers.getFeatures(projectId);
      let total = 0;

      const featuresData: FeatureWithTasks[] = await Promise.all(
        features.map(async (feature, index) => {
          const tasks = await dbHelpers.getTasksByFeature(feature.id);
          total += tasks.length;
          return {
            feature,
            tasks,
            featureNumber: index + 1,
          };
        })
      );

      setFeaturesWithTasks(featuresData);
      setTotalTasks(total);
    };

    loadData();

    // Poll for updates every 2 seconds
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

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

  if (totalTasks === 0) {
    return (
      <div className="p-4 font-mono text-sm text-gray-500">
        No pending tasks. Add one with: add task [description] [feature_id]
      </div>
    );
  }

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
                    <span className="text-gray-500 text-xs">15min</span>
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
