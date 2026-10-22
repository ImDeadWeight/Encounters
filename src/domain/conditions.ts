/**
 * @file Condition model: definitions (built-in per format, or user-created
 * custom ones) and conditions applied to a combatant in an encounter.
 */
import type { Id } from './ids';
import type { FormatId } from './formats/formatIds';

/** A condition that can be applied, with its rules text. */
export interface ConditionDef {
  id: Id;
  name: string;
  /** What the condition does to the creature. */
  effect: string;
  /** How it usually ends (shown as "Ends: …" under the condition). */
  endsWhen: string;
  /**
   * Default for "save each turn". Conditions themselves rarely demand a roll;
   * the effect that applies them does, so each applied instance can override this.
   */
  repeatsSave: boolean;
  /** Carries a number, e.g. Frightened 2 (formats with valued conditions only). */
  valued?: boolean;
  /** Valued only: the number drops by 1 at the end of the creature's turn; at 0 it ends. */
  dropsEachTurn?: boolean;
}

/** A condition created by the user; stored and offered for every character of that format. */
export interface CustomCondition extends ConditionDef {
  formatId: FormatId;
}

/** A condition applied to a combatant. */
export interface ActiveCondition {
  /** Unique per application, so the same condition can be applied twice. */
  instanceId: Id;
  /** The definition it came from (built-in or custom). */
  conditionId: Id;
  /** Copied from the definition so it still displays if a custom definition is deleted. */
  name: string;
  /** The condition's number (Frightened 2); null for conditions without one. */
  value: number | null;
  /** Copied from the definition: the value drops by 1 at the end of the creature's turn. */
  dropsEachTurn: boolean;
  /** Only these gate Next Turn: the creature must roll (and the DM resolve) each turn. */
  requiresResolve: boolean;
  /** Acknowledged for the current turn; reset when the combatant's turn begins. */
  resolvedThisTurn: boolean;
}

/** Highest value a valued condition can reach. */
export const MAX_CONDITION_VALUE = 20;

/** Display name with the value, e.g. "Frightened 2". */
export function conditionLabel(c: Pick<ActiveCondition, 'name' | 'value'>): string {
  return c.value === null ? c.name : `${c.name} ${c.value}`;
}

/** Instruction shown under conditions that need a roll each turn. */
export const REPEAT_SAVE_HINT =
  'Each turn: roll the save or check the effect allows, then Resolve. On a success, remove the condition.';
