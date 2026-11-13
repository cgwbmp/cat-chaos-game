import { describe, expect, it } from 'vitest';
import { COSMETICS } from '../../src/core/cosmetics';
import { HAT_DESIGNS, hatParts } from '../../src/cat/hats';

const hats = COSMETICS.filter((item) => item.slot === 'hat');

describe('hat designs', () => {
  it('has a design for every hat of the catalog, and no others', () => {
    expect([...HAT_DESIGNS].sort()).toEqual(hats.map((hat) => hat.id).sort());
  });

  it('gives every hat its own shape', () => {
    const shapes = hats.map((hat) =>
      JSON.stringify(hatParts(hat.id, [1, 1, 1]).map(({ shape, size, at }) => [shape, size, at])),
    );
    expect(new Set(shapes).size).toBe(hats.length);
  });

  it('shows the catalog color, the one on the shop swatch', () => {
    for (const hat of hats) {
      const colors = hatParts(hat.id, hat.color).map((part) => part.color);
      expect(colors).toContainEqual(hat.color);
    }
  });

  it('keeps every part near the top of the head', () => {
    for (const hat of hats) {
      for (const part of hatParts(hat.id, hat.color)) {
        const [x, y, z] = part.at;
        expect(Math.hypot(x, z)).toBeLessThan(1.2);
        expect(y).toBeGreaterThan(-0.3);
        expect(y + part.size[1]).toBeLessThan(1.5);
      }
    }
  });

  it('falls back to a plain cone for a hat without a design', () => {
    const [cone, ...rest] = hatParts('hat_unknown', [0.2, 0.4, 0.6]);
    expect(rest).toEqual([]);
    expect(cone).toMatchObject({ shape: 'cyl', size: [1, 1.1, 0], color: [0.2, 0.4, 0.6] });
  });
});
