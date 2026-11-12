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
