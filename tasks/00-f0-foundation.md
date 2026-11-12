---
id: 00-f0-foundation
title: Foundation
phase: 0
agent: F0
status: in-review
branch: not specified in spec
owns: [repo scaffold, src/core/, src/<area>/stub.ts, src/rooms/_graybox/, tools/, AGENTS.md, CI]
depends_on: []
blocks: [01-a-physics-breakables, 01-b-cat-input, 01-c-game-rules, 01-d-ui, 01-e-audio-save-platform, 01-f-rendering-camera]
spec: "SPEC.md › Phase 0: Foundation"
---

# F0 — Foundation

One agent builds a runnable skeleton with every contract and a stub for every service, so six agents can start Phase 1 the same day. Nothing in Phase 1 starts until this task passes its exit check.

## Scope

1. Scaffold the repo: Vite + TypeScript strict, pnpm, ESLint, Prettier, Vitest, Playwright, the folder layout (SPEC.md › Tech stack and repository structure), `AGENTS.md`, CI workflow (lint, typecheck, unit tests, build, smoke test).
2. Write every contract in `src/core/`: `events.ts`, `types.ts` (ObjectDef, RoomDef, SaveData, GameMode, LevelResult, CatAction, InputAction, Vec3), `services.ts` with one interface per service.
3. Implement the event bus with unit tests.
4. Implement a stub for each service (`src/<area>/stub.ts`) that satisfies its interface and logs calls. The game must boot and run with stubs only.
5. Boot flow: "Tap to Play" screen (unlocks audio), Babylon engine and scene, Havok WASM init, resize handling, landscape prompt in portrait on phones.
6. Graybox test room `src/rooms/_graybox/`: floor, two walls, a table, a shelf, 10 box and cylinder objects with an `objects.json` covering every tier and break rule. Built in code, no Blender needed.
7. Asset tooling in `tools/`: `validate-objects` (schema check of every objects.json against `ObjectDef`) and `optimize-glb` (Meshopt + KTX2 via gltf-transform).
8. Debug overlay skeleton toggled with the backtick key or a three-finger tap: FPS, draw calls, active physics bodies.

## Notes

- Contracts to implement are defined in SPEC.md › Core contracts (event bus, ObjectDef, RoomDef, services registry, SaveData). No `any` in shared contracts.
- Pin versions in `package.json`; pick releases at least two weeks old.
- `AGENTS.md` is a verbatim copy of SPEC.md › Agent rules and definition of done. Copy SPEC.md to `docs/spec.md`.
- Rooms self-register through `import.meta.glob('./rooms/*/index.ts')` (needed by Phase 3).

## Exit check (gates Phase 1)

- [ ] `pnpm dev` boots to the graybox room on desktop and on a phone over LAN. _(Desktop verified in headless Chromium; phone over LAN not yet checked.)_
- [x] Graybox objects fall under physics; nothing else works yet, and that is expected.
- [ ] CI is green: lint, typecheck, unit tests, build, Playwright smoke (page loads, canvas renders, no console errors). _(Every step passes locally; the GitHub Actions workflow has not run yet.)_
- [ ] `src/core/` reviewed by the owner and tagged `contracts-v1`. **(Owner action)** _(Review notes: `docs/contracts-v1-review.md`.)_
- [x] Production build under 3 MB before assets (gzip). _(1.01 MB.)_

## Kickoff prompt

```
You are agent F0. Read docs/spec.md fully. Complete "Phase 0: Foundation" and its exit check.
```
