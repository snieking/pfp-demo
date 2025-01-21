"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Pfp } from "@/hooks/dapp-api/types";
import { useAttachModel } from "@/hooks/dapp-api/useDappApi";
import { FileUploadModal } from "@/components/upload/file-upload-modal";
import { useMegahub } from "@/lib/megahub-connect/megahub-context";
import { Filehub, FilehubSettings, FsFile } from "filehub";
import { megahubConfig } from "../client-providers";
import { env } from "@/env";
import { ModelViewer } from "@/components/3d/model-viewer";

export function PfpCard(token: Pfp) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [modelError, setModelError] = useState(false);
  const { megahubSession } = useMegahub();
  const { mutate: attachModel } = useAttachModel();

  const prepareFileUrl = (fsFile: FsFile) => {
    return `${env.NEXT_PUBLIC_GATEWAY_URL}/${fsFile.hash.toString('hex')}`;
  };

  const handleFileSelected = async (file: File) => {
    try {
      if (!megahubSession) {
        throw new Error("No Megahub session found");
      }
      
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.fbx')) {
        throw new Error("Please upload an FBX file");
      }

      const filehub = new Filehub(megahubConfig as FilehubSettings);
      const fileBuffer = await file.arrayBuffer();
      const fileData = Buffer.from(fileBuffer);
      const fsFile = FsFile.fromData(fileData, { "Content-Type": "application/octet-stream" });
      await filehub.storeFile(megahubSession, fsFile);
      const url = prepareFileUrl(fsFile);
      attachModel({ token, modelUrl: url });
      setShowUploadModal(false);
    } catch (error) {
      console.error("Failed to handle file:", error);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden border border-blue-900/30 hover:border-blue-500/30 transition-colors">
      <div className="relative aspect-square">
        {token.model && !modelError ? (
          <div className="w-full h-full" style={{ minHeight: "300px" }}>
            <ModelViewer url={token.model} />
          </div>
        ) : (
          <Image
            src={token.image}
            alt={token.name}
            fill
            className="object-cover"
          />
        )}
      </div>
      
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold text-blue-100">{token.name}</h2>
        <p className="text-blue-200/80">{token.description}</p>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-100">Model</h3>
          <div className="space-y-2">
            {token.model ? (
              <div className="space-y-2">
                <p className="text-blue-200/80">
                  {modelError ? "Failed to load 3D model" : "3D model attached"}
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowUploadModal(true)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Replace Model
                  </Button>
                  <Button 
                    onClick={() => {
                      // TODO: Implement detach model functionality
                    }}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  >
                    Detach
                  </Button>
                </div>
              </div>
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
          onClose={() => setShowUploadModal(false)}
          onFileSelected={handleFileSelected}
        />
      )}

      {/* {isEquipping && (
        <EquipmentSelector
          onClose={() => setIsEquipping(false)}
          onEquip={handleEquip}
          currentEquipments={pfp.equipments}
        />
      )} */}
    </div>
  );
} 