# Room template

How Tiny Studio Apartment was built, as steps a room agent can follow for a new room. Read `AGENTS.md` and `docs/spec.md` first.

Rooms in this repo are **built in code** from a data file, not exported from Blender: no Blender install or CC0 packs were available when Phase 2 ran. The contracts still support `.glb` rooms; see [Using a Blender room instead](#using-a-blender-room-instead).

## Files in a room folder

Copy `src/rooms/tiny-studio/` to `src/rooms/<room-id>/`. A room has four files:

| File           | What it is                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `index.ts`     | The `RoomDef`: id, name, order, mission, unlock, music. Self-registers; do not edit any shared file. |
| `objects.json` | One `ObjectDef` per kind of breakable (not per copy).                                                |
| `layout.ts`    | Data only: static furniture, where each breakable stands, and markers.                               |
| `room.ts`      | Three lines that hand the layout to the kit. Change only the room id.                                |

A room with its own logic adds `module.ts` (see `src/rooms/pop-star-dorm/`). Everything shared lives in `src/rooms/_kit/`; do not edit it from a room folder.

## Steps

1. **`index.ts`.** Set `id` (folder name), `name`, `order`, `mission`, `unlock.requiresStars` (2 × (order − 1)) and `music` (any id; each id gives its own generated tune). All text is English.
   - `lighting` sets the time of day: `mood` is `'day'` (the default when left out), `'sunrise'`, `'sunset'` or `'night'`.
   - `lighting.lamps` lists the object ids that shine in every mood but `day`, each with its tone: `{ floor_lamp: 'warm', monitor: 'cool' }`. A lamp glows and goes dark when it breaks. At most 4 lamps (2 on low quality) also light the room around them, picked far apart; the rest only glow.
   - `lighting.fixtures` are lights that cannot break. For wall lamps keep the positions in a small `lamps.ts` that both files import: `layout.ts` places `wallLamp()` there and `index.ts` passes `wallLampLight(at, rotY)` (see `src/rooms/cozy-cafe/`). Do not import `layout.ts` from `index.ts`; it would load the whole room with the menu.
2. **`objects.json`.** One entry per kind of object.
   - `meshNode` names a prop in `src/rooms/_kit/props.ts`. Reuse props; add a new one there only for the room's signature pieces.
   - `coins` must fit the tier: light 5–20, medium 30–80, heavy 100–300, trick 200–500, treasure 1,000+.
   - Exactly one treasure in the room.
   - A trick object with a `trigger` rule needs its own definition and trigger id per copy.
3. **`layout.ts`.**
   - `statics`: start with `shell(width, depth, height, colors)`, then furniture from `_kit/furniture.ts` moved into place with `place(parts, [x, y, z], rotY)`.
   - `objects`: `{ def, at: [x, y, z], rotY? }`. `at` is the point the object's base stands on, so `y` is the height of the surface. Use `row(def, count, from, step)` for lines of the same object.
   - `markers`: `cat_spawn`, `owner_door`, `camera_bounds`, `roomZone(width, depth, height)` with the shell's size, and one `trigger:<id>` per trigger id.
4. **Signature mechanic.** Use the existing `special` behaviors and triggers first (table below). Need more? Write `module.ts` on top of `createRoomModule`, or file a change request; do not edit system folders.
5. **Tune** with the room data test and by playing: 1 star in 1–3 tries for a first-time player, 3 stars only with a planned route to the treasure.
6. **Check** with the list at the end, then open one PR.

## Conventions

- **Units and axes.** Meters, Y up. The floor's top is `y = 0`. The room is open toward **−z**: the camera looks toward +z, the back wall is at +z, side walls at ±x.
- **Colors.** Only colors from `_kit/palette.ts`, with one warm accent per room. No textures, no text, no logos.
- **Object ids at runtime** are `<def id>_<n>` (`mug_1`, `mug_2`), assigned in layout order.
- **Standing on things.** An object's `at.y` must be the top of what it stands on (add 0.02 for something lying on a mat or cloth). The builder lifts every object 1 cm so it settles instead of starting in contact.
- **`camera_bounds`** is a unit cube scaled to the volume the camera may be in. Extend it about 6 m out of the open side: `at: [0, 3.1, -3], scale: [width + 0.4, 5.8, depth + 6]`.
- **Heights the cat can reach.** A tap jump reaches about 0.75 m, a held jump about 1.1 m. From one surface to the next keep the step under 0.9 m for an easy climb. Leave 0.5 m of free surface in front of a shelf the cat should jump up to, and make shelves at least 0.32 m deep.
- **Every object must be breakable where it can end up.** Any object also breaks after enough swats (4 to 10 by tier), so nothing can get stuck, but do not rely on it for the main route.

## Break rules and what triggers them

| Rule                         | Breaks when                                                                                                                                                             | Good for                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `impact` (`minImpulse`, N·s) | It lands with closing speed × mass at or above the value, or a pounce lands on it at least that hard (and at least 7 N·s). A drop of height h gives mass × √(19.6 × h). | Cups and vases on tables (set it between the drop from the cat's nudge and the drop from the table), heavy things that need a pounce |
| `fall` (`minHeightM`)        | It lands that far below where it last rested.                                                                                                                           | Anything on a shelf; set it below the shelf height                                                                                   |
| `hits` (`count`)             | It has been swatted or pounced on that many times.                                                                                                                      | Objects on the floor, soft things                                                                                                    |
| `trigger` (`triggerId`)      | `physics.fireTrigger(id)` runs. The kit module fires a trigger when the cat swats or pounces within 1.1 m of the `trigger:<id>` marker.                                 | Tablecloths, doors, gags                                                                                                             |

| `special`          | Effect                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| `tablecloth`       | When it breaks, everything standing on it is thrown toward its trigger marker. |
| `stack`            | A swat hits it at the top, so it topples instead of sliding.                   |
| `rolling`          | Keeps rolling once pushed.                                                     |
| `liquid`           | Splash of droplets and the `splash` sound.                                     |
| `electronic_spark` | Sparks and the `spark` sound.                                                  |

Zones: a marker named `trigger:zone_wet<anything>` is a unit cube scaled to a wet floor area; the cat slides inside it. The marker `trigger:zone_room` (`roomZone` in the kit) is a unit cube scaled to the room's inside: the cat cannot leave it, so it acts as an invisible wall on the open side and a ceiling. Objects pass through it and still break when they fall out of the room.

Springy surfaces: a marker named `trigger:zone_bounce<anything>` (`bounceZone` in the kit) is a unit cube scaled to lie on a surface such as a sofa seat or a `beanbag`. A jump that starts inside it goes about twice as high (about 1.9 m with the button held), enough to reach a shelf 2 m up.

Hanging objects: a marker named `trigger:zone_hang<anything>` (`hangZone` in the kit) is a unit cube scaled to a volume. A breakable whose center starts inside it hangs in the air until something moves it: a swat, the cat jumping into it, or another object. Then it falls, so give it a `fall` rule. Use the hanging props (a cord runs up from the body), put a `beam` over them and place them at the beam's underside minus `HANG_DROP` (see `src/rooms/karaoke-room/`). Keep everything else out of the zone. The camera looks down, so anything above about 1.8 m is out of view while the cat is on the floor: hang ordinary things with their base near 1.45 m and keep beams within about 1.2 m of the back wall, or the camera pulls in when a beam is between it and the cat.

Walkers: a room module can emit `walker/patrol` with a loop of waypoints; game rules run the NPC (see `src/rooms/pop-star-dorm/module.ts`). A room can have several, each with its own id (see `src/rooms/pottery-gallery/module.ts`). Keep the path clear of furniture and objects.

## Checklist

- [ ] `pnpm validate-objects` passes.
- [ ] The room is added to `tests/unit/rooms-data.test.ts` with its brief, and `pnpm test` passes: breakable count in range, total coins within 15% of the brief, exactly one treasure, every tier present, a trigger marker for each trigger rule, the Mission target reachable without the treasure with a 20% margin.
- [ ] Loaded in the game: nothing breaks on its own in the first 3 s, and no object starts inside furniture.
- [ ] The treasure can be reached and broken; the route needs at least two jumps or one trick.
- [ ] At least one trick setup and one chain of four or more objects.
- [ ] Mission played: 1 star in 1–3 tries without the treasure.
- [ ] Free Soul can be finished.
- [ ] Debug overlay (backtick key) on low quality: draw calls at most 100, awake bodies at most 60 on a phone.
- [ ] The room is added to `MISSIONS` in `tests/e2e/helpers.ts` and `pnpm test:e2e` passes with zero console errors.
- [ ] PR description: what was built, assumptions, known issues, a short recording, and the phone check note (device, FPS, issues).

## Using a Blender room instead

A `RoomDef` without `builder` loads `glb` through the asset service (Meshopt and KTX2).

- Each breakable mesh carries the glTF extra `{ "obj": "<ObjectDef.id>" }`; markers are empties with `{ "marker": "cat_spawn" | "camera_bounds" | "owner_door" | "trigger:<id>" }` (`trigger:zone_room` for the box the cat stays in). In Blender these are custom properties on the object; export with **Include › Custom Properties** on.
- Export glTF Binary (`.glb`), +Y up, apply modifiers, no cameras or lights. Mesh names must be unique per room: the mesh name is the runtime object id.
- A fracture set is an empty named as the definition's `fractureSet`, with the pieces as child meshes placed relative to the object's origin.
- Run `pnpm optimize-glb <export.glb> src/rooms/<room-id>/room.glb`. Textures need KTX-Software (`ktx`) installed.
- Not verified here: a room authored in Blender (only a generated test `.glb` went through the loader), and KTX2 textures.
