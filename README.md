# Cat Chaos

A browser game: you are a cat, and the owner is out. Knock things over and break as much as you can before the owner comes home.

Current version: **0.1.2-alpha** (see [CHANGELOG.md](CHANGELOG.md)). Notes for testers are in [docs/alpha-testing.md](docs/alpha-testing.md).

## What is in the game

- 8 rooms, from a tiny studio apartment to a spa and bathhouse. Rooms unlock with stars.
- Two modes per room: **Mission** (earn a coin target before the time runs out) and **Free Soul** (no timer, break everything).
- A cat that walks, runs, jumps, swats, pounces and gets the zoomies.
- A shop with fur colors, collars and hats, bought with coins or earned with 3 stars in a room.
- Keyboard on desktop, touch controls on phones (landscape only). Progress is saved in the browser.

## Run it locally

You need Node 22.12 or newer and pnpm 10.

```sh
pnpm install
pnpm dev        # dev server, also reachable from a phone on the same network
```

```sh
pnpm build      # production build in dist/
pnpm preview    # serve dist/ on http://localhost:4173
```

## Checks

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `pnpm lint`             | ESLint and Prettier                                            |
| `pnpm typecheck`        | TypeScript                                                     |
| `pnpm test`             | Unit tests (Vitest)                                            |
| `pnpm validate-objects` | Checks every room's `objects.json`                             |
| `pnpm check-size`       | Fails if the build is over 3 MB gzip                           |
| `pnpm test:e2e`         | Builds, then plays every room in three browsers (Playwright)   |
| `pnpm test:perf`        | Breaks 60 objects at once and fails under 50 frames per second |

Before the first Playwright run: `pnpm exec playwright install chromium webkit`.

## Release to GitHub Pages

The workflow in [.github/workflows/pages.yml](.github/workflows/pages.yml) builds `main` and publishes it on every push to `main`. It can also be started by hand from the Actions tab.

One-time setup: in the repository on GitHub, open Settings, then Pages, and set the source to "GitHub Actions". The game is then served at `https://<user>.github.io/<repository>/`.

The Pages build has no portal SDK and no ads. Portal builds are made with `VITE_PLATFORM=poki pnpm build` or `VITE_PLATFORM=crazygames pnpm build`.

## Where things are

- [docs/spec.md](docs/spec.md): the full build spec, including the quality bars.
- [AGENTS.md](AGENTS.md): rules for anyone, human or agent, who changes the code.
- [TASKS.md](TASKS.md): the task board.
- [docs/room-template.md](docs/room-template.md): how to build a room.
- [assets/CREDITS.md](assets/CREDITS.md): the source of every asset.
- `src/`: the game. `tools/`: build tools, including the Blender script that generates the cat.
