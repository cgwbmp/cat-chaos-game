// Pure helpers for the UI, free of the DOM so they can be unit tested.
import type { BrokenObject, LevelResult, RoomDef, SaveData } from '../core/types';

/** 65 -> "1:05". Negative values show as 0:00. */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** 12500 -> "12,500". */
export function formatCoins(coins: number): string {
  return Math.round(coins).toLocaleString('en-US');
}

export function totalStars(save: Readonly<SaveData>): number {
  return Object.values(save.rooms).reduce((sum, room) => sum + room.stars, 0);
}

export function isRoomUnlocked(room: RoomDef, save: Readonly<SaveData>): boolean {
  return totalStars(save) >= room.unlock.requiresStars;
}

/** Free Soul opens once the room's Mission has been cleared (1 star or more). */
export function isFreeSoulUnlocked(room: RoomDef, save: Readonly<SaveData>): boolean {
  return (save.rooms[room.id]?.stars ?? 0) >= 1;
}

export interface BrokenGroup {
  name: string;
  count: number;
  coins: number;
}

/** Results list: one row per object name, most valuable first. */
export function groupBroken(broken: readonly BrokenObject[]): BrokenGroup[] {
  const groups = new Map<string, BrokenGroup>();
  for (const { name, coins } of broken) {
    const group = groups.get(name) ?? { name, count: 0, coins: 0 };
    group.count++;
    group.coins += coins;
    groups.set(name, group);
  }
  return [...groups.values()].sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
}

/**
 * Mission progress bar. The bar's full width is 150% of the target (the 2-star mark); the
 * 1-star mark sits at two thirds.
 */
export function missionProgress(coins: number, targetCoins: number): number {
  if (targetCoins <= 0) return 1;
  return Math.min(1, Math.max(0, coins / (targetCoins * 1.5)));
}

export function resultTitle(result: LevelResult): string {
  if (result.mode === 'free-soul') return 'Room Cleared!';
  return result.stars > 0 ? 'Mission Complete!' : 'The Owner Is Home!';
}

/** The room after `roomId` in level-select order, if any. */
export function nextRoom(rooms: readonly RoomDef[], roomId: string): RoomDef | undefined {
  const index = rooms.findIndex((room) => room.id === roomId);
  return index === -1 ? undefined : rooms[index + 1];
}
