'use client';

import { SessionProvider } from 'next-auth/react';
import { ProjectProvider } from '@/contexts/ProjectContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProjectProvider>{children}</ProjectProvider>
    </SessionProvider>
  );
}
