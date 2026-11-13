// Room kit, from data alone: the prop library and the furniture with fronts.
import { describe, expect, it } from 'vitest';
import { cabinet, fridge } from '../../src/rooms/_kit/furniture';
import { C } from '../../src/rooms/_kit/palette';
import type { Color, Part } from '../../src/rooms/_kit/parts';
import { PROPS } from '../../src/rooms/_kit/props';

const PALETTE = new Set<Color>(Object.values(C));

/** The lowest point of a part, taking it as a box turned about z, then x (y does not matter). */
function lowest(part: Part): number {
  const [width, height, third] = part.size;
  const [halfX, halfZ] =
    part.shape === 'cyl'
      ? [Math.max(width, third) / 2, Math.max(width, third) / 2]
      : [width / 2, third / 2];
  const [pitch, , roll] = part.rot;
  const reach =
    Math.abs(Math.sin(roll) * Math.cos(pitch)) * halfX +
    Math.abs(Math.cos(roll) * Math.cos(pitch)) * (height / 2) +
    Math.abs(Math.sin(pitch)) * halfZ;
  return part.at[1] + height / 2 - reach;
}

describe.each(Object.entries(PROPS))('prop %s', (_name, parts) => {
  it('is made of parts with a size, in palette colors', () => {
    expect(parts.length).toBeGreaterThan(0);
    for (const part of parts) {
      // A cone's top diameter is 0.
      expect(Math.min(part.size[0], part.size[1])).toBeGreaterThan(0);
      expect(PALETTE.has(part.color)).toBe(true);
    }
  });

  it('stands on its base at y = 0', () => {
    expect(Math.min(...parts.map(lowest))).toBeCloseTo(0, 2);
  });
});

describe('cabinet', () => {
  const depth = 0.6;
  const reach = (parts: Part[]): number =>
    Math.min(...parts.map((part) => part.at[2] - part.size[2] / 2));

  it('has a front and a pull for every door or drawer', () => {
    const plain = cabinet(1.2, 0.9, depth, C.white, C.peach, 0, 'panels').length;
    expect(cabinet(1.2, 0.9, depth, C.white, C.peach, 3).length).toBe(plain + 6);
    expect(cabinet(1.2, 0.9, depth, C.white, C.peach, 3, 'drawers').length).toBe(plain + 6);
    expect(cabinet(1.2, 0.9, depth, C.white, C.peach, 3, 'panels').length).toBe(plain + 3);
  });

  it('keeps its fronts and pulls within 2.5 cm of the body, so nothing catches on them', () => {
    expect(reach(cabinet(1.2, 0.9, depth, C.white, C.peach, 3))).toBeGreaterThan(
      -depth / 2 - 0.025,
    );
    expect(reach(fridge(0.6, 0.9, depth, C.mint, C.white))).toBeGreaterThan(-depth / 2 - 0.03);
  });
});
