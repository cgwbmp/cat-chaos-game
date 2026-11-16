# Cat Chaos — AI Agent Build Spec

Nov 11, 2026 · @Al

## Overview

Agents build a polished browser game where a cute cat knocks over and breaks objects in Korean-style low poly rooms. One foundation agent builds the base first; six agents then build systems in parallel; after integration, one agent per room builds levels in parallel. "Cat Chaos" is a working title.

**Core loop.** The player moves a cat around a room, swats, pounces and pushes objects. Objects fall, shatter and add their coin value to a damage total. Chains of falling objects build a combo multiplier.

**Modes.**

- **Mission:** reach a target coin value before the timer ends (the owner comes home). 1 star = target, 2 stars = 150% of target, 3 stars = target + the room's treasure object broken.
- **Free Soul:** no timer. The level ends when every breakable object is destroyed. Unlocked per room after its Mission is cleared once.

**Style.** Low poly, soft pastel palette, cute and readable. Korean flavor comes through architecture, props and art only. All in-game text is English. Money is generic coins shown with a coin icon, never a named currency.

**Platforms.** Desktop browsers (Chrome, Firefox, Safari, Edge) and mobile browsers (iOS Safari 16+, Android Chrome), landscape only on phones.

**Goals**

- Swatting an object feels great on a mid-range phone at a stable 30+ FPS (60 FPS on desktop).
- First playable load under 15 MB; each room loads on demand.
- Ready for web game portals (Poki, CrazyGames) through a portal SDK adapter.

**Non-goals for v1:** multiplayer, accounts or cloud saves, real-money store, level editor in the game, localization.

## Agent workflow

The build runs in four phases with a hard gate between each: one foundation agent, six system agents in parallel, an integration pass that produces the Tiny Studio template, then seven room agents in parallel.

&#91;embedded content: agent workflow · 4 phases, 16 agents\]

Each phase starts only after the previous phase's exit check passes. Tiny Studio (highlighted) is the template every room agent copies.

**Parallel work rules**

- Every parallel agent gets its own branch and its own folders (see Agent rules). Two agents never write the same file.
- Agents coordinate only through `src/core/` contracts, which are frozen after Phase 0.
- Merge order in Phase 2: F, A, B, E, C, D (rendering first, UI last, so each merge has what it depends on).
- Phase 3 rooms merge in any order; each room is self-registering, so room PRs never conflict.
- If an agent is blocked on another, it stubs the missing piece behind the interface and continues; it never waits idle.

## Tech stack and repository structure

The game is TypeScript on Babylon.js with Havok physics, bundled by Vite. Every agent uses exactly these tools; adding a runtime dependency needs the owner's approval.

| Area | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript, `strict: true` | No `any` in shared contracts |
| Engine | Babylon.js 9.x (`@babylonjs/core`, `@babylonjs/loaders`) | Tree-shaken ES module imports only |
| Physics | Havok (`@babylonjs/havok`, WASM) | Physics V2 API |
| Build | Vite, pnpm | Code split per room |
| Unit tests | Vitest | Logic only, no rendering |
| E2E / smoke | Playwright | Desktop + mobile emulation |
| Assets | glTF binary (.glb), Meshopt compression, KTX2 textures | One shared palette texture |
| Audio | Web Audio via Babylon `Sound` / audio engine | Unlocked on first tap |
| Lint / format | ESLint + Prettier | Runs in CI |

Versions are pinned in `package.json` by the foundation agent. Pick releases at least two weeks old.

**Repository layout**

```
/
├─ AGENTS.md              rules every agent reads first (copy of the Agent rules section)
├─ docs/spec.md           this spec
├─ src/
│  ├─ main.ts             boot, scene manager
│  ├─ core/               contracts: types, event bus, services registry (foundation only)
│  ├─ engine/             renderer setup, camera, asset loader, quality settings
│  ├─ physics/            Havok setup, breakable system, debris pool
│  ├─ cat/                cat controller, abilities, animation state machine
│  ├─ input/              keyboard, mouse, touch joystick and buttons
│  ├─ game/               modes, scoring, combo, timer, level flow, owner events
│  ├─ ui/                 HUD, menus, results screen, settings (HTML/CSS overlay)
│  ├─ audio/              sound bank, material sets, music
│  ├─ save/               local storage persistence
│  ├─ platform/           portal SDK adapter (none / Poki / CrazyGames)
│  ├─ debug/              debug overlay, cheats
│  └─ rooms/<room-id>/    one folder per room: room.ts, objects.json, room.glb
├─ assets/
│  ├─ shared/             palette.png, cat.glb, common props, fracture sets
│  ├─ audio/              sound files by material
│  └─ rooms/<room-id>/    room-specific source .blend and exports
├─ tools/                 asset scripts: glb optimize, validate objects.json
└─ tests/                 vitest unit tests, playwright e2e
```

