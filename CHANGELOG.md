# Changelog

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
