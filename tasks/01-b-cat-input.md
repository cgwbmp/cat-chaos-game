---
id: 01-b-cat-input
title: Cat & Input
phase: 1
agent: B
status: in-review
branch: p1/b-cat-input
owns: [src/cat/, src/input/]
replaces_stub: input
needs_from_others: physics service interface
merge_position: 3 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › B — Cat & Input"
---

# B — Cat & Input

## Scope

- Input: keyboard (WASD/arrows, Space jump, J swat, K pounce, Shift zoomies), mouse optional, gamepad optional. Touch: floating virtual joystick on the left, three buttons on the right (Swat, Jump, Zoomies), 64 px minimum hit area.
- Cat controller: kinematic character on a capsule; walk, run, jump (onto tables and shelves), swat (forward impulse cone), pounce (jump + downward impact), push (contact force), zoomies (2 s speed burst, 6 s cooldown).
- Animation state machine with clips: idle, walk, run, jump, land, swat, pounce, loaf, celebrate. Use the graybox capsule until the cat .glb arrives.
- Coyote time 100 ms, jump buffer 120 ms, auto-step onto low ledges.

## Done when

- [ ] The cat can reach every surface of the graybox room on touch and keyboard.
- [ ] A playtester can swat a cup off a table in under 5 s without instructions.

## Also required

SPEC.md › Agent rules and definition of done, and › Quality bars. Code against the physics service interface in `src/core/` only; never import from `src/physics/`.

## Kickoff prompt

```
You are agent B. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
