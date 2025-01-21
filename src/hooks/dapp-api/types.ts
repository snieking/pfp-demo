export type BaseToken = {
  project: string;
  collection: string;
  id: number;
  uid: Buffer;
  name: string;
  description: string;
  image: string;
}

export type Pfp = BaseToken & {
  model?: string;
}

export type FishingRod = BaseToken & {
  durability: number;
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