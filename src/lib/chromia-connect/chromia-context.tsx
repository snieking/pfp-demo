"use client";

import type { Account, Eip1193Provider, Session } from "@chromia/ft4";
import {
  createKeyStoreInteractor,
  createSessionStorageLoginKeyStore,
  createWeb3ProviderEvmKeyStore,
  hours,
  hasAuthDescriptorFlags,
  ttlLoginRule,
  createSingleSigAuthDescriptorRegistration,
  registerAccount,
  registrationStrategy,
} from "@chromia/ft4";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IClient } from "postchain-client";
import { createClient, FailoverStrategy } from "postchain-client";
import type React from "react";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { z } from "zod";
import type { ChromiaConfig } from "./types";

const authStatuses = ["connected", "notRegistered", "disconnected"] as const;
const _AuthStatusSchema = z.enum(authStatuses);

export type AuthStatus = z.infer<typeof _AuthStatusSchema>;

type ChromiaContextType = {
  authStatus: AuthStatus;
  chromiaSession: Session | undefined;
  chromiaClient: IClient | undefined;
  connectToChromia: () => void;
  disconnectFromChromia: () => void;
  isLoading: boolean;
};

const ChromiaContext = createContext<ChromiaContextType | undefined>(undefined);
const AuthFlags = ["T"];

type ChromiaProviderProps = { config: ChromiaConfig };

const hasActiveSessionStorageLogin = async (account: Account) => {
  const loginKs = createSessionStorageLoginKeyStore();
  const sessionKs = await loginKs.getKeyStore(account.id);

  const id = sessionKs?.id;
  if (!id) {
    return false;
  }

  const disposableAds = await account.getAuthDescriptorsBySigner(id);
  const acceptableAds = disposableAds.filter((ad) =>
    hasAuthDescriptorFlags(ad, AuthFlags),
  );

  return acceptableAds.length > 0;
};

export const ChromiaProvider: React.FunctionComponent<
  PropsWithChildren<ChromiaProviderProps>
> = ({ children, config }) => {
  const { connector, isConnected } = useAccount();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected");
  const queryClient = useQueryClient();

  const { data: chromiaClient, isLoading: isChromiaClientLoading } = useQuery({
    queryKey: ["chromiaClient"],
    queryFn: async () => {
      const client = await createClient({
        ...config, failOverConfig: {
          attemptsPerEndpoint: 20,
          strategy: FailoverStrategy.TryNextOnError,
        }
      });

      return client;
    },
    enabled: isConnected,
    staleTime: Infinity,
  });

  const { data: chromiaSessionData, isLoading: isChromiaSessionLoading } =
    useQuery({
      queryKey: ["chromiaSession", isConnected, connector?.id],
      queryFn: async () => {
        if (!isConnected || !connector?.getProvider || !chromiaClient) {
          setAuthStatus("disconnected");
          return null;
        }

        const provider = (await connector.getProvider()) as Eip1193Provider;
        const evmKeyStore = await createWeb3ProviderEvmKeyStore(provider);
        const keyStoreInteractor = createKeyStoreInteractor(
          chromiaClient,
          evmKeyStore,
        );
        const [account] = await keyStoreInteractor.getAccounts();

        if (!account) {
          const authDescriptor = createSingleSigAuthDescriptorRegistration(
            ["A", "T"], // Permissions for the account
            evmKeyStore.id
          );
        
          const { session, logout } = await registerAccount(chromiaClient, evmKeyStore, registrationStrategy.open(authDescriptor));
          return { session, logout };
        }

        if (await hasActiveSessionStorageLogin(account)) {
          const evmKeyStoreInteractor = createKeyStoreInteractor(
            chromiaClient,
            evmKeyStore,
          );
          const { session, logout } = await evmKeyStoreInteractor.login({
            accountId: account.id,
            loginKeyStore: createSessionStorageLoginKeyStore(),
            config: {
              rules: ttlLoginRule(hours(12)),
              flags: AuthFlags,
            },
          });

          setAuthStatus("connected");
          return { session, logout };
        }

        setAuthStatus("disconnected");
        return null;
      },
      enabled: Boolean(chromiaClient) && isConnected && Boolean(connector),
      staleTime: Infinity,
      // Reduce unnecessary refetches
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    if (!isConnected) {
      queryClient.removeQueries({ queryKey: ["chromiaClient"] });
      queryClient.removeQueries({ queryKey: ["chromiaSession"] });
    }
  }, [isConnected, queryClient]);

  const connectToChromiaMutation = useMutation({
    mutationKey: ["chromiaSession", isConnected, connector?.id],
    mutationFn: async () => {
      // Prevent multiple concurrent connection attempts
      if (connectToChromiaMutation.isPending) {
        console.log("Connection already in progress");
        return null;
      }

      if (!isConnected || !connector || !chromiaClient) {
        console.log("Prerequisites not met:", { isConnected, hasConnector: !!connector, hasClient: !!chromiaClient });
        throw new Error("Not connected or missing Chromia client");
      }

      try {
        const provider = (await connector.getProvider()) as Eip1193Provider;
        const evmKeyStore = await createWeb3ProviderEvmKeyStore(provider);
        const keyStoreInteractor = createKeyStoreInteractor(
          chromiaClient,
          evmKeyStore,
        );
        const [account] = await keyStoreInteractor.getAccounts();

        if (account) {
          console.log("Found existing account, attempting login");
          const accountId = account.id;
          const evmKeyStoreInteractor = createKeyStoreInteractor(
            chromiaClient,
            evmKeyStore,
          );
          const { session, logout } = await evmKeyStoreInteractor.login({
            accountId,
            loginKeyStore: createSessionStorageLoginKeyStore(),
            config: {
              rules: ttlLoginRule(hours(12)),
              flags: AuthFlags,
            },
          });

          setAuthStatus("connected");
          console.log("Successfully logged in");
          return { session, logout };
        }

        console.log("No account found, registering new account");
        setAuthStatus("notRegistered");
        return { session: null, logout: null };
      } catch (error) {
        console.error("Connection error:", error);
        setAuthStatus("disconnected");
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData(
          ["chromiaSession", isConnected, connector?.id],
          data,
        );
      }
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      setAuthStatus("disconnected");
    }
  });

  const connectToChromia = useCallback(() => {
    if (connectToChromiaMutation.isPending) {
      console.log("Connection already in progress, skipping");
      return;
    }
    console.log("Initiating Chromia connection");
    connectToChromiaMutation.mutate();
  }, [connectToChromiaMutation]);

  const disconnectFromChromia = () => {
    if (chromiaSessionData?.logout) {
      void chromiaSessionData.logout();
    }
    queryClient.removeQueries({ queryKey: ["chromiaSession"] });
    setAuthStatus("disconnected");
  };

  const isLoading =
    isChromiaClientLoading ||
    isChromiaSessionLoading ||
    connectToChromiaMutation.isPending;

  const value: ChromiaContextType = {
    authStatus,
    chromiaSession: chromiaSessionData?.session,
    chromiaClient,
    connectToChromia,
    disconnectFromChromia,
    isLoading,
  };

  return (
    <ChromiaContext.Provider value={value}>{children}</ChromiaContext.Provider>
  );
};

export const useChromia = () => {
  const context = useContext(ChromiaContext);
  if (context === undefined) {
    throw new Error("useChromia must be used within a ChromiaProvider");
  }

  return context;
};
