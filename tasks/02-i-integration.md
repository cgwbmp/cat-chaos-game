---
id: 02-i-integration
title: Integration
phase: 2
agent: I
status: in-review
branch: not specified in spec
owns: [merges of p1/* branches, integration fixes]
depends_on: [01-a-physics-breakables, 01-b-cat-input, 01-c-game-rules, 01-d-ui, 01-e-audio-save-platform, 01-f-rendering-camera]
blocks: [02-r0-tiny-studio, 03-walker-behavior]
spec: "SPEC.md › Phase 2 › Agent I — Integration"
---

# I — Integration (sequential)

## Scope

1. Merge branches A–F in order: F, A, B, E, C, D. Run CI after each merge; fix integration bugs, never reshape another agent's design without a note in the PR.
2. Swap stubs for real services; delete the stubs that are no longer needed (keep them as test doubles in `tests/`).
3. Drop in the final cat model (`assets/shared/cat.glb`, supplied by the owner) and wire its animation clips.

## Done when

Derived from the steps above; the spec gives no explicit "Done when" for I.

- [ ] All six Phase 1 branches merged in order with CI green after each merge.
- [ ] Game runs on real services; unused stubs moved to `tests/` as test doubles.
- [ ] Final cat model wired with its animation clips.

R0 (`02-r0-tiny-studio`) may start once step 2 is merged. The Phase 2 exit check lives in the R0 task.

## External dependency

- `assets/shared/cat.glb` is supplied by the owner. If it has not arrived, keep the capsule and note it in the PR.

## Kickoff prompt

```
You are agent I (then R0). Read AGENTS.md and docs/spec.md. Complete "Phase 2".
```
