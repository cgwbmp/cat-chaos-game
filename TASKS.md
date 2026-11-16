# Cat Chaos — Tasks

Built from [SPEC.md](SPEC.md). One task per agent; each phase starts only after the previous phase's exit check passes.

Status values: `todo` · `in-progress` · `in-review` · `done` · `blocked`

## Phase 0 — Foundation (sequential)

| ID | Task | Agent | Owns | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [00-f0-foundation](tasks/00-f0-foundation.md) | Foundation: scaffold, contracts, stubs, graybox room | F0 | repo, `src/core/`, stubs, `tools/` | — | in-review |

**Gate:** F0 exit check passes, incl. owner review of `src/core/` tagged `contracts-v1`.

## Phase 1 — Base systems (6 agents in parallel)

| ID | Task | Agent | Owns | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [01-a-physics-breakables](tasks/01-a-physics-breakables.md) | Physics & Breakables | A | `src/physics/` | 00 | in-review |
| [01-b-cat-input](tasks/01-b-cat-input.md) | Cat & Input | B | `src/cat/`, `src/input/` | 00 | in-review |
| [01-c-game-rules](tasks/01-c-game-rules.md) | Game Rules | C | `src/game/` | 00 | in-review |
| [01-d-ui](tasks/01-d-ui.md) | UI | D | `src/ui/` | 00 | in-review |
| [01-e-audio-save-platform](tasks/01-e-audio-save-platform.md) | Audio, Save & Platform | E | `src/audio/`, `src/save/`, `src/platform/` | 00 | in-review |
| [01-f-rendering-camera](tasks/01-f-rendering-camera.md) | Rendering & Camera | F | `src/engine/`, `src/debug/` | 00 | in-review |

**Merge order:** F, A, B, E, C, D.
**Gate:** all six briefs' "Done when" met (derived; the spec has no explicit Phase 1 exit check).

## Phase 2 — Integration and vertical slice (sequential)

| ID | Task | Agent | Owns | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [02-i-integration](tasks/02-i-integration.md) | Merge Phase 1, swap stubs, wire cat model | I | merges | all 01 | in-review |
| [02-r0-tiny-studio](tasks/02-r0-tiny-studio.md) | Tiny Studio Apartment + `docs/room-template.md` | R0 | `src/rooms/tiny-studio/` | 02-i (step 2 merged) | in-review |

**Gate:** Phase 2 exit check (in the R0 task), incl. 5 outside playtesters.

## Phase 3 — Rooms (7 agents in parallel, merge in any order)

| ID | Room | Mission | Unlock (stars) | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [03-room-convenience-store](tasks/03-room-convenience-store.md) | Corner Convenience Store | 90 s / 2,000 | 2 | 02-r0 | in-review |
| [03-room-cozy-cafe](tasks/03-room-cozy-cafe.md) | Cozy Café | 100 s / 3,000 | 4 | 02-r0 | in-review |
| [03-room-gaming-cafe](tasks/03-room-gaming-cafe.md) | Gaming Café | 100 s / 4,000 | 6 | 02-r0 | in-review |
| [03-room-grandmas-house](tasks/03-room-grandmas-house.md) | Grandma's House | 110 s / 5,500 | 8 | 02-r0 | in-review |
| [03-room-pop-star-dorm](tasks/03-room-pop-star-dorm.md) | Pop Star Dorm | 110 s / 7,000 | 10 | 02-r0; stubs 03-walker | in-review |
| [03-room-wooden-house](tasks/03-room-wooden-house.md) | Traditional Wooden House | 120 s / 9,000 | 12 | 02-r0 | in-review |
| [03-room-bathhouse](tasks/03-room-bathhouse.md) | Spa & Bathhouse (finale) | 150 s / 12,000 | 14 | 02-r0 | in-review |
| [03-walker-behavior](tasks/03-walker-behavior.md) | Walker behavior in `src/game/` (planned engine change) | — | — | 02-i; blocks 03-pop-star-dorm (soft) | in-review |

## Phase 3b — Rooms 9–16 (one branch, `p3/rooms-9-16`)

| Room | Mission | Unlock (stars) | Status |
| --- | --- | --- | --- |
| Karaoke Room | 140 s / 12,500 | 16 | in-review |
| Flower Shop | 140 s / 13,000 | 18 | in-review |
| Comic Book Café | 150 s / 13,500 | 20 | in-review |
| Night Market Food Tent | 150 s / 14,000 | 22 | in-review |
| School Classroom | 160 s / 14,500 | 24 | in-review |
| Rooftop Garden | 160 s / 15,000 | 26 | in-review |
| Pottery Gallery | 170 s / 15,500 | 28 | in-review |
| Luxury Penthouse (new finale) | 180 s / 16,500 | 30 | in-review |

Added with them: springy surfaces in `src/cat/`, hanging objects in `src/physics/`, and a fix to the walker in `src/game/` (it shook and threw objects below 60 FPS). Open: 3-star cosmetics for these rooms, see `docs/change-requests/2026-11-16-rooms-9-16-cosmetics.md`.

## Owner actions

- Review and tag `src/core/` as `contracts-v1` (Phase 0 gate).
- Supply `assets/shared/cat.glb` (Phase 2, Integration step 3).
- Recruit 5 outside playtesters (Phase 2 gate).
- Approve any runtime dependency and any contract change request in `docs/change-requests/`.
- Assign an agent to the walker behavior.

## Unassigned in spec

Required by SPEC.md but not owned by any agent brief. All three are now built:

- Performance test scene that breaks 60 objects at once and logs FPS; CI fails below 50 FPS headless desktop baseline (› Testing). **Done:** dev room `src/rooms/_perf/`, test `tests/e2e/perf.spec.ts`, run with `pnpm test:perf`.
- Full Playwright smoke: enter each room, play 10 s with scripted input, reach results, zero console errors, in desktop Chrome, mobile Safari and mobile Chrome emulation (› Testing). **Done:** `tests/e2e/smoke.spec.ts`.
- Creating `assets/CREDITS.md` (› Art rules, › Audio rules). **Done.**
