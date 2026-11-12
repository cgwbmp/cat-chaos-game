import { describe, expect, it } from 'vitest';
import type { ObjectDef } from '../../src/core/types';
import { validateObjectDefs } from '../../src/core/validate';
import grayboxObjects from '../../src/rooms/_graybox/objects.json';

const vase: ObjectDef = {
  id: 'vase_tall',
  name: 'Tall Vase',
  tier: 'medium',
  coins: 50,
  massKg: 1.2,
  material: 'ceramic',
  break: { kind: 'impact', minImpulse: 4 },
  meshNode: 'vase_tall',
};

function errorsFor(change: Record<string, unknown>): string[] {
  const result = validateObjectDefs([{ ...vase, ...change }]);
  return result.ok ? [] : result.errors;
}

describe('validateObjectDefs', () => {
  it('accepts a valid definition and returns it', () => {
    expect(validateObjectDefs([vase])).toEqual({ ok: true, objects: [vase] });
  });

  it('accepts the optional fields', () => {
    expect(errorsFor({ fractureSet: 'vase_tall_pieces', special: 'liquid' })).toEqual([]);
  });

  it('accepts an empty list', () => {
    expect(validateObjectDefs([])).toEqual({ ok: true, objects: [] });
  });

  it.each([null, {}, 'objects', 42])('rejects a top level that is not an array: %j', (data) => {
    expect(validateObjectDefs(data).ok).toBe(false);
  });

  it('rejects an entry that is not an object', () => {
    const result = validateObjectDefs([vase, 'cup']);
    expect(result).toEqual({ ok: false, errors: ['[1]: expected an object'] });
  });

  it.each([
    ['id', ''],
    ['id', 'Tall Vase'],
    ['id', 'vase-tall'],
    ['id', 7],
    ['name', ''],
    ['name', '   '],
    ['tier', 'huge'],
    ['coins', '50'],
    ['coins', 50.5],
    ['massKg', 0],
    ['massKg', -1],
    ['massKg', Number.NaN],
    ['material', 'stone'],
    ['meshNode', ''],
    ['fractureSet', ''],
    ['special', 'explosive'],
    ['break', undefined],
    ['break', 'impact'],
    ['break', { kind: 'melt' }],
    ['break', { kind: 'impact' }],
    ['break', { kind: 'impact', minImpulse: 0 }],
    ['break', { kind: 'impact', minImpulse: 4, count: 2 }],
    ['break', { kind: 'hits', count: 0 }],
    ['break', { kind: 'hits', count: 1.5 }],
    ['break', { kind: 'fall', minHeightM: -1 }],
    ['break', { kind: 'trigger', triggerId: '' }],
  ])('rejects %s = %j', (key, value) => {
    const errors = errorsFor({ [key]: value });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`.${key}`);
  });

  it('rejects a missing required field', () => {
    const withoutMeshNode: Partial<ObjectDef> = { ...vase };
    delete withoutMeshNode.meshNode;
    const result = validateObjectDefs([withoutMeshNode]);
    expect(result).toEqual({
      ok: false,
      errors: ["[0] 'vase_tall'.meshNode: expected a non-empty string"],
    });
  });

  it('rejects unknown keys', () => {
    expect(errorsFor({ colour: 'blue' })).toEqual(["[0] 'vase_tall': unknown key(s) colour"]);
  });

  it.each([
    ['impact', { kind: 'impact', minImpulse: 2 }],
    ['hits', { kind: 'hits', count: 1 }],
    ['fall', { kind: 'fall', minHeightM: 0.5 }],
    ['trigger', { kind: 'trigger', triggerId: 'pull_cloth' }],
  ])('accepts the %s break rule', (_kind, rule) => {
    expect(errorsFor({ break: rule })).toEqual([]);
  });

  it.each([
    ['light', 5, 20],
    ['medium', 30, 80],
    ['heavy', 100, 300],
    ['trick', 200, 500],
  ])('%s tier allows %i to %i coins inclusive', (tier, min, max) => {
    expect(errorsFor({ tier, coins: min })).toEqual([]);
    expect(errorsFor({ tier, coins: max })).toEqual([]);
    expect(errorsFor({ tier, coins: min - 1 })).toHaveLength(1);
    expect(errorsFor({ tier, coins: max + 1 })).toHaveLength(1);
  });

  it('treasure tier needs 1,000 coins or more with no upper limit', () => {
    expect(errorsFor({ tier: 'treasure', coins: 999 })).toEqual([
      "[0] 'vase_tall'.coins: 999 is outside the treasure tier (1000 or more)",
    ]);
    expect(errorsFor({ tier: 'treasure', coins: 1000 })).toEqual([]);
    expect(errorsFor({ tier: 'treasure', coins: 250000 })).toEqual([]);
  });

  it('rejects duplicate ids', () => {
    const result = validateObjectDefs([vase, { ...vase, name: 'Another Vase' }]);
    expect(result).toEqual({ ok: false, errors: ["[1] 'vase_tall'.id: duplicate id"] });
  });

  it('reports every problem, not only the first', () => {
    const result = validateObjectDefs([
      { ...vase, massKg: 0, material: 'stone' },
      { ...vase, id: 'cup', coins: 5 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toHaveLength(3);
  });
});

describe('graybox objects.json', () => {
  const result = validateObjectDefs(grayboxObjects);
  const objects = result.ok ? result.objects : [];

  it('is valid', () => {
    expect(result).toMatchObject({ ok: true });
  });

  it('has 10 objects', () => {
    expect(objects).toHaveLength(10);
  });

  it('covers every tier', () => {
    expect(new Set(objects.map((object) => object.tier))).toEqual(
      new Set(['light', 'medium', 'heavy', 'trick', 'treasure']),
    );
  });

  it('covers every break rule', () => {
    expect(new Set(objects.map((object) => object.break.kind))).toEqual(
      new Set(['impact', 'hits', 'fall', 'trigger']),
    );
  });
});
