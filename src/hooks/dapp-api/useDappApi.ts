import { useChromia } from '@/lib/chromia-connect/chromia-context';
import { noopAuthenticator, nop, op } from '@chromia/ft4';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BaseToken, Pfp, TokenMetadata } from './types';
import { convertIpfsToGatewayUrl } from '@/lib/utils';

export function useAllPfps() {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['all_pfps'],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      try {

      const avatars = await chromiaSession.query<Pfp[]>('pfps.get_all', {
        account_id: chromiaSession.account.id,
      });

      // Fetch metadata for each token
      const tokensWithMetadata = await Promise.all(
        avatars.map(async (token) => {
          const metadata = await chromiaSession.query<TokenMetadata>('yours.metadata_by_uid', {
            uid: token.uid,
          });

          return {
            ...token,
            image: convertIpfsToGatewayUrl(token.image),
            properties: metadata?.properties || {}
          };
        })
      );

      return tokensWithMetadata;
    } catch (error) {
      console.error('Error fetching tokens with metadata:', error);
      throw error;
    }
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}

export function useTokenMetadata(uid: Buffer | undefined) {
  const { chromiaSession, chromiaClient } = useChromia();

  return useQuery({
    queryKey: ['token_metadata', uid?.toString('hex')],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession || !uid) {
        throw new Error('Not connected to Chromia or no token UID provided');
      }

      const metadata = await chromiaSession.query<TokenMetadata>('yours.metadata_by_uid', {
        uid: uid,
      });

      return metadata;
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && Boolean(uid),
  });
}

export function useAttachModel() {
  const { chromiaSession, chromiaClient } = useChromia();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, domain, modelUrl }: { token: Pfp, domain: string, modelUrl: string }) => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      await chromiaSession.transactionBuilder()
        .add(op('pfps.attach_model',
          token.uid,
          domain,
          modelUrl,
        ), { authenticator: noopAuthenticator })
        .add(nop())
        .buildAndSend();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_pfps'] });
    }
  })
}

export function useAllFishingRods() {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['all_fishing_rods'],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      const rods = await chromiaSession.query<Pfp[]>('fishing.get_rods', {
        account_id: chromiaSession.account.id,
      });

      return rods.map(rod => ({
        ...rod,
        image: convertIpfsToGatewayUrl(rod.image)
      }));
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}


