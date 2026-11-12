---
id: 01-e-audio-save-platform
title: Audio, Save & Platform
phase: 1
agent: E
status: in-review
branch: p1/e-audio-save-platform
owns: [src/audio/, src/save/, src/platform/]
replaces_stub: audio, save, platform
needs_from_others: events only
merge_position: 4 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › E — Audio, Save & Platform"
---

# E — Audio, Save & Platform

## Scope

- Audio: sound bank keyed by cue name; material sets (3+ variations each, ±8% random pitch) for every `Material`; music per room with crossfade; ducking on results screen. Respect volume settings.
- Save: `SaveData` in local storage with versioned migration and safe fallback when storage is blocked.
- Platform adapter interface with three implementations: `none`, `poki`, `crazygames`. Covers gameplay start/stop, rewarded ad (extend timer 30 s, double coins), loading progress. Selected by build flag.

## Done when

- [ ] Audio starts after the first tap on iOS Safari.
- [ ] Save survives reload.
- [ ] The `none` adapter makes the game fully playable with no ads.

## Also required

SPEC.md › Agent rules and definition of done, › Audio rules (CC0 or owned, recorded in `assets/CREDITS.md`, nothing louder than the music bus by more than 6 dB), and › Testing (unit tests for `src/save/`).

## Kickoff prompt

```
You are agent E. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
