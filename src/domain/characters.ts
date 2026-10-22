/**
 * @file Character model: reusable character templates (PCs and NPCs), their
 * tags, and the stat block union across game formats. Encounters link to
 * templates by id rather than copying them.
 */
import type { Id } from './ids';
import type { FormatId } from './formats/formatIds';
import type { Dnd5eStatBlock } from './formats/dnd5e/statBlock';
import type { BxStatBlock } from './formats/bx/statBlock';
import type { D20StatBlock } from './formats/d20/statBlock';
import type { Pf2eStatBlock } from './formats/pf2e/statBlock';

/** Player character or non-player character. */
export type CharacterKind = 'pc' | 'npc';

/** Union of every format's stat block. Grows as formats are added. */
export type StatBlock = Dnd5eStatBlock | Pf2eStatBlock | D20StatBlock | BxStatBlock;

/** A user-created label for filtering characters (e.g. "Undead", "Goblinoid"). Shared library-wide. */
export interface Tag {
  id: Id;
  name: string;
}

/** A reusable character/creature definition. Encounters reference it by id. */
export interface CharacterTemplate {
  id: Id;
  name: string;
  kind: CharacterKind;
  /** Game system; decides the stat block shape and rules. Also acts as a filter tag. */
  formatId: FormatId;
  tagIds: Id[];
  /**
   * Follows the format's dying rules at 0 HP (death saves, Dying, negative
   * HP) instead of dying outright. Always true for PCs; opt-in for NPCs.
   */
  deathSaves: boolean;
  /** null when the stat block was skipped. */
  statBlock: StatBlock | null;
}

/** Whether a character follows the dying rules at 0 HP: always for PCs, opt-in for NPCs. */
export function usesDeathSaves(t: Pick<CharacterTemplate, 'kind' | 'deathSaves'>): boolean {
  return t.kind === 'pc' || t.deathSaves;
}
