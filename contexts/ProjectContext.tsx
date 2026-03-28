'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface ProjectContextValue {
  currentProjectId: string | undefined;
  setCurrentProjectId: (id: string | undefined) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectIdState] = useState<string | undefined>(
    () => {
      if (typeof window === 'undefined') return undefined;
      return localStorage.getItem('lastProjectId') ?? undefined;
    }
  );

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
