---
id: 03-room-grandmas-house
title: Grandma's House
phase: 3
agent: room agent (grandmas-house)
status: in-review
branch: p3/room-grandmas-house
owns: [src/rooms/grandmas-house/, assets/rooms/grandmas-house/]
room_id: grandmas-house
order: 5
unlock_requires_stars: 8
depends_on: [02-r0-tiny-studio]
blocks: []
spec: "SPEC.md › Phase 3 › Room briefs (#5)"
---

# Room 5 — Grandma's House

## Room brief

| Field | Value |
| --- | --- |
| Room id | `grandmas-house` |
| Mission | 110 s / 5,500 coins |
| Room total | ~12,000 coins |
| Breakables | 35–50 |
| Treasure | Antique clay storage jar set |
| Signature mechanic | Very heavy jars need pounce from a height; rice cooker steams |
| Unlock | 8 total stars (room N needs 2 × (N − 1)) |
| Cosmetic reward | one hat or collar for 3 stars |

## Steps (shared brief for every room agent)

1. Read `AGENTS.md`, the spec, and `docs/room-template.md`. Copy `src/rooms/tiny-studio/` as the starting point.
2. Build the room geometry from shared CC0 packs and the palette texture; model only the room's signature props.
3. Fill `objects.json` within the coin and object-count targets above. Reuse shared props where they fit.
4. Add the signature mechanic in `room.ts` using only existing `special` behaviors and `RoomModule` triggers. Need a new engine feature? Open a change request (Agent rules) and stub around it; do not edit `src/physics/` or other systems.
5. Tune the Mission so a first-time player gets 1 star in 1–3 tries and 3 stars needs a planned route.
6. Pass the room checklist in `docs/room-template.md` and the Quality bars, then open one PR.

## Done when

Derived from the shared brief steps; the spec gives no explicit "Done when" for rooms.

- [ ] Room checklist in `docs/room-template.md` passes.
- [ ] Quality bars met (each extra room bundle 6 MB max; room load under 4 s on 4G phone / 2 s desktop).
- [ ] Mission tuned: 1 star in 1–3 tries for a first-time player; 3 stars needs a planned route.
- [ ] SPEC.md › Agent rules definition of done met; one PR opened.

Confined to `src/rooms/grandmas-house/` and `assets/rooms/grandmas-house/`. The room self-registers via `import.meta.glob`, so no shared file is edited.

## Kickoff prompt

```
You are the room agent for grandmas-house. Read AGENTS.md, docs/spec.md and docs/room-template.md.
Build only that room from the "Room briefs" table.
```
