---
id: 01-f-rendering-camera
title: Rendering & Camera
phase: 1
agent: F
status: in-review
branch: p1/f-rendering
owns: [src/engine/, src/debug/]
replaces_stub: assets, quality
needs_from_others: nothing
merge_position: 1 of 6 (F, A, B, E, C, D)
depends_on: [00-f0-foundation]
blocks: [02-i-integration]
spec: "SPEC.md › Phase 1 › F — Rendering & Camera"
---

# F — Rendering & Camera

## Scope

- Asset service: lazy-load room bundles with progress, glb loader with Meshopt and KTX2, asset cache and disposal on room exit.
- Look: shared palette material, hemisphere + one directional light, baked lightmaps support, blob shadows under the cat and dynamic objects, soft outline or rim light option, light bloom on high quality only.
- Camera: third-person follow with gentle lag, auto-avoid walls, zoom out when the cat is high, camera bounds from room markers. No manual camera on touch; optional mouse orbit on desktop.
- Quality tiers (low / medium / high) picked automatically from a 2 s benchmark, changeable in settings: resolution scale, shadows, post effects, debris cap.
- Juice helpers for others to call through events: screen shake, hit pause (40 ms), squash and stretch.
- Debug overlay: complete it with physics body view, coin cheats, and room jump.

## Done when

- [ ] Graybox runs at 60 FPS desktop and 30+ FPS on the reference phone on auto quality.

## Also required

SPEC.md › Agent rules and definition of done, › Quality bars (triangles, draw calls, memory), and › Art rules.

## Kickoff prompt

```
You are agent F. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
```
