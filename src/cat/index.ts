// Entry point read by main.ts.
import type { SystemFactory } from '../core/services';
import { createCat } from './cat';
import { createTitleCat } from './title-cat';

export const startCat: SystemFactory = (services) => {
  const systems = [createCat(services), createTitleCat(services)];
  return {
    dispose() {
      for (const system of systems) system.dispose();
    },
  };
};
