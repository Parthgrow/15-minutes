"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import JellyBeanJar from "@/components/JellyBeanJar";
import TaskList from "@/components/TaskList";
import CompletionAnimation from "@/components/CompletionAnimation";

export default function Home() {
  const [currentProjectId, setCurrentProjectId] = useState<
    string | undefined
  >();
  const [showCelebration, setShowCelebration] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Triggers TaskList refetch
  const { data: session } = useSession();
  const router = useRouter();

  const handleTaskComplete = () => {
    setShowCelebration(true);
    // Also refresh task list when task is completed
    setRefreshKey((k) => k + 1);
  };

  const handleTaskAdded = () => {
    // Trigger TaskList refetch when task is added
    setRefreshKey((k) => k + 1);
  };

  const handleFeatureAdded = () => {
    // Trigger TaskList refetch when feature is added
    setRefreshKey((k) => k + 1);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login", redirect: true });
  };

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-green-400 font-bold text-lg font-mono">
            15 MINUTES
          </div>
          <div className="text-gray-600 text-sm font-mono">v1.0.0</div>
        </div>
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <div className="text-gray-500 text-xs font-mono hidden sm:block">
              {session.user.email}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-green-400 font-mono text-sm px-3 py-1 border border-gray-700 hover:border-green-500 rounded transition-colors"
          >
            Logout
          </button>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Jelly Bean Jar & Tasks */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          {/* Jelly Bean Jar */}
          <div className="border-b border-gray-800">
            <JellyBeanJar />
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            <TaskList projectId={currentProjectId} refreshKey={refreshKey} />
          </div>
        </div>

        {/* Right Panel - Terminal Interface */}
        <div className="flex-1 flex flex-col">
          <ChatInterface
            currentProjectId={currentProjectId}
            onTaskComplete={handleTaskComplete}
            onProjectChange={setCurrentProjectId}
            onTaskAdded={handleTaskAdded}
            onFeatureAdded={handleFeatureAdded}
          />
        </div>
      </div>

      {/* Completion Animation */}
      <CompletionAnimation
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  );
}
