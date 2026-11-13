import { describe, expect, it } from 'vitest';
import { PEEK_AREA, PEEK_BOX, peekPlacement } from '../../src/cat/title-cat';

const FOV = 0.8;
// Phone landscape, 4:3, 16:9, ultrawide and a tall desktop window.
const ASPECTS = [640 / 360, 4 / 3, 16 / 9, 21 / 9, 9 / 16];

describe('peekPlacement', () => {
  it('sizes the box around the cat to a sixth of the screen on every aspect', () => {
    expect(PEEK_AREA).toBeCloseTo(1 / 6);
    for (const aspect of ASPECTS) {
      const { z } = peekPlacement(aspect, FOV);
      const screenHeight = 2 * z * Math.tan(FOV / 2); // meters at the cat
      const screenWidth = screenHeight * aspect;
      const box = PEEK_BOX.height * (PEEK_BOX.height * PEEK_BOX.aspect);
      expect(box / (screenHeight * screenWidth)).toBeCloseTo(PEEK_AREA);
    }
  });

  it('keeps the cat in the bottom right corner, in front of the camera', () => {
    for (const aspect of ASPECTS) {
      const { x, y, z } = peekPlacement(aspect, FOV);
      const halfHeight = z * Math.tan(FOV / 2);
      expect(z).toBeGreaterThan(0.1); // the camera's near plane
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(halfHeight * aspect);
      expect(y).toBeLessThan(0);
      expect(y).toBeGreaterThan(-halfHeight - PEEK_BOX.height);
    }
  });

  it('turns the cat to the camera from where it lies', () => {
    const { x, z, yaw } = peekPlacement(16 / 9, FOV);
    // Facing the camera exactly would be a yaw of pi plus the bearing of the cat.
    const turn = yaw - Math.PI - Math.atan2(x, z);
    expect(turn).toBeGreaterThan(0);
    expect(turn).toBeLessThan(0.5);
  });
});