Ownership rule: each folder in `src/` belongs to one Phase 1 agent. `src/core/` is frozen after Phase 0 and changes only through a contract change request (see Agent rules).

## Core contracts

Parallel work is safe only because every system talks through these contracts in `src/core/`. The foundation agent writes them in Phase 0; Phase 1 agents code against them and never import each other's internals.

**Event bus.** Systems communicate through a typed event bus, never direct calls across folders.

```ts
// src/core/events.ts
export type GameEvents = {
  'level/loaded':      { roomId: string; mode: GameMode };
  'level/started':     { roomId: string; mode: GameMode; timeLimitSec?: number; targetCoins?: number };
  'level/ended':       { result: LevelResult };
  'object/hit':        { objectId: string; force: number };
  'object/broken':     { objectId: string; defId: string; coins: number; isTreasure: boolean; position: Vec3 };
  'combo/changed':     { multiplier: number; chain: number };
  'score/changed':     { coins: number; delta: number };
  'timer/tick':        { remainingSec: number };
  'cat/action':        { action: CatAction; position: Vec3 };
  'input/action':      { action: InputAction; pressed: boolean };
  'game/paused':       { paused: boolean };
  'audio/play':        { cue: string; position?: Vec3; volume?: number };
};
export interface EventBus {
  on<K extends keyof GameEvents>(type: K, fn: (e: GameEvents[K]) => void): () => void;
  emit<K extends keyof GameEvents>(type: K, e: GameEvents[K]): void;
}
```

**Object definition** (`src/rooms/<room-id>/objects.json`, shared props in `assets/shared/objects.json`). Adding an object is data work, not code work.

```ts
export type Material = 'ceramic' | 'glass' | 'wood' | 'plastic' | 'paper' | 'metal' | 'fabric' | 'electronic';
export type BreakRule =
  | { kind: 'impact'; minImpulse: number }            // breaks when it lands hard enough
  | { kind: 'hits'; count: number }                    // breaks after N swats
  | { kind: 'fall'; minHeightM: number }               // breaks if it falls from this height
  | { kind: 'trigger'; triggerId: string };            // breaks via a special interaction
export interface ObjectDef {
  id: string;                 // 'vase_tall'
  name: string;               // 'Tall Vase' (English, shown in results)
  tier: 'light' | 'medium' | 'heavy' | 'trick' | 'treasure';
  coins: number;
  massKg: number;
  material: Material;
  break: BreakRule;
  meshNode: string;           // node name in the room .glb
  fractureSet?: string;       // pre-fractured pieces node, else generic shards
  special?: 'tablecloth' | 'stack' | 'rolling' | 'liquid' | 'electronic_spark';
}
```

Coin tiers: light 5–20, medium 30–80, heavy 100–300, trick 200–500, treasure 1,000+.

**Room definition.** Rooms are authored in Blender. Each breakable mesh carries glTF extras `{ "obj": "<ObjectDef.id>" }`; markers carry `{ "marker": "cat_spawn" | "camera_bounds" | "owner_door" | "trigger:<id>" }`.

```ts
export interface RoomDef {
  id: string;                 // 'tiny-studio'
  name: string;               // 'Tiny Studio Apartment'
  order: number;              // position in level select
  glb: string;                // URL of room.glb
  objectsJson: string;
  mission: { timeLimitSec: number; targetCoins: number };
  unlock: { requiresStars: number };
  music: string;
  ambience?: string;
  lighting?: RoomLighting;    // time of day and lamps; neutral daylight when left out
  module?: () => Promise<RoomModule>; // optional custom logic, lazy loaded
}
export interface RoomLighting {
  mood: 'day' | 'sunrise' | 'sunset' | 'night';
  lamps?: Record<string, 'warm' | 'cool'>;               // ObjectDef ids that shine until they break
  fixtures?: { at: Vec3; tone: 'warm' | 'cool' }[];      // fixed lights that cannot break
}
export interface RoomModule {
  setup(ctx: RoomContext): void;   // register triggers, scripted gags
  dispose(): void;
}
```

