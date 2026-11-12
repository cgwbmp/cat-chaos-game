---
id: 01-c-game-rules
title: Game Rules
phase: 1
agent: C
status: in-review
branch: p1/c-game
owns: [src/game/]
replaces_stub: none
needs_from_others: events only
merge_position: 5 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › C — Game Rules"
---

# C — Game Rules

## Scope

- Mission and Free Soul modes, level state machine: loading → intro → playing → paused → ended.
- Scoring: coins per broken object times the combo multiplier. Combo: each break within 1.5 s of the last raises the chain; multiplier = 1 + 0.25 × chain, capped at 3x.
- Timer, star rating (1/2/3 per Overview), Free Soul end when every breakable is gone.
- Owner events: a door sound at 10 s left, a footsteps cue at 3 s.
- Emit `score/changed`, `combo/changed`, `timer/tick`, `level/ended` with a full `LevelResult` (coins, stars, broken list, best combo, time).

Star rules (SPEC.md › Overview): 1 star = target, 2 stars = 150% of target, 3 stars = target + the room's treasure object broken. Free Soul unlocks per room after its Mission is cleared once.

## Done when

- [ ] All rules are covered by unit tests driven by fake events, no rendering needed.

## Also required

SPEC.md › Agent rules and definition of done, and › Testing (unit tests for all logic in `src/game/`).

## Kickoff prompt

```
You are agent C. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
