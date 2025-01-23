"use client";

import { createContext, useContext, useState } from 'react';

interface UploadProgress {
  fileHash?: string;
  fileName?: string;
  progress: number;
  isComplete: boolean;
  status?: 'preparing' | 'uploading' | 'complete';
}

interface UploadProgressContextType {
  progress: UploadProgress;
  setProgress: (progress: UploadProgress) => void;
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined);

export function UploadProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<UploadProgress>({ progress: 0, isComplete: false });

  return (
    <UploadProgressContext.Provider value={{ progress, setProgress }}>
      {children}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const context = useContext(UploadProgressContext);
  if (!context) throw new Error('useUploadProgress must be used within UploadProgressProvider');
  return context;
} 