**Services registry.** `src/core/services.ts` exposes one object with `bus`, `scene`, `physics`, `assets`, `audio`, `save`, `platform`, `quality`, each typed by an interface in `src/core/`. Phase 1 agents implement one interface each; until it is real, a stub implementation lets everyone else run the game.

**Save data.**

```ts
export interface SaveData {
  version: 1;
  rooms: Record<string, { bestCoins: number; stars: 0 | 1 | 2 | 3; freeSoulCleared: boolean }>;
  totalCoins: number;         // spendable on cosmetics
  cosmetics: { owned: string[]; equipped: { hat?: string; collar?: string; fur?: string } };
  settings: { music: number; sfx: number; quality: 'low' | 'medium' | 'high'; haptics: boolean };
}
```

## Phase 0: Foundation (one agent, sequential)

One agent builds a runnable skeleton with every contract and a stub for every service, so six agents can start Phase 1 the same day. Nothing in Phase 1 starts until this phase passes its exit check.

**Agent F0 — Foundation**

1. Scaffold the repo: Vite + TypeScript strict, pnpm, ESLint, Prettier, Vitest, Playwright, the folder layout above, `AGENTS.md`, CI workflow (lint, typecheck, unit tests, build, smoke test).
2. Write every contract in `src/core/`: `events.ts`, `types.ts` (ObjectDef, RoomDef, SaveData, GameMode, LevelResult, CatAction, InputAction, Vec3), `services.ts` with one interface per service.
3. Implement the event bus with unit tests.
4. Implement a stub for each service (`src/<area>/stub.ts`) that satisfies its interface and logs calls. The game must boot and run with stubs only.
5. Boot flow: "Tap to Play" screen (unlocks audio), Babylon engine and scene, Havok WASM init, resize handling, landscape prompt in portrait on phones.
6. Graybox test room `src/rooms/_graybox/`: floor, two walls, a table, a shelf, 10 box and cylinder objects with an `objects.json` covering every tier and break rule. Built in code, no Blender needed.
7. Asset tooling in `tools/`: `validate-objects` (schema check of every objects.json against `ObjectDef`) and `optimize-glb` (Meshopt + KTX2 via gltf-transform).
8. Debug overlay skeleton toggled with the backtick key or a three-finger tap: FPS, draw calls, active physics bodies.

**Exit check (all must pass)**

- [ ] `pnpm dev` boots to the graybox room on desktop and on a phone over LAN.
- [ ] Graybox objects fall under physics; nothing else works yet, and that is expected.
- [ ] CI is green: lint, typecheck, unit tests, build, Playwright smoke (page loads, canvas renders, no console errors).
- [ ] `src/core/` reviewed by the owner and tagged `contracts-v1`.
- [ ] Production build under 3 MB before assets (gzip).

## Phase 1: Parallel base systems (six agents)

Six agents run at the same time, each on its own branch and its own folders, testing against the graybox room and the stubs. They talk only through `src/core/` events and service interfaces.

| Agent | Owns | Replaces stub | Needs from others |
| --- | --- | --- | --- |
| A Physics & Breakables | `src/physics/` | physics | nothing (emits events) |
| B Cat & Input | `src/cat/`, `src/input/` | input | physics service interface |
| C Game Rules | `src/game/` | — | events only |
| D UI | `src/ui/` | — | events only |
| E Audio, Save & Platform | `src/audio/`, `src/save/`, `src/platform/` | audio, save, platform | events only |
| F Rendering & Camera | `src/engine/`, `src/debug/` | assets, quality | nothing |

**A — Physics & Breakables**

