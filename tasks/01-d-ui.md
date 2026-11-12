---
id: 01-d-ui
title: UI
phase: 1
agent: D
status: in-review
branch: p1/d-ui
owns: [src/ui/]
replaces_stub: none
needs_from_others: events only
merge_position: 6 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › D — UI"
---

# D — UI

## Scope

- HTML/CSS overlay above the canvas, no UI framework required. Rounded, chunky, pastel; one display font plus a system fallback.
- Screens: title, level select (room cards, stars, lock state), mode select, HUD (coins with coin icon, timer, combo popups, floating "+120" coin labels), pause, results (stamp-style stars, broken objects list, best combo), settings, cosmetics shop.
- Every screen works at 360×640 landscape-phone size up to 4K, with safe-area insets.

## Done when

- [ ] Every screen is reachable, driven only by events.
- [ ] Every screen passes keyboard and touch navigation.

## Also required

SPEC.md › Agent rules and definition of done. All text English; money is "coins" with the coin icon, never a named currency.

## Kickoff prompt

```
You are agent D. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
