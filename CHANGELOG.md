# Changelog

## 0.1.2-alpha (2026-11-13)

The cat now waits on the title screen and tries things on in the shop, every hat has its own shape, and furniture and objects have more detail. The Traditional Wooden House has one object fewer and one new one, so its coin totals differ from 0.1.1-alpha.

### In this release

- The cat peeks in from the bottom right corner of the title screen and looks at you. It wears what is equipped.
- The same cat is in the shop: a fur color, collar or hat shows on it as soon as you press Wear. On wide screens the list moves left to make room for it.
- Every hat has its own shape; before, each was a cone in its own color. Party Hat: a striped cone with a pompom. Gold Crown: points, jewels and a velvet cap. Clerk Cap: a uniform cap with a visor. Barista Beret. Knit Bonnet: a cuffed knit cap with a pompom. Scholar Hat: a gat, with a wide brim and a small crown. Towel Hat: a bathhouse towel with a roll at each ear.
- Hats are larger, so they show from the game camera.
- Cabinets, counters and chests have doors, drawers and handles. The drinks cooler in the Corner Convenience Store has glass doors, and the Tiny Studio Apartment has a fridge with a freezer door.
- Most objects are drawn with more detail, for example the Fancy Espresso Machine, the Laptop, the Alarm Clock and the Golden Lucky Cat.
- Traditional Wooden House: the paper sliding door that stood as a screen in the front room is gone (it was worth 500 coins). A floor vase stands opposite the scrolls.
- A pounce runs to its landing: pressing pounce again in the air no longer cuts it short. A press just before the landing starts the next pounce, like a jump.

### Known issues

- Frame rate has only been measured in automated browsers on a desktop. It has not been measured on a real phone. The frame rate test runs in a room without lamps, so the lamp lights have not been measured; the cat on the title screen and the more detailed furniture and objects have not been measured either.
- The cat on the title screen and in the shop has only been checked in a desktop browser at phone sizes, not on a real phone.
- On phones the shop list has two columns beside the cat, so the hats are below the fur colors and need a scroll.
- The collar is mostly below the edge of the screen on the title screen and in the shop.
- Tall hats (Party Hat, Knit Bonnet) make the cat on the title screen taller than the sixth of the screen it is sized for. The Scholar Hat's brim passes through the ears, and the Towel Hat's rolls cover them.
- The balance of coin targets and time limits has not been tested with players, and has not been retuned for the lower jump and softer swat of 0.1.1-alpha or for the changed objects in the Traditional Wooden House.
- The cat has no mouth or whiskers, and the collars are plain shapes.
- The debug overlay (backtick key, or a three-finger tap) is still in the build. Its buttons add coins and unlock rooms.
- Phones must be held in landscape.
- Builds for game portals (Poki, CrazyGames) are not part of this release and have not been tested.
- The automated browser tests time out on phone emulation when four run at once on a development machine. They pass two at a time, which is how CI runs them.

## 0.1.1-alpha (2026-11-13)

Rooms get their own time of day, and the cat stays inside the room. The jump and the swat are weaker than in 0.1.0-alpha, so routes that worked there may not work now.

### In this release

- Each room is lit for a time of day. Sunrise: Tiny Studio Apartment, Spa & Bathhouse. Sunset: Cozy Café, Grandma's House, Pop Star Dorm. Night: Corner Convenience Store, Gaming Café, Traditional Wooden House.
- Lamps, lanterns and screens glow and light the room around them. A lamp goes dark when it breaks.
- Wall lamps in the Cozy Café and the Corner Convenience Store, and cool light from the drinks cooler in the store.
- Invisible walls and a ceiling: the cat can no longer walk off the open side of a room or jump over a wall. Objects still fall out and break.
- Lower jump: a held jump reaches about 1.1 m (was 1.9 m), a tap about 0.75 m (was 1 m).
- Softer swat: light objects fly off at 2 m/s (was 3.2 m/s).

### Fixed

- The cat's head went into walls and table legs.
- The "Caught!" message could show again at the start of the next level.
- Pinching, or tapping fast around the touch buttons, could zoom the page on phones.

### Known issues

- Frame rate has only been measured in automated browsers on a desktop. It has not been measured on a real phone. The frame rate test runs in a room without lamps, so the new lamp lights have not been measured.
- The balance of coin targets and time limits has not been tested with players, and has not been retuned for the lower jump and softer swat.
- The cat has no mouth or whiskers, and the hats and collars are plain shapes.
- The debug overlay (backtick key, or a three-finger tap) is still in the build. Its buttons add coins and unlock rooms.
- Phones must be held in landscape.
- Builds for game portals (Poki, CrazyGames) are not part of this release and have not been tested.
- The automated browser tests time out on phone emulation when four run at once on a development machine. They pass two at a time, which is how CI runs them.

## 0.1.0-alpha (2026-11-12)

The first release for testers. Everything is playable from the title screen to the results screen, but nothing has been tuned with outside players yet.

### In this release

- 8 rooms: Tiny Studio Apartment, Corner Convenience Store, Cozy Café, Gaming Café, Grandma's House, Pop Star Dorm, Traditional Wooden House, Spa & Bathhouse.
- Mission and Free Soul modes, stars, coins and room unlocks.
- The cat: a low poly, four-legged cat made for this project, with walk, run, jump, swat, pounce and zoomies.
- Shop with fur colors, collars and hats.
- Keyboard and touch controls, a first-run tutorial, pause, settings (music, sound, quality).
- Sound effects and music generated in the browser; no audio files.
- Progress saved in the browser.

### Fixed before release

- Restart or Quit on the pause screen left the next level frozen: the timer ran, but the cat did not move.

### Known issues

- Frame rate has only been measured in automated browsers on a desktop. It has not been measured on a real phone.
- The balance of coin targets and time limits has not been tested with players.
- The cat has no mouth or whiskers, and the hats and collars are plain shapes.
- The debug overlay (backtick key, or a three-finger tap) is still in the build. Its buttons add coins and unlock rooms.
- Phones must be held in landscape.
- Builds for game portals (Poki, CrazyGames) are not part of this release and have not been tested.
- The automated browser tests timed out twice on phone emulation during release checks and passed on every later run; the cause is not known.