- Load `objects.json`, match meshes by glTF extras, create Havok bodies with mass from `massKg`.
- Implement all four break rules and the `special` behaviors (tablecloth pull, stack topple, rolling, liquid splash, electronic spark).
- Fracture: swap to pre-fractured pieces when `fractureSet` exists, otherwise generic low poly shards. Debris pool capped at 150 pieces; pieces fade out after 4 s; sleeping bodies stay asleep.
- Wobble before falling: an object pushed past its edge teeters about 0.3 s before it drops.
- Emit `object/hit` and `object/broken`. Track chain causality (object broken by another falling object) for the combo.
- Done when: 60 graybox objects can fall at once at 30+ FPS on the reference phone; unit tests cover every break rule.

**B — Cat & Input**

- Input: keyboard (WASD/arrows, Space jump, J swat, K pounce, Shift zoomies), mouse optional, gamepad optional. Touch: floating virtual joystick on the left, three buttons on the right (Swat, Jump, Zoomies), 64 px minimum hit area.
- Cat controller: kinematic character on a capsule; walk, run, jump (onto tables and shelves), swat (forward impulse cone), pounce (jump + downward impact), push (contact force), zoomies (2 s speed burst, 6 s cooldown).
- Animation state machine with clips: idle, walk, run, jump, land, swat, pounce, loaf, celebrate. Use the graybox capsule until the cat .glb arrives.
- Coyote time 100 ms, jump buffer 120 ms, auto-step onto low ledges.
- Done when: the cat can reach every surface of the graybox room on touch and keyboard, and a playtester can swat a cup off a table in under 5 s without instructions.

**C — Game Rules**

- Mission and Free Soul modes, level state machine: loading → intro → playing → paused → ended.
- Scoring: coins per broken object times the combo multiplier. Combo: each break within 1.5 s of the last raises the chain; multiplier = 1 + 0.25 × chain, capped at 3x.
- Timer, star rating (1/2/3 per Overview), Free Soul end when every breakable is gone.
- Owner events: a door sound at 10 s left, a footsteps cue at 3 s.
- Emit `score/changed`, `combo/changed`, `timer/tick`, `level/ended` with a full `LevelResult` (coins, stars, broken list, best combo, time).
- Done when: all rules are covered by unit tests driven by fake events, no rendering needed.

**D — UI**

- HTML/CSS overlay above the canvas, no UI framework required. Rounded, chunky, pastel; one display font plus a system fallback.
- Screens: title, level select (room cards, stars, lock state), mode select, HUD (coins with coin icon, timer, combo popups, floating "+120" coin labels), pause, results (stamp-style stars, broken objects list, best combo), settings, cosmetics shop.
- Every screen works at 360×640 landscape-phone size up to 4K, with safe-area insets.
- Done when: every screen is reachable, driven only by events, and passes keyboard and touch navigation.

**E — Audio, Save & Platform**

- Audio: sound bank keyed by cue name; material sets (3+ variations each, ±8% random pitch) for every `Material`; music per room with crossfade; ducking on results screen. Respect volume settings.
- Save: `SaveData` in local storage with versioned migration and safe fallback when storage is blocked.
- Platform adapter interface with three implementations: `none`, `poki`, `crazygames`. Covers gameplay start/stop, rewarded ad (extend timer 30 s, double coins), loading progress. Selected by build flag.
- Done when: audio starts after the first tap on iOS Safari; save survives reload; the `none` adapter makes the game fully playable with no ads.

**F — Rendering & Camera**

- Asset service: lazy-load room bundles with progress, glb loader with Meshopt and KTX2, asset cache and disposal on room exit.
- Look: shared palette material, hemisphere + one directional light set by the room's time of day (`RoomDef.lighting`), up to 4 lamp point lights (2 on low quality), baked lightmaps support, blob shadows under the cat and dynamic objects, soft outline or rim light option, light bloom on high quality only.
- Camera: third-person follow with gentle lag, auto-avoid walls, zoom out when the cat is high, camera bounds from room markers. No manual camera on touch; optional mouse orbit on desktop.
- Quality tiers (low / medium / high) picked automatically from a 2 s benchmark, changeable in settings: resolution scale, shadows, post effects, debris cap.
- Juice helpers for others to call through events: screen shake, hit pause (40 ms), squash and stretch.
- Debug overlay: complete it with physics body view, coin cheats, and room jump.
- Done when: graybox runs at 60 FPS desktop and 30+ FPS on the reference phone on auto quality.

## Phase 2: Integration and vertical slice

One integration agent merges Phase 1 and builds the first real room, Tiny Studio Apartment, to final quality. This room becomes the template every room agent copies in Phase 3, so it must be excellent.

