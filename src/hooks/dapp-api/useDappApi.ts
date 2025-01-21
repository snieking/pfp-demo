import { useChromia } from '@/lib/chromia-connect/chromia-context';
import { noopAuthenticator, nop, op } from '@chromia/ft4';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BaseToken, FishingRod, Pfp } from './types';
import { convertIpfsToGatewayUrl } from '@/lib/utils';

export function useEquippedPfp() {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['get_equipped_pfp'],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      const pfp = await chromiaSession.query<Pfp>('pfps.get_equipped', {
        account_id: chromiaSession.account.id,
      });

      console.log(`equipped for account ${chromiaSession.account.id.toString('hex')}:`, pfp);

      if (!pfp) return null;
      
      return {
        ...pfp,
        image: convertIpfsToGatewayUrl(pfp.image)
      };
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}

export function useAllPfps() {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['all_pfps'],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      const avatars = await chromiaSession.query<Pfp[]>('pfps.get_all', {
        account_id: chromiaSession.account.id,
      });
      
      return avatars.map(avatar => ({
        ...avatar,
        image: convertIpfsToGatewayUrl(avatar.image)
      }));
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}

export function useAttachModel() {
  const { chromiaSession, chromiaClient } = useChromia();

  return useMutation({
    mutationFn: async ({ token, modelUrl }: { token: Pfp, modelUrl: string }) => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      await chromiaSession.transactionBuilder().add(op('pfps.attach_model', 
        token.uid,
        modelUrl,
      ), { authenticator: noopAuthenticator })
      .buildAndSend();
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

export type InventoryItem = BaseToken & {
  amount: number;
}

export type Equipment = BaseToken & {
  slot: string;
  weight: number;
  description: string;
}

export type Armor = Equipment & {
  defense: number;
}

export type Weapon = Equipment & {
  damage: number;
}

export function useEquipments(slot: string = 'all') {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['armor', slot],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      const armor = await chromiaSession.query<Armor[]>('equipments.get_all', {
        account_id: chromiaSession.account.id,
        slot
      });
      
      return armor.map(piece => ({
        ...piece,
        image: convertIpfsToGatewayUrl(piece.image)
      }));
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}

export function useWeapons() {
  const { chromiaSession, chromiaClient, authStatus } = useChromia();

  return useQuery({
    queryKey: ['weapons'],
    queryFn: async () => {
      if (!chromiaClient || !chromiaSession) {
        throw new Error('Not connected to Chromia');
      }

      const weapons = await chromiaSession.query<Weapon[]>('equipments.get_weapon', {
        account_id: chromiaSession.account.id
      });
      
      return weapons.map(weapon => ({
        ...weapon,
        image: convertIpfsToGatewayUrl(weapon.image)
      }));
    },
    enabled: Boolean(chromiaClient) && Boolean(chromiaSession) && authStatus === 'connected',
  });
}
