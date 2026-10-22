/**
 * @file 5e ability score inputs with derived modifiers and saving throw
 * proficiency checkboxes.
 */
import { formatModifier } from '../../../domain/dice';
import { ABILITIES, abilityModifier, type Ability } from '../../../domain/formats/dnd5e/abilities';
import type { Dnd5eStatBlock } from '../../../domain/formats/dnd5e/statBlock';
import { NumberInput } from '../../common/fields';

/** Props for AbilityEditor. */
interface Props {
  abilities: Dnd5eStatBlock['abilities'];
  savingThrows: Dnd5eStatBlock['savingThrows'];
  onChange(next: Pick<Dnd5eStatBlock, 'abilities' | 'savingThrows'>): void;
}

/** Scores in, modifiers out: modifiers are always derived by the format. */
export function AbilityEditor({ abilities, savingThrows, onChange }: Props) {
  // Change one ability score.
  const setScore = (a: Ability, n: number) => onChange({ savingThrows, abilities: { ...abilities, [a]: n } });
  // Toggle proficiency in one saving throw.
  const setSave = (a: Ability, on: boolean) => onChange({ abilities, savingThrows: { ...savingThrows, [a]: on } });
  return (
    <fieldset>
      <legend>Ability Scores</legend>
      <div className="sb-abilities">
        {ABILITIES.map((a) => (
          <div key={a} className="sb-ability-edit">
            <span className="sb-ability-name">{a.toUpperCase()}</span>
            <NumberInput value={abilities[a]} min={1} max={30} onChange={(n) => setScore(a, n)} />
            <span className="muted">{formatModifier(abilityModifier(abilities[a]))}</span>
            <label className="inline muted" title="Proficient in this saving throw">
              <input type="checkbox" checked={savingThrows[a]} onChange={(e) => setSave(a, e.target.checked)} />
              Save
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