**Agent I — Integration (sequential)**

1. Merge branches A–F in order: F, A, B, E, C, D. Run CI after each merge; fix integration bugs, never reshape another agent's design without a note in the PR.
2. Swap stubs for real services; delete the stubs that are no longer needed (keep them as test doubles in `tests/`).
3. Drop in the final cat model (`assets/shared/cat.glb`, supplied by the owner) and wire its animation clips.

**Agent R0 — Tiny Studio Apartment (starts when step 2 above is merged)**

- Room: a small studio with a bed, desk with monitor and keyboard, ramen pot on a hot plate, floor cushions, wall shelf, potted plants, a mini fridge, a window. Treasure: a limited-edition figurine on the top shelf.
- 25–35 breakables across all tiers, at least one trick setup (desk tablecloth or stacked books) and one 4+ object chain.
- Mission: 90 s, target 1,200 coins. Total value in the room about 3,000 coins.
- Tutorial built in: floating hints for move, jump, swat, pounce, zoomies, shown once and saved.
- Write `docs/room-template.md`: the exact steps used to build this room, the Blender export settings, the extras naming, and a checklist. Phase 3 agents follow this file.

**Exit check**

- [ ] Tiny Studio is fully playable in both modes from title to results, on desktop and the reference phone.
- [ ] 5 outside playtesters each finish a Mission run; at least 4 of 5 say they would play another room.
- [ ] Performance budgets in Quality bars all met.
- [ ] `docs/room-template.md` exists and an agent new to the repo can follow it.

## Phase 3: Rooms in parallel (one agent per room)

Seven room agents run at the same time, each confined to `src/rooms/<room-id>/` and `assets/rooms/<room-id>/`. Rooms register themselves through `import.meta.glob('./rooms/*/index.ts')`, so no agent edits a shared file and merges never conflict.

**Shared brief for every room agent**

1. Read `AGENTS.md`, this spec, and `docs/room-template.md`. Copy `src/rooms/tiny-studio/` as the starting point.
2. Build the room geometry from shared CC0 packs and the palette texture; model only the room's signature props.
3. Fill `objects.json` within the coin and object-count targets below. Reuse shared props where they fit.
4. Add the signature mechanic in `room.ts` using only existing `special` behaviors and `RoomModule` triggers. Need a new engine feature? Open a change request (Agent rules) and stub around it; do not edit `src/physics/` or other systems.
5. Tune the Mission so a first-time player gets 1 star in 1–3 tries and 3 stars needs a planned route.
6. Pass the room checklist in `docs/room-template.md` and the Quality bars, then open one PR.

**Room briefs** (difficulty rises with order)

| # | Room id / name | Mission | Room total | Breakables | Treasure | Signature mechanic |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | `convenience-store` Corner Convenience Store | 90 s / 2,000 | \~5,000 | 40–60 | Golden lucky-cat statue by the register | Long shelves topple like dominoes; milk cartons splash |
| 3 | `cozy-cafe` Cozy Café | 100 s / 3,000 | \~7,000 | 40–55 | Fancy espresso machine | Cake display case; stacked cup towers; tablecloths on every table |
| 4 | `gaming-cafe` Gaming Café | 100 s / 4,000 | \~9,000 | 45–60 | Champion trophy | Monitors spark; pulling a cable bundle drags a whole desk row |
| 5 | `grandmas-house` Grandma's House | 110 s / 5,500 | \~12,000 | 35–50 | Antique clay storage jar set | Very heavy jars need pounce from a height; rice cooker steams |
| 6 | `pop-star-dorm` Pop Star Dorm | 110 s / 7,000 | \~15,000 | 50–65 | Award trophy | Album stacks; lightsticks roll; a robot vacuum drives a patrol and bumps the cat |
| 7 | `wooden-house` Traditional Wooden House | 120 s / 9,000 | \~19,000 | 40–55 | Celadon vase | Paper sliding doors you can tear through; fragile pottery on low tables |
| 8 | `bathhouse` Spa & Bathhouse (finale) | 150 s / 12,000 | \~26,000 | 60–80 | Golden towel-hat trophy | Slippery wet floors change cat movement; large multi-room layout |

