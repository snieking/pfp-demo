export type TokenMetadata = {
  properties: {
    models?: {
      [domain: string]: string;
    };
    [key: string]: any;
  };
}

export type BaseToken = {
  id: number;
  uid: Buffer;
  name: string;
  description: string;
  image: string;
  properties?: TokenMetadata['properties'];
}

export type Pfp = BaseToken & {
  model?: string;
  equipments?: Equipment[];
}

export type Equipment = BaseToken & {
  slot: string;
  weight: number;
  description: string;
}
