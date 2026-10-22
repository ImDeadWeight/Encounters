/**
 * @file The B/X format (classic Basic/Expert rules and their retro-clones):
 * side initiative on a d6 rolled every round, and death at 0 HP.
 */
import type { GameFormat } from '../formatTypes';
import { BX_CONDITIONS } from './conditions';
import { sanitizeBxStatBlock } from './sanitize';
import { createEmptyBxStatBlock, type BxStatBlock } from './statBlock';

/** B/X: each side rolls 1d6 every round and acts together; 0 HP is dead. */
export const bx: GameFormat<BxStatBlock> = {
  id: 'bx',
  name: 'B/X',
  statBlockType: 'bx',
  conditions: BX_CONDITIONS,
  valuedConditions: true,
  createEmptyStatBlock: createEmptyBxStatBlock,
  initiativeMode: 'sides',
  initiativeDie: 6,
  initiativeModifier: () => 0,
  initiativeTiebreak: () => 0,
  dying: { kind: 'deadAtZero' },
  maxHp: (sb) => sb.maxHp,
  hitDice: (sb) => sb.hitDice,
  sanitizeStatBlock: sanitizeBxStatBlock,
};

export type { BxStatBlock };
