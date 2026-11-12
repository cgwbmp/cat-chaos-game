# Contracts v1 — owner review notes

`src/core/` implements SPEC.md › Core contracts. This file lists everything in it that the spec does not state word for word, so the review before tagging `contracts-v1` can focus on those points. After the tag, `src/core/` changes only through `docs/change-requests/`.

## Changed from the spec

| Where                 | Change                                                               | Why                                                                                                              |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tech stack            | Babylon.js 9.x instead of 7.x (owner decision, 2026-11-12)           | 7.x was two majors behind                                                                                        |
| `level/loaded` event  | Adds `breakableCount` and `objects: ObjectDef[]`                     | Game Rules and UI are "events only" but need the breakable count (Free Soul end) and object names (results list) |
| `object/broken` event | Adds optional `causedBy` (objectId of the breakable that knocked it) | Agent A must "track chain causality for the combo"; without the field nobody else can see it                     |
| `RoomDef`             | Adds optional `builder` (code-built geometry, lazy loaded)           | The graybox room has no `.glb`; real rooms leave it unset                                                        |
| Services registry     | Adds `input` and `rooms` to the eight listed services                | Agent B "replaces stub: input"; the UI needs the room list for level select                                      |

## Added because the spec implies them

| Addition                                                              | Used by                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Events `level/requested`, `level/quit`                                | UI asks `main.ts` to load or unload a room                                                      |
| Event `settings/changed`                                              | Audio and quality react to the settings screen                                                  |
| Event `quality/changed`                                               | Emitted by `QualityService.setTier`                                                             |
| Event `reward/granted`                                                | Rewarded ad result (extend timer, double coins) reaches Game Rules                              |
| Events `juice/shake`, `juice/hitPause`, `juice/squash`                | "Juice helpers for others to call through events" (Agent F)                                     |
| `RoomContext`, `RoomAssets`, `RoomMarker`, `NodeExtras`, `MarkerKind` | The spec names `RoomContext` and the glTF extras but does not define the types                  |
| `LevelResult`, `BrokenObject`, `CatAction`, `InputAction`             | Named in the spec without fields                                                                |
| `ServiceFactory`, `SystemFactory`                                     | Each `src/<area>/index.ts` exports its factory; `main.ts` calls it, so no agent edits `main.ts` |

## Added while building Phases 1 to 3

These went into `src/core/` after the first draft, each because a brief could not be met without it. They are additive.

| Where                   | Change                                                          | Why                                                                                             |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `PhysicsObjectInfo`     | Adds `halfHeight`; `position` is the object's true center       | Swat and pounce must tell a tall lamp next to the cat from a cup on a shelf overhead            |
| Events                  | Adds `walker/patrol` and `walker/caught`                        | The walker behavior (Pop Star Dorm manager): a room module asks for a patrol, game rules run it |
| `SaveData`              | Adds optional `tutorialDone`                                    | "Hints shown once and saved" (Tiny Studio)                                                      |
| `src/core/cosmetics.ts` | New: the cosmetics catalog                                      | Shared by the shop (UI) and the cat                                                             |
| Marker convention       | `trigger:zone_wet…` markers are wet floor zones read by the cat | Bathhouse slippery floors, without a new marker kind                                            |

Two break behaviors go beyond the four rules in the spec (`src/physics/break-rules.ts`):

- **Wear-out:** any object breaks after enough swats (4 to 10 by tier), so an object can never end up unbreakable and Free Soul can always be finished.
- **Direct blow:** a pounce landing of 7 N·s or more counts as an impact for `impact` objects ("very heavy jars need pounce from a height").

## Decisions worth a second look

- **objectId** is the breakable's mesh name in the room, so mesh names must be unique per room.
- **Static geometry:** every room mesh without an `obj` extra and without a `marker` extra gets a static collider.
- **Markers** are disabled by the asset service (not rendered, no collider). `camera_bounds` in the graybox is a unit cube scaled to the bounds; `docs/room-template.md` (Phase 2) should fix the convention for Blender.
- **Dev rooms:** a room id starting with `_` is hidden from `rooms.list()` unless `includeDev` is set.
- **Movement input** is polled with `input.getMove()`; `input/action` carries buttons only (`jump`, `swat`, `pounce`, `zoomies`, `pause`).
- **`LevelResult.bestCombo`** is the highest multiplier reached, and `BrokenObject.coins` includes the multiplier.
- **Event bus:** listeners run synchronously in subscription order; a listener that throws is logged and does not stop the others.
- **objects.json validation** (`src/core/validate.ts`): ids are snake_case, coins must be an integer inside the tier's range, unknown keys are errors.
- **Load order** in `main.ts`: `assets.loadRoom` → `physics.loadRoom` → room `module.setup` → `level/loaded`.
