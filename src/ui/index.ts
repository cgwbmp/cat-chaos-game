// Entry point read by main.ts.
import type { SystemFactory } from '../core/services';
import { createUi } from './ui';

export const startUi: SystemFactory = (services) => createUi(services);
