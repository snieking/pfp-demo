"use client";

import { useMegahub } from "../megahub-context";
import { useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const { authStatus, connectToMegahub, disconnectFromMegahub, isLoading } = useMegahub();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();

  const handleConnect = () => {
    queryClient.invalidateQueries();
  };

  const handleAuthenticate = () => {
    connectToMegahub();
  };

  const handleLogout = async () => {
    disconnect(undefined, {
      onSettled: () => {
        disconnectFromMegahub();
        queryClient.invalidateQueries();
        sessionStorage.removeItem("FT_LOGIN_KEY_STORE");
      },
    });
  };

  return {
    authStatus,
    isLoading,
    handleConnect,
    handleAuthenticate,
    handleLogout
  };
} 