The Pop Star Dorm patrol needs a new "walker" behavior. Treat it as the one planned engine change: a systems agent adds it to `src/game/` before or during Phase 3, and the dorm agent stubs it until then.

**Unlocks:** room N needs 2 × (N − 1) total stars. Cosmetic unlocks per room: one hat or collar for 3 stars.

## Quality bars

Every PR, system or room, must meet these numbers on the reference devices: a mid-range Android phone (about 2022, e.g. Pixel 6a class) on Chrome, an iPhone 12 on Safari, and a desktop with integrated graphics.

| Budget | Phone | Desktop |
| --- | --- | --- |
| Frame rate | 30+ FPS stable, 1% lows above 24 | 60 FPS |
| Triangles on screen | 100k max | 250k max |
| Draw calls | 100 max | 200 max |
| Awake physics bodies | 60 max | 120 max |
| Debris pieces | 80 (low) / 150 (high) | 250 |
| Initial download (gzip) | 15 MB max to first playable room | same |
| Each extra room bundle | 6 MB max | same |
| Room load time on 4G | under 4 s | under 2 s |
| Memory | under 400 MB | under 800 MB |

**Art rules**

- Low poly, flat or gradient shading from the shared palette texture; no photo textures.
- Soft pastel base colors with one warm accent per room. Round edges, chunky proportions, slightly oversized props.
- Korean feel comes from props and architecture only. No Korean text, signs or brand names; any signage uses invented English words or simple icons.
- No real brands, logos or copyrighted characters anywhere. Assets are CC0 or owned; record every source in `assets/CREDITS.md`.

**Audio rules:** CC0 or owned only, recorded in `assets/CREDITS.md`; every breakable has a material sound; nothing louder than the music bus by more than 6 dB.

**Testing**

- Unit tests (Vitest) for all logic in `src/game/`, `src/save/`, `src/core/`, break rules, and `objects.json` validation.
- Playwright smoke on every PR: boot, enter each room, play 10 s with scripted input, reach results, zero console errors. Run in desktop Chrome, mobile Safari emulation and mobile Chrome emulation.
- A performance test scene that breaks 60 objects at once and logs FPS; CI fails if desktop drops below 50 FPS headless baseline.
- Manual phone check before merge: the PR includes a short note with device, FPS seen and any issues.

## Agent rules and definition of done

This section is copied verbatim into `AGENTS.md`. Every agent reads it before its first change.

**Rules**

1. Work only in the folders your brief assigns. Read anything; write only your own folders, plus tests for your code.
2. Never edit `src/core/`. Need a contract change? Add a file `docs/change-requests/<date>-<agent>-<topic>.md` with the problem, the proposed change and who it affects, then work around it with a local adapter until the owner approves.
3. Talk to other systems only through events and service interfaces. No imports from another agent's folder.
4. One branch per agent: `p1/<agent-letter>-<area>` or `p3/room-<room-id>`. Small commits with clear messages. Rebase on `main` before opening the PR.
5. No new runtime dependency without approval. Dev-only tools are fine if listed in the PR.
6. All player-facing text is English. Money is "coins" with the coin icon, never a named currency.
7. When unsure, choose the simpler option, write the assumption in the PR description, and keep going rather than stopping.
8. Never commit secrets, real brands, copyrighted art or audio, or assets without a recorded source.

**Definition of done (every PR)**

- [ ] Brief's "Done when" items all met.
- [ ] CI green: lint, typecheck, unit tests, build, Playwright smoke.
- [ ] Quality bars met; phone check note in the PR.
- [ ] No console errors or warnings in play.
- [ ] New assets listed in `assets/CREDITS.md` and passed through `optimize-glb`.
- [ ] PR description: what was built, assumptions made, known issues, a short screen recording or GIF.

**Kickoff prompts** (paste into each agent session)

```
Phase 0:  You are agent F0. Read docs/spec.md fully. Complete "Phase 0: Foundation" and its exit check.
Phase 1:  You are agent <A–F>. Read AGENTS.md and docs/spec.md. Build only your brief in "Phase 1".
Phase 2:  You are agent I (then R0). Read AGENTS.md and docs/spec.md. Complete "Phase 2".
Phase 3:  You are the room agent for <room-id>. Read AGENTS.md, docs/spec.md and docs/room-template.md.
          Build only that room from the "Room briefs" table.
```
