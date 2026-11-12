---
id: 03-walker-behavior
title: Walker behavior (planned engine change)
phase: 3
agent: a systems agent (not assigned in spec; src/game/ is owned by C)
status: in-review
branch: not specified in spec
owns: [src/game/]
depends_on: [02-i-integration]  # spec: "before or during Phase 3"
blocks: [03-room-pop-star-dorm]  # soft: the dorm agent stubs it until merged
spec: "SPEC.md › Phase 3 (note under Room briefs)"
---

# Walker behavior

The Pop Star Dorm patrol needs a new "walker" behavior. This is the one planned engine change: a systems agent adds it to `src/game/` before or during Phase 3, and the dorm agent stubs it until then.

## Scope

- Add a "walker" behavior to `src/game/` that lets a room script an NPC (the dorm manager) walking a patrol through the room.
- Expose it so a room can use it from its `RoomModule` without editing system folders.

## Done when

- [ ] `03-room-pop-star-dorm` can replace its stub with the real walker.
- [ ] Unit tests cover the new logic in `src/game/` (SPEC.md › Testing).
- [ ] SPEC.md › Agent rules definition of done met.

## Open questions

- The spec does not detail the walker's behavior (what happens when it sees the cat, collision with objects) or whether it needs a contract change in `src/core/`. If it does, file `docs/change-requests/<date>-<agent>-walker.md` first (Agent rule 2).
