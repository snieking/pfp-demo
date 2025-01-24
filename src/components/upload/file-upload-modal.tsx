"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useMegahub } from "@/lib/megahub-connect/megahub-context";
import { cn } from "@/lib/utils";

interface FileUploadModalProps {
  onClose: () => void;
  onFileSelected: (file: File, domain: string) => void;
  progress?: { progress: number; isComplete: boolean; fileName?: string; status?: string };
  existingDomains?: string[];
  replaceDomain?: string | null;
}

export function FileUploadModal({ onClose, onFileSelected, progress, existingDomains = [], replaceDomain }: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [domain, setDomain] = useState(replaceDomain || '');
  const [showDomainInput, setShowDomainInput] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'new' | null>(replaceDomain ? 'replace' : null);
  const { authStatus, connectToMegahub, isLoading } = useMegahub();
  
  useEffect(() => {
    if (replaceDomain) {
      setDomain(replaceDomain);
      setUploadMode('replace');
    }
  }, [replaceDomain]);

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
      setSelectedFile(files[0]);
      if (replaceDomain) {
        setShowDomainInput(true);
      } else if (existingDomains.length > 0) {
        setUploadMode(null); // Show mode selection
      } else {
        setShowDomainInput(true); // Skip mode selection if no existing domains
      }
    }
  }, [existingDomains.length, replaceDomain]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      if (replaceDomain) {
        setShowDomainInput(true);
      } else if (existingDomains.length > 0) {
        setUploadMode(null); // Show mode selection
      } else {
        setShowDomainInput(true); // Skip mode selection if no existing domains
      }
    }
  }, [existingDomains.length, replaceDomain]);

  const handleSubmit = useCallback(() => {
    if (!selectedFile || !domain.trim()) return;
    onFileSelected(selectedFile, domain.trim());
    setShowDomainInput(false);
    setSelectedFile(null);
    setDomain('');
    setUploadMode(null);
  }, [domain, selectedFile, onFileSelected]);

  const resetState = useCallback(() => {
    setShowDomainInput(false);
    setSelectedFile(null);
    setDomain(replaceDomain || '');
    setUploadMode(replaceDomain ? 'replace' : null);
  }, [replaceDomain]);

  const renderModeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="text-xl font-semibold text-blue-100">What would you like to do?</h4>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {existingDomains.length > 0 && (
          <button
            onClick={() => {
              setUploadMode('replace');
              setShowDomainInput(true);
            }}
            className={cn(
              "w-full p-6 rounded-xl text-left transition-all duration-200",
              "bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20",
              "border border-blue-500/20 hover:border-blue-500/40",
              "group relative overflow-hidden"
            )}
          >
            <div className="relative z-10 space-y-2">
              <h3 className="text-lg font-semibold text-blue-100 flex items-center gap-3">
                Replace Existing Model
              </h3>
              <p className="text-sm text-blue-200/80">
                Update a model for an existing domain
              </p>
            </div>
          </button>
        )}
        <button
          onClick={() => {
            setUploadMode('new');
            setShowDomainInput(true);
          }}
          className={cn(
            "w-full p-6 rounded-xl text-left transition-all duration-200",
            "bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20",
            "border border-emerald-500/20 hover:border-emerald-500/40",
            "group relative overflow-hidden"
          )}
        >
          <div className="relative z-10 space-y-2">
            <h3 className="text-lg font-semibold text-emerald-100 flex items-center gap-3">
              Add New Domain
            </h3>
            <p className="text-sm text-emerald-200/80">
              Create a model for a new domain
            </p>
          </div>
        </button>
      </div>
      <div className="flex justify-center pt-2">
        <Button
          onClick={resetState}
          variant="ghost"
          className="text-blue-200 hover:text-blue-100 text-sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl max-w-md w-full border border-white/5">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-semibold text-blue-100">Upload Model</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-blue-200 hover:text-blue-100 rounded-full"
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
              {progress && progress.status ? (
                <div className="space-y-2">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-300",
                        progress.isComplete ? "bg-emerald-500" : "bg-blue-500"
                      )}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-center space-y-1">
                    {progress.isComplete ? (
                      <>
                        <p className="text-emerald-400">Upload complete!</p>
                        {progress.fileName && (
                          <p className="text-blue-200/80">Successfully uploaded {progress.fileName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-blue-200">
                        {progress.status === 'preparing' ? (
                          <>Preparing {progress.fileName} for upload...</>
                        ) : (
                          <>Uploading{progress.fileName ? ` ${progress.fileName}` : ''}... {Math.round(progress.progress)}%</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ) : selectedFile && !showDomainInput ? (
                renderModeSelection()
              ) : showDomainInput ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-blue-200">
                      {uploadMode === 'replace' ? 'Select Domain to Replace' : 'Enter New Domain Name'}
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder={uploadMode === 'replace' ? 'Select from existing domains' : 'e.g. The Sandbox, Decentraland'}
                      className={cn(
                        "w-full px-4 py-3 bg-slate-800/50 rounded-xl",
                        "border border-blue-900/50 focus:border-blue-500/50",
                        "text-blue-100 placeholder:text-blue-400/30",
                        "transition-colors duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      )}
                      readOnly={uploadMode === 'replace'}
                    />
                    {uploadMode === 'replace' && existingDomains.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {existingDomains.map(d => (
                          <button
                            key={d}
                            onClick={() => setDomain(d)}
                            className={cn(
                              "px-3 py-1.5 text-sm rounded-lg transition-all duration-200",
                              "border border-blue-800/50",
                              domain === d ? (
                                "bg-blue-500/20 border-blue-500/50 text-blue-100"
                              ) : (
                                "hover:bg-blue-500/10 hover:border-blue-500/30 text-blue-200"
                              )
                            )}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={resetState}
                      variant="outline"
                      className={cn(
                        "flex-1 border-blue-900/50 hover:bg-blue-500/10",
                        "hover:border-blue-500/50 transition-colors duration-200"
                      )}
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={!domain.trim() || !selectedFile}
                      className={cn(
                        "flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50",
                        "transition-colors duration-200"
                      )}
                    >
                      Upload
                    </Button>
                  </div>
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
    </div>
  );
} 