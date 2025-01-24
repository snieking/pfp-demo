"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Pfp } from "@/hooks/dapp-api/types";
import { useAttachModel } from "@/hooks/dapp-api/useDappApi";
import { FileUploadModal } from "@/components/upload/file-upload-modal";
import { useMegahub } from "@/lib/megahub-connect/megahub-context";
import { Filehub, FilehubSettings, FsFile, IChunkLocation } from "filehub";
import { megahubConfig } from "../client-providers";
import { env } from "@/env";
import { ModelViewer } from "@/components/3d/model-viewer";
import { useUploadProgress } from "@/lib/upload/upload-progress-context";
import { clamp } from "three/src/math/MathUtils.js";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface UploadProgress {
  progress: number;
  isComplete: boolean;
  fileName?: string;
  status?: string;
}

export function PfpCard(token: Pfp) {
  console.log('PfpCard rendering');
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [showModel, setShowModel] = useState(true);
  const [isReplacing, setIsReplacing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | undefined>(undefined);
  const { progress, setProgress } = useUploadProgress();
  const { megahubSession, disconnectFromMegahub } = useMegahub();
  const { mutate: attachModel } = useAttachModel();

  const models = token.properties?.models || {};
  const domains = Object.keys(models);
  
  // Initialize selectedDomain with the first domain if available
  const [selectedDomain, setSelectedDomain] = useState<string | null>(
    () => domains.length > 0 ? domains[0] : null
  );

  const selectedModelUrl = selectedDomain ? models[selectedDomain] : null;

  const truncateHash = (url: string) => {
    const hash = url.split('/').pop() || '';
    if (hash.length <= 8) return hash;
    return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
  };

  const prepareFileUrl = (fsFile: FsFile) => {
    return `${env.NEXT_PUBLIC_GATEWAY_URL}/${fsFile.hash.toString('hex')}`;
  };

  const handleFileSelected = async (file: File, domain: string) => {
    try {
      if (!megahubSession) {
        throw new Error("No Megahub session found");
      }
      
      if (!file.name.toLowerCase().endsWith('.glb')) {
        throw new Error("Please upload a valid GLB file");
      }

      setProgress({
        progress: 0,
        isComplete: false,
        fileName: file.name,
        status: 'preparing'
      });

      const filehub = new Filehub(megahubConfig as FilehubSettings);

      filehub.on('onProgress', async (progress: number, status: string) => {
        setProgress({
          fileHash: fsFile.hash.toString('hex'),
          fileName: file.name,
          progress: clamp(progress, 0, 100),
          isComplete: progress >= 100,
          status: 'uploading'
        });
      });

      filehub.on('onFileStored', async (fileHash: Buffer) => {
        setProgress({
          fileHash: fileHash.toString('hex'),
          fileName: file.name,
          progress: 100,
          isComplete: true,
          status: 'complete'
        });
      });

      const fileBuffer = await file.arrayBuffer();
      const fileData = Buffer.from(fileBuffer);
      const fsFile = FsFile.fromData(fileData, { "Content-Type": "application/octet-stream" });

      setProgress({
        fileHash: fsFile.hash.toString('hex'),
        fileName: file.name,
        progress: 0,
        isComplete: false,
        status: 'uploading'
      });
      await filehub.storeFile(megahubSession, fsFile);
      
      const url = prepareFileUrl(fsFile);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      attachModel({ token, domain, modelUrl: url });
      setShowUploadModal(false);
      disconnectFromMegahub();

      setProgress({
        fileHash: undefined,
        fileName: undefined,
        progress: 0,
        isComplete: false
      });
    } catch (error) {
      console.error("Failed to handle file:", error);
      setProgress({ progress: 0, isComplete: false });
    }
  };

  const cycleNextModel = useCallback(() => {
    if (domains.length === 0) return;
    const currentIndex = domains.indexOf(selectedDomain || domains[0]);
    const nextIndex = (currentIndex + 1) % domains.length;
    setSelectedDomain(domains[nextIndex]);
  }, [domains, selectedDomain]);

  const cyclePrevModel = useCallback(() => {
    if (domains.length === 0) return;
    const currentIndex = domains.indexOf(selectedDomain || domains[0]);
    const prevIndex = (currentIndex - 1 + domains.length) % domains.length;
    setSelectedDomain(domains[prevIndex]);
  }, [domains, selectedDomain]);

  const handleUploadClick = useCallback(() => {
    setIsReplacing(false);
    setSelectedDomain(null);
    setShowUploadModal(true);
  }, []);

  const handleReplace = useCallback(() => {
    setIsReplacing(true);
    setSelectedDomain(selectedDomain);
    setShowUploadModal(true);
  }, [selectedDomain]);

  // Add debug logs
  useEffect(() => {
    if (selectedModelUrl) {
      console.log('PfpCard rendering ModelViewer with URL:', selectedModelUrl);
    }
  }, [selectedModelUrl]);

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-blue-900/30 hover:border-blue-500/30 transition-colors">
      <div className="relative aspect-square">
        {selectedModelUrl && !modelError && showModel ? (
          <div className="w-full h-full" style={{ minHeight: "300px" }}>
            {/* Debug log */}
            <ModelViewer url={selectedModelUrl} />
            {domains.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cyclePrevModel}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleNextModel}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-sm text-white/90">{selectedDomain}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <Image
            src={token.image}
            alt={token.name}
            fill
            className="object-cover"
          />
        )}
        {selectedModelUrl && !modelError && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowModel(!showModel)}
            className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
          >
            {showModel ? (
              <Image className="w-4 h-4" src={token.image} alt="Show 2D" width={16} height={16} />
            ) : (
              <div className="w-4 h-4">3D</div>
            )}
          </Button>
        )}
      </div>
      
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-blue-100">{token.name}</h2>
        <p className="text-blue-200/80">{token.description}</p>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-100">3D Models</h3>
          <div className="space-y-4">
            {domains.length > 0 ? (
              <>
                <div className="space-y-2">
                  {domains.map(domain => (
                    <div 
                      key={domain}
                      className={cn(
                        "p-3 rounded-lg border transition-colors",
                        selectedDomain === domain ? "bg-blue-900/30 border-blue-700" : "border-blue-800/50 hover:border-blue-700"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelectedDomain(selectedDomain === domain ? null : domain)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-blue-100">{domain}</p>
                          <p className="text-sm text-blue-300 truncate">
                            <a 
                              href={models[domain]} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-blue-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {truncateHash(models[domain])}
                            </a>
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUploadModal(true);
                            setSelectedDomain(domain);
                          }}
                          className="shrink-0 text-blue-200 hover:text-blue-100"
                        >
                          Replace
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleUploadClick}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700"
                >
                  Upload Model
                </button>
              </>
            ) : (
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                Attach Model
              </Button>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <FileUploadModal
          onClose={() => {
            setShowUploadModal(false);
            setSelectedDomain(null);
            setUploadProgress(undefined);
            setIsReplacing(false);
          }}
          onFileSelected={handleFileSelected}
          progress={uploadProgress}
          existingDomains={Object.keys(token?.properties?.models || {})}
          replaceDomain={isReplacing ? selectedDomain : null}
        />
      )}
    </div>
  );
} 