# Room lighting moods

**Status:** approved by the owner on 2026-11-13 and applied.

## Problem

Every room was lit by the same neutral daylight. The rendering system had no way to know which time of day a room wants or which of its objects are lamps: `RoomDef` carried nothing about light.

## Change

`src/core/types.ts` gains two types and one optional field. Nothing existing changes.

```ts
export type LightingMood = 'day' | 'sunrise' | 'sunset' | 'night';
export type LightTone = 'warm' | 'cool';

export interface RoomLighting {
  mood: LightingMood;
  lamps?: Record<string, LightTone>; // ObjectDef ids that shine until they break
  fixtures?: { at: Vec3; tone: LightTone }[]; // fixed lights that cannot break
}

export interface RoomDef {
  // ...
  lighting?: RoomLighting; // neutral daylight when left out
}
```

## Who it affects

- **Rendering (`src/engine/`)** reads the field on `level/loaded` and owns all lights (`lighting.ts`).
- **Rooms (`src/rooms/`)** may set the field in `index.ts`. A room without it looks as before, so the dev rooms and any room in progress need no change.
- No other system reads it. No event or service interface changed.
