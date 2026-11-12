// Entry point read by main.ts.
import type { SystemFactory } from '../core/services';
import { createCat } from './cat';

export const startCat: SystemFactory = (services) => createCat(services);
