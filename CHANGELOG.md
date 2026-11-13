# Changelog

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
