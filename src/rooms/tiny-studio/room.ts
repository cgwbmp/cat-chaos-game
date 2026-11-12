import type { RoomBuilder } from '../../core/types';
import { buildRoom as build } from '../_kit/build';
import { layout } from './layout';
import objects from './objects.json';

export const buildRoom: RoomBuilder = (scene) => build(scene, 'tiny-studio', layout, objects);
