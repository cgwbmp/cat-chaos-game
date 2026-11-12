// Cosmetics catalog, shared by the shop (UI) and the cat. Items are bought with coins or
// unlocked by earning 3 stars in a room.
import type { SaveData } from './types';

export type CosmeticSlot = 'hat' | 'collar' | 'fur';

export interface CosmeticDef {
  id: string;
  name: string; // English, shown in the shop
  slot: CosmeticSlot;
  /** Color as [r, g, b], each 0..1. */
  color: readonly [number, number, number];
  /** Price in coins, for items sold in the shop. */
  price?: number;
  /** Room whose 3-star clear unlocks the item for free. */
  unlockRoom?: string;
}

export const COSMETICS: readonly CosmeticDef[] = [
  { id: 'fur_cream', name: 'Cream Fur', slot: 'fur', color: [0.98, 0.9, 0.76], price: 300 },
  { id: 'fur_gray', name: 'Gray Fur', slot: 'fur', color: [0.66, 0.68, 0.74], price: 300 },
  { id: 'fur_black', name: 'Black Fur', slot: 'fur', color: [0.24, 0.23, 0.28], price: 600 },
  { id: 'fur_pink', name: 'Pink Fur', slot: 'fur', color: [0.99, 0.74, 0.82], price: 1200 },
  { id: 'collar_red', name: 'Red Collar', slot: 'collar', color: [0.93, 0.36, 0.38], price: 200 },
  { id: 'collar_mint', name: 'Mint Collar', slot: 'collar', color: [0.5, 0.86, 0.74], price: 200 },
  { id: 'hat_party', name: 'Party Hat', slot: 'hat', color: [0.99, 0.62, 0.54], price: 500 },
  { id: 'hat_crown', name: 'Gold Crown', slot: 'hat', color: [1, 0.84, 0.36], price: 2500 },
  // One reward per room for 3 stars.
  {
    id: 'collar_bell',
    name: 'Bell Collar',
    slot: 'collar',
    color: [1, 0.85, 0.4],
    unlockRoom: 'tiny-studio',
  },
  {
    id: 'hat_cap',
    name: 'Clerk Cap',
    slot: 'hat',
    color: [0.45, 0.72, 0.95],
    unlockRoom: 'convenience-store',
  },
  {
    id: 'hat_beret',
    name: 'Barista Beret',
    slot: 'hat',
    color: [0.62, 0.44, 0.36],
    unlockRoom: 'cozy-cafe',
  },
  {
    id: 'collar_neon',
    name: 'Neon Collar',
    slot: 'collar',
    color: [0.56, 0.98, 0.5],
    unlockRoom: 'gaming-cafe',
  },
  {
    id: 'hat_bonnet',
    name: 'Knit Bonnet',
    slot: 'hat',
    color: [0.93, 0.78, 0.86],
    unlockRoom: 'grandmas-house',
  },
  {
    id: 'collar_star',
    name: 'Star Collar',
    slot: 'collar',
    color: [0.85, 0.6, 0.98],
    unlockRoom: 'pop-star-dorm',
  },
  {
    id: 'hat_scholar',
    name: 'Scholar Hat',
    slot: 'hat',
    color: [0.3, 0.3, 0.36],
    unlockRoom: 'wooden-house',
  },
  {
    id: 'hat_towel',
    name: 'Towel Hat',
    slot: 'hat',
    color: [0.98, 0.97, 0.92],
    unlockRoom: 'bathhouse',
  },
];

export function findCosmetic(id: string | undefined): CosmeticDef | undefined {
  return COSMETICS.find((item) => item.id === id);
}

/** Owned = bought, or its room has 3 stars. */
export function isCosmeticOwned(item: CosmeticDef, save: Readonly<SaveData>): boolean {
  if (save.cosmetics.owned.includes(item.id)) return true;
  return item.unlockRoom !== undefined && save.rooms[item.unlockRoom]?.stars === 3;
}
