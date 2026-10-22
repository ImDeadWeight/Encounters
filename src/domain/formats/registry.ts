/**
 * @file Registry of all game formats. Everything outside a format looks
 * formats up here by id.
 */
import { dnd5e } from './dnd5e';
import { dnd5e2024 } from './dnd5e2024';
import { bx } from './bx';
import { dnd35, pf1e } from './d20';
import { pf2e } from './pf2e';
import { sf2e } from './sf2e';
import type { FormatId } from './formatIds';
import type { GameFormat } from './formatTypes';
import type { StatBlock } from '../characters';

/** Every format by id, in dropdown order. Each template only ever hands a format its own stat block shape. */
export const FORMATS: Record<FormatId, GameFormat<StatBlock>> = {
  dnd5e,
  dnd5e2024,
  pf2e,
  sf2e,
  pf1e,
  dnd35,
  bx,
};

/** All formats as a list, e.g. for the Format dropdown. */
export const FORMAT_LIST = Object.values(FORMATS);

/** The format with the given id. */
export function getFormat(id: FormatId): GameFormat<StatBlock> {
  return FORMATS[id];
}
