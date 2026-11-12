---
id: 03-room-pop-star-dorm
title: Pop Star Dorm
phase: 3
agent: room agent (pop-star-dorm)
status: in-review
branch: p3/room-pop-star-dorm
owns: [src/rooms/pop-star-dorm/, assets/rooms/pop-star-dorm/]
room_id: pop-star-dorm
order: 6
unlock_requires_stars: 10
depends_on: [02-r0-tiny-studio]
soft_depends_on: [03-walker-behavior]  # stub until merged
blocks: []
spec: "SPEC.md › Phase 3 › Room briefs (#6)"
---

# Room 6 — Pop Star Dorm

## Room brief

| Field | Value |
| --- | --- |
| Room id | `pop-star-dorm` |
| Mission | 110 s / 7,000 coins |
| Room total | ~15,000 coins |
| Breakables | 50–65 |
| Treasure | Award trophy |
| Signature mechanic | Album stacks; lightsticks roll; a manager walks through on a patrol |
| Unlock | 10 total stars (room N needs 2 × (N − 1)) |
| Cosmetic reward | one hat or collar for 3 stars |

## Walker dependency

The manager patrol needs the new "walker" behavior (`03-walker-behavior`), the one planned engine change. Until it is merged, stub the walker behind the interface and keep going; do not build it in this room folder.

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

Confined to `src/rooms/pop-star-dorm/` and `assets/rooms/pop-star-dorm/`. The room self-registers via `import.meta.glob`, so no shared file is edited.

## Kickoff prompt

```
You are the room agent for pop-star-dorm. Read AGENTS.md, docs/spec.md and docs/room-template.md.
Build only that room from the "Room briefs" table.
```
