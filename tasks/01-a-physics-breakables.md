---
id: 01-a-physics-breakables
title: Physics & Breakables
phase: 1
agent: A
status: in-review
branch: p1/a-physics
owns: [src/physics/]
replaces_stub: physics
needs_from_others: nothing (emits events)
merge_position: 2 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › A — Physics & Breakables"
---

# A — Physics & Breakables

## Scope

- Load `objects.json`, match meshes by glTF extras, create Havok bodies with mass from `massKg`.
- Implement all four break rules and the `special` behaviors (tablecloth pull, stack topple, rolling, liquid splash, electronic spark).
- Fracture: swap to pre-fractured pieces when `fractureSet` exists, otherwise generic low poly shards. Debris pool capped at 150 pieces; pieces fade out after 4 s; sleeping bodies stay asleep.
- Wobble before falling: an object pushed past its edge teeters about 0.3 s before it drops.
- Emit `object/hit` and `object/broken`. Track chain causality (object broken by another falling object) for the combo.

## Done when

- [ ] 60 graybox objects can fall at once at 30+ FPS on the reference phone.
- [ ] Unit tests cover every break rule.

## Also required

SPEC.md › Agent rules and definition of done, and › Quality bars (physics bodies and debris budgets especially).

## Kickoff prompt

```
You are agent A. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
