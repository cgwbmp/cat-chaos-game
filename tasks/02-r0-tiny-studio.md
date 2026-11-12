---
id: 02-r0-tiny-studio
title: Tiny Studio Apartment (vertical slice + room template)
phase: 2
agent: R0
status: in-review
branch: not specified in spec
owns: [src/rooms/tiny-studio/, assets/rooms/tiny-studio/, docs/room-template.md]
room_id: tiny-studio
order: 1  # inferred: room table starts at #2
unlock_requires_stars: 0  # inferred: 2 × (1 − 1); spec lists no unlock for Tiny Studio
depends_on: [02-i-integration]  # starts when Integration step 2 is merged
blocks: [03-room-convenience-store, 03-room-cozy-cafe, 03-room-gaming-cafe, 03-room-grandmas-house, 03-room-pop-star-dorm, 03-room-wooden-house, 03-room-bathhouse]
spec: "SPEC.md › Phase 2 › Agent R0 — Tiny Studio Apartment"
---

# R0 — Tiny Studio Apartment

This room becomes the template every Phase 3 room agent copies, so it must be excellent.

## Scope

- Room: a small studio with a bed, desk with monitor and keyboard, ramen pot on a hot plate, floor cushions, wall shelf, potted plants, a mini fridge, a window. Treasure: a limited-edition figurine on the top shelf.
- 25–35 breakables across all tiers, at least one trick setup (desk tablecloth or stacked books) and one 4+ object chain.
- Mission: 90 s, target 1,200 coins. Total value in the room about 3,000 coins.
- Tutorial built in: floating hints for move, jump, swat, pounce, zoomies, shown once and saved.
- Write `docs/room-template.md`: the exact steps used to build this room, the Blender export settings, the extras naming, and a checklist. Phase 3 agents follow this file.

## Exit check (gates Phase 3)

- [ ] Tiny Studio is fully playable in both modes from title to results, on desktop and the reference phone.
- [ ] 5 outside playtesters each finish a Mission run; at least 4 of 5 say they would play another room. **(Owner action: recruit playtesters)**
- [ ] Performance budgets in Quality bars all met.
- [ ] `docs/room-template.md` exists and an agent new to the repo can follow it.

## Also required

SPEC.md › Agent rules and definition of done, › Quality bars, › Art rules, › Audio rules.

## Kickoff prompt

```
You are agent I (then R0). Read AGENTS.md and docs/spec.md. Complete "Phase 2".
```
