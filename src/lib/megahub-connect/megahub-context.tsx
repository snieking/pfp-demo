"use client";

import type { Account, Eip1193Provider, Session } from "@chromia/ft4";
import {
  createKeyStoreInteractor,
  createInMemoryLoginKeyStore,
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
import { createContext, useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { z } from "zod";
import type { ChromiaConfig } from "./types";

const authStatuses = ["connected", "notRegistered", "disconnected"] as const;
const _AuthStatusSchema = z.enum(authStatuses);

export type AuthStatus = z.infer<typeof _AuthStatusSchema>;

type MegahubContextType = {
  authStatus: AuthStatus;
  megahubSession: Session | undefined;
  megahubClient: IClient | undefined;
  connectToMegahub: () => void;
  disconnectFromMegahub: () => void;
  isLoading: boolean;
};

const MegahubContext = createContext<MegahubContextType | undefined>(undefined);
const AuthFlags = ["T"];

type MegahubProviderProps = { config: ChromiaConfig };

const hasActiveSessionStorageLogin = async (account: Account) => {
  const loginKs = createInMemoryLoginKeyStore();
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

export const MegahubProvider: React.FunctionComponent<
  PropsWithChildren<MegahubProviderProps>
> = ({ children, config }) => {
  const { connector, isConnected } = useAccount();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected");
  const queryClient = useQueryClient();

  const { data: megahubClient, isLoading: isMegahubClientLoading } = useQuery({
    queryKey: ["megahubClient"],
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

  const { data: megahubSessionData, isLoading: isMegahubSessionLoading } =
    useQuery({
      queryKey: ["megahubSession", isConnected, connector?.id],
      queryFn: async () => {
        if (!isConnected || !connector?.getProvider || !megahubClient) {
          setAuthStatus("disconnected");
          return null;
        }

        const provider = (await connector.getProvider()) as Eip1193Provider;
        const evmKeyStore = await createWeb3ProviderEvmKeyStore(provider);
        const keyStoreInteractor = createKeyStoreInteractor(
          megahubClient,
          evmKeyStore,
        );
        const [account] = await keyStoreInteractor.getAccounts();

        if (!account) {
          const authDescriptor = createSingleSigAuthDescriptorRegistration(
            ["A", "T"], // Permissions for the account
            evmKeyStore.id
          );
        
          const { session, logout } = await registerAccount(megahubClient, evmKeyStore, registrationStrategy.open(authDescriptor));
          return { session, logout };
        }

        if (await hasActiveSessionStorageLogin(account)) {
          const evmKeyStoreInteractor = createKeyStoreInteractor(
            megahubClient,
            evmKeyStore,
          );
          const { session, logout } = await evmKeyStoreInteractor.login({
            accountId: account.id,
            loginKeyStore: createInMemoryLoginKeyStore(),
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
      enabled: Boolean(megahubClient) && isConnected && Boolean(connector),
      staleTime: Infinity,
      // Reduce unnecessary refetches
      refetchOnWindowFocus: false,
    });

  useEffect(() => {
    if (!isConnected) {
      queryClient.removeQueries({ queryKey: ["megahubClient"] });
      queryClient.removeQueries({ queryKey: ["megahubSession"] });
    }
  }, [isConnected, queryClient]);

  const connectToMegahubMutation = useMutation({
    mutationKey: ["megahubSession", isConnected, connector?.id],
    mutationFn: async () => {
        if (isConnected && connector && megahubClient) {
        const provider = (await connector.getProvider()) as Eip1193Provider;
        const evmKeyStore = await createWeb3ProviderEvmKeyStore(provider);
        const keyStoreInteractor = createKeyStoreInteractor(
          megahubClient,
          evmKeyStore,
        );
        const [account] = await keyStoreInteractor.getAccounts();

        if (account) {
          const accountId = account.id;
          const evmKeyStoreInteractor = createKeyStoreInteractor(
            megahubClient,
            evmKeyStore,
          );
          const { session, logout } = await evmKeyStoreInteractor.login({
            accountId,
            loginKeyStore: createInMemoryLoginKeyStore(),
            config: {
              rules: ttlLoginRule(hours(12)),
              flags: AuthFlags,
            },
          });

          setAuthStatus("connected");

          return { session, logout };
        }

        setAuthStatus("notRegistered");

        return { session: null, logout: null };
      }

      throw new Error("Not connected or missing Chromia client");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["megahubSession", isConnected, connector?.id],
        data,
      );
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const connectToMegahub = () => {
    connectToMegahubMutation.mutate();
  };

  const disconnectFromMegahub = () => {
    if (megahubSessionData?.logout) {
      void megahubSessionData.logout();
    }
    queryClient.removeQueries({ queryKey: ["megahubSession"] });
    setAuthStatus("disconnected");
  };

  const isLoading =
    isMegahubClientLoading ||
    isMegahubSessionLoading ||
    connectToMegahubMutation.isPending;

  const value: MegahubContextType = {
    authStatus,
    megahubSession: megahubSessionData?.session,
    megahubClient,
    connectToMegahub,
    disconnectFromMegahub,
    isLoading,
  };

  return (
    <MegahubContext.Provider value={value}>{children}</MegahubContext.Provider>
  );
};

export const useMegahub = () => {
  const context = useContext(MegahubContext);
  if (context === undefined) {
    throw new Error("useMegahub must be used within a MegahubProvider");
  }

  return context;
};
