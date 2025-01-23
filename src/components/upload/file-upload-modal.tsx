"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMegahub } from "@/lib/megahub-connect/megahub-context";
import { cn } from "@/lib/utils";

interface FileUploadModalProps {
  onClose: () => void;
  onFileSelected: (file: File) => void;
  progress?: { progress: number; isComplete: boolean };
}

export function FileUploadModal({ onClose, onFileSelected, progress }: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { authStatus, connectToMegahub, isLoading } = useMegahub();
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  }, [onFileSelected]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-blue-100">Upload File</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-blue-200 hover:text-blue-100"
          >
            <Cross2Icon className="h-4 w-4" />
          </Button>
        </div>

        {authStatus !== "connected" ? (
          <div className="space-y-4">
            <p className="text-blue-200">Please authenticate towards Megahub chain</p>
            <Button 
              onClick={connectToMegahub}
              className={cn(
                "w-full bg-blue-500 hover:bg-blue-600",
                isLoading && "opacity-80"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Authenticate with Megahub"
              )}
            </Button>
          </div>
        ) : (
          <>
            {progress && progress.progress > 0 ? (
              <div className="space-y-2">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <p className="text-sm text-blue-200 text-center">
                  {progress.isComplete ? 'Upload complete!' : `Uploading... ${Math.round(progress.progress)}%`}
                </p>
              </div>
            ) : (
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8
                  ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-blue-800'}
                  transition-colors duration-200
                  flex flex-col items-center justify-center
                  min-h-[200px]
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                  accept=".glb"
                />
                <div className="cursor-pointer text-center space-y-2">
                  <p className="text-blue-100 font-medium">
                    {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-blue-300 text-sm">or</p>
                  <Button 
                    type="button"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 