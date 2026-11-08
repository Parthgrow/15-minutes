'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ProjectContextValue {
  currentProjectId: string | undefined;
  setCurrentProjectId: (id: string | undefined) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<string | undefined>(undefined);

  // Restore after mount so the server and client render the same first frame
  useEffect(() => {
    const stored = localStorage.getItem('lastProjectId');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from localStorage
    if (stored) setCurrentProjectIdState(stored);
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('lastProjectId', currentProjectId);
    }
  }, [currentProjectId]);

  const setCurrentProjectId = (id: string | undefined) => {
    setCurrentProjectIdState(id);
    if (!id) localStorage.removeItem('lastProjectId');
  };

  return (
    <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within a ProjectProvider');
  return ctx;
}
