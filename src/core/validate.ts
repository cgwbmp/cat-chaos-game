// Schema check of objects.json against ObjectDef. Used by the asset service at load time and by
// tools/validate-objects.
import type { BreakRule, Material, ObjectDef, ObjectSpecial, ObjectTier } from './types';

/** Coin range per tier, inclusive (SPEC.md › Core contracts). */
export const COIN_RANGES: Record<ObjectTier, readonly [min: number, max: number]> = {
  light: [5, 20],
  medium: [30, 80],
  heavy: [100, 300],
  trick: [200, 500],
  treasure: [1000, Infinity],
};

const MATERIALS: readonly Material[] = [
  'ceramic',
  'glass',
  'wood',
  'plastic',
  'paper',
  'metal',
  'fabric',
  'electronic',
];

const SPECIALS: readonly ObjectSpecial[] = [
  'tablecloth',
  'stack',
  'rolling',
  'liquid',
  'electronic_spark',
];

const OBJECT_KEYS: readonly string[] = [
  'id',
  'name',
  'tier',
  'coins',
  'massKg',
  'material',
  'break',
  'meshNode',
  'fractureSet',
  'special',
];

const ID_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

export type ValidationResult = { ok: true; objects: ObjectDef[] } | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function checkBreakRule(value: unknown, at: string, errors: string[]): value is BreakRule {
  if (!isRecord(value)) {
    errors.push(`${at}.break: expected an object`);
    return false;
  }
  const expectKeys = (keys: string[]) => {
    const extra = Object.keys(value).filter((key) => !keys.includes(key));
    if (extra.length > 0) errors.push(`${at}.break: unknown key(s) ${extra.join(', ')}`);
    return extra.length === 0;
  };
  switch (value.kind) {
    case 'impact':
      if (!isPositiveNumber(value.minImpulse)) {
        errors.push(`${at}.break.minImpulse: expected a number above 0`);
        return false;
      }
      return expectKeys(['kind', 'minImpulse']);
    case 'hits':
      if (!Number.isInteger(value.count) || !isPositiveNumber(value.count)) {
        errors.push(`${at}.break.count: expected an integer of 1 or more`);
        return false;
      }
      return expectKeys(['kind', 'count']);
    case 'fall':
      if (!isPositiveNumber(value.minHeightM)) {
        errors.push(`${at}.break.minHeightM: expected a number above 0`);
        return false;
      }
      return expectKeys(['kind', 'minHeightM']);
    case 'trigger':
      if (!isNonEmptyString(value.triggerId)) {
        errors.push(`${at}.break.triggerId: expected a non-empty string`);
        return false;
      }
      return expectKeys(['kind', 'triggerId']);
    default:
      errors.push(`${at}.break.kind: expected 'impact', 'hits', 'fall' or 'trigger'`);
      return false;
  }
}

function checkObject(value: unknown, at: string, errors: string[]): value is ObjectDef {
  if (!isRecord(value)) {
    errors.push(`${at}: expected an object`);
    return false;
  }
  const before = errors.length;

  const extra = Object.keys(value).filter((key) => !OBJECT_KEYS.includes(key));
  if (extra.length > 0) errors.push(`${at}: unknown key(s) ${extra.join(', ')}`);

  if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) {
    errors.push(`${at}.id: expected snake_case letters and digits, e.g. 'vase_tall'`);
  }
  if (!isNonEmptyString(value.name)) errors.push(`${at}.name: expected a non-empty string`);
  if (!isPositiveNumber(value.massKg)) errors.push(`${at}.massKg: expected a number above 0`);
  if (!isOneOf(value.material, MATERIALS)) {
    errors.push(`${at}.material: expected one of ${MATERIALS.join(', ')}`);
  }
  if (!isNonEmptyString(value.meshNode)) {
    errors.push(`${at}.meshNode: expected a non-empty string`);
  }
  if (value.fractureSet !== undefined && !isNonEmptyString(value.fractureSet)) {
    errors.push(`${at}.fractureSet: expected a non-empty string when present`);
  }
  if (value.special !== undefined && !isOneOf(value.special, SPECIALS)) {
    errors.push(`${at}.special: expected one of ${SPECIALS.join(', ')}`);
  }

  const tiers = Object.keys(COIN_RANGES) as ObjectTier[];
  if (!isOneOf(value.tier, tiers)) {
    errors.push(`${at}.tier: expected one of ${tiers.join(', ')}`);
  } else if (!Number.isInteger(value.coins)) {
    errors.push(`${at}.coins: expected an integer`);
  } else {
    const [min, max] = COIN_RANGES[value.tier];
    const coins = value.coins as number;
    if (coins < min || coins > max) {
      const range = max === Infinity ? `${min} or more` : `${min} to ${max}`;
      errors.push(`${at}.coins: ${coins} is outside the ${value.tier} tier (${range})`);
    }
  }

  checkBreakRule(value.break, at, errors);
  return errors.length === before;
}

/** Validates the parsed contents of an objects.json file: an array of ObjectDef with unique ids. */
export function validateObjectDefs(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return { ok: false, errors: ['expected an array of object definitions'] };
  }
  const errors: string[] = [];
  const objects: ObjectDef[] = [];
  const seen = new Set<string>();

  data.forEach((entry: unknown, index) => {
    const id = isRecord(entry) && typeof entry.id === 'string' ? entry.id : undefined;
    const at = id ? `[${index}] '${id}'` : `[${index}]`;
    if (checkObject(entry, at, errors)) {
      if (seen.has(entry.id)) errors.push(`${at}.id: duplicate id`);
      seen.add(entry.id);
      objects.push(entry);
    }
  });

  return errors.length === 0 ? { ok: true, objects } : { ok: false, errors };
}
