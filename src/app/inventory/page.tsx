"use client";

import { useEffect, useState } from "react";
import { useAllPfps } from "@/hooks/dapp-api/useDappApi";
import { PfpCard } from "@/app/inventory/pfp-card";
import { useAuth } from "@/lib/chromia-connect/hooks/use-auth";


export default function InventoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { authStatus } = useAuth();
  const { data: pfps, isLoading: isPfpsLoading } = useAllPfps();

  if (authStatus !== "connected") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-blue-200">Please connect your wallet to view your inventory</p>
      </div>
    );
  }

  if (isPfpsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  console.log(`Pfps:`, pfps);

  if (!pfps) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-blue-200">No PFPs found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 text-blue-100">My PFPs</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pfps.map((pfp) => (
          <PfpCard key={pfp.id} {...pfp} />
        ))}
      </div>
    </div>
  );
}
