"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMegahub } from "@/lib/megahub-connect/megahub-context";

interface FileUploadModalProps {
  onClose: () => void;
  onFileSelected: (file: File) => void;
}

export function FileUploadModal({ onClose, onFileSelected }: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { authStatus, connectToMegahub } = useMegahub();
  
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
            <p className="text-blue-200">Please authenticate with Megahub chain to upload files</p>
            <Button 
              onClick={connectToMegahub}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Authenticate with Megahub
            </Button>
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
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-center space-y-2"
            >
              <p className="text-blue-100 font-medium">
                {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
              </p>
              <p className="text-blue-300 text-sm">or</p>
              <Button 
                type="button"
                className="bg-blue-500 hover:bg-blue-600"
              >
                Browse Files
              </Button>
            </label>
          </div>
        )}
      </div>
    </div>
  );
} 