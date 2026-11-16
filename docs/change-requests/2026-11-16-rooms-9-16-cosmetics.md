# Change request: 3-star cosmetics for rooms 9–16

- **From:** room agent for rooms 9–16 (branch `p3/rooms-9-16`)
- **Date:** 2026-11-16
- **File:** `src/core/cosmetics.ts` (and the hat models in `src/cat/hats.ts`)
- **Status:** waiting for the owner

## Problem

The spec gives every room one hat or collar for 3 stars. `COSMETICS` in `src/core/cosmetics.ts` has one entry per room for rooms 1–8 only, and `src/core/` is frozen. Rooms 9–16 therefore have no 3-star reward: the shop shows nothing for them, and nothing else breaks.

## Proposed change

Add eight entries to `COSMETICS`, one per new room. Collars need no model; each hat needs a model in `src/cat/hats.ts`.

| Room              | Id             | Name           | Slot   |
| ----------------- | -------------- | -------------- | ------ |
| `karaoke-room`    | `collar_disco` | Disco Collar   | collar |
| `flower-shop`     | `hat_flower`   | Flower Crown   | hat    |
| `comic-cafe`      | `collar_comic` | Hero Collar    | collar |
| `night-market`    | `hat_chef`     | Cook's Cap     | hat    |
| `classroom`       | `hat_grad`     | Graduation Cap | hat    |
| `rooftop-garden`  | `hat_straw`    | Straw Hat      | hat    |
| `pottery-gallery` | `collar_jade`  | Jade Collar    | collar |
| `penthouse`       | `hat_top`      | Top Hat        | hat    |

## Who it affects

- **UI (`src/ui/`)** lists the new items in the shop; no code change.
- **Cat (`src/cat/`)** needs five new hat models.
- No event or service interface changes.

## Until it is approved

No workaround is needed: the rooms play and save stars without a reward.
