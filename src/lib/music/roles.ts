// How each analysis role is drawn: a colour class and a fretboard shape, so colour is never the
// only cue.

import type { Role } from './types';

export type RoleShape = 'circle' | 'diamond' | 'ring' | 'square';
export type RoleClass = 'chord' | 'tension' | 'approach' | 'scale';

export const ROLE_SHAPE: Record<Role, RoleShape> = {
  'chord-tone': 'circle',
  tension: 'diamond',
  'approach-chromatic': 'ring',
  'approach-diatonic': 'ring',
  enclosure: 'ring',
  passing: 'ring',
  neighbor: 'ring',
  scale: 'square',
};

export const ROLE_CLASS: Record<Role, RoleClass> = {
  'chord-tone': 'chord',
  tension: 'tension',
  'approach-chromatic': 'approach',
  'approach-diatonic': 'approach',
  enclosure: 'approach',
  passing: 'approach',
  neighbor: 'approach',
  scale: 'scale',
};
