/**
 * @file Campaign/area/encounter tree operations: queries for the sidebar,
 * moves (drag and drop, Edit dialog), cascading deletes, and checking which
 * encounters use a character. Areas can nest inside other areas.
 */
import type { Id } from '../ids';
import type { Area, Encounter, Library } from './types';

/**
 * Top-level areas of a campaign. An area whose parent is missing (e.g. bad
 * data) is shown here too rather than disappearing.
 */
export function areasOf(lib: Pick<Library, 'areas'>, campaignId: Id): Area[] {
  return lib.areas.filter(
    (a) => a.campaignId === campaignId && (a.parentAreaId === null || !lib.areas.some((p) => p.id === a.parentAreaId)),
  );
}

/** Areas directly inside another area. */
export function childAreasOf(lib: Pick<Library, 'areas'>, areaId: Id): Area[] {
  return lib.areas.filter((a) => a.parentAreaId === areaId);
}

/** Every area nested anywhere below an area (not including itself). */
export function descendantAreaIds(lib: Pick<Library, 'areas'>, areaId: Id): Set<Id> {
  const found = new Set<Id>();
  const queue = [areaId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const a of lib.areas) {
      if (a.parentAreaId === current && !found.has(a.id) && a.id !== areaId) {
        found.add(a.id);
        queue.push(a.id);
      }
    }
  }
  return found;
}

/** An area and everything nested below it. */
function subtreeOf(lib: Pick<Library, 'areas'>, areaId: Id): Set<Id> {
  return new Set([areaId, ...descendantAreaIds(lib, areaId)]);
}

/** A campaign's areas in sidebar order (parents before children), with nesting depth and a "Prison › Mines" path label. */
export function flattenAreas(lib: Pick<Library, 'areas'>, campaignId: Id): { area: Area; depth: number; path: string }[] {
  const out: { area: Area; depth: number; path: string }[] = [];
  const visit = (area: Area, depth: number, prefix: string) => {
    const path = prefix ? `${prefix} › ${area.name}` : area.name;
    out.push({ area, depth, path });
    for (const child of childAreasOf(lib, area.id)) visit(child, depth + 1, path);
  };
  for (const top of areasOf(lib, campaignId)) visit(top, 0, '');
  return out;
}

/**
 * Repairs area parents after an import: breaks any parent loop, and gives
 * every nested area the campaign of the area at the top of its chain.
 */
export function normalizeAreas(areas: Area[]): Area[] {
  const byId = new Map(areas.map((a) => [a.id, a]));
  // Break loops: walk up from each area; if we revisit one, detach the area that closed the loop.
  for (const start of areas) {
    const seen = new Set<Id>();
    let current: Area | undefined = byId.get(start.id);
    while (current && current.parentAreaId !== null) {
      seen.add(current.id);
      const parent = byId.get(current.parentAreaId);
      if (parent && seen.has(parent.id)) {
        byId.set(current.id, { ...current, parentAreaId: null });
        break;
      }
      current = parent;
    }
  }
  // rootOf(): the topmost area of a chain (loops are already broken).
  const rootOf = (a: Area): Area => {
    let current = a;
    for (let parent = current.parentAreaId ? byId.get(current.parentAreaId) : undefined; parent; ) {
      current = parent;
      parent = current.parentAreaId ? byId.get(current.parentAreaId) : undefined;
    }
    return current;
  };
  return areas.map((a) => {
    const fixed = byId.get(a.id)!;
    const campaignId = rootOf(fixed).campaignId;
    return fixed.campaignId === campaignId && fixed === a ? a : { ...fixed, campaignId };
  });
}

/** Encounters sitting directly under a campaign (not inside an area). */
export function looseEncountersOf(lib: Library, campaignId: Id): Encounter[] {
  return lib.encounters.filter((e) => e.campaignId === campaignId && e.areaId === null);
}

/** Encounters inside an area. */
export function encountersOfArea(lib: Library, areaId: Id): Encounter[] {
  return lib.encounters.filter((e) => e.areaId === areaId);
}

/** Encounters that belong to no campaign. */
export function unfiledEncounters(lib: Library): Encounter[] {
  return lib.encounters.filter((e) => e.campaignId === null);
}

/** Drop target for an encounter. An area target implies its campaign. */
export type EncounterDestination =
  | { kind: 'root' }
  | { kind: 'campaign'; campaignId: Id }
  | { kind: 'area'; areaId: Id };

/** Moves an encounter to the root, a campaign, or an area (taking on the area's campaign). */
export function moveEncounter(lib: Library, encounterId: Id, dest: EncounterDestination): Library {
  let campaignId: Id | null = null;
  let areaId: Id | null = null;
  if (dest.kind === 'campaign') campaignId = dest.campaignId;
  if (dest.kind === 'area') {
    const area = lib.areas.find((a) => a.id === dest.areaId);
    if (!area) return lib;
    campaignId = area.campaignId;
    areaId = area.id;
  }
  return {
    ...lib,
    encounters: lib.encounters.map((e) => (e.id === encounterId ? { ...e, campaignId, areaId } : e)),
  };
}

/** Drop target for an area: directly in a campaign, or inside another area. */
export type AreaDestination =
  | { kind: 'campaign'; campaignId: Id }
  | { kind: 'area'; areaId: Id };

/** True if the area can go to the destination (not into itself or anything nested in it). */
export function canMoveArea(lib: Library, areaId: Id, dest: AreaDestination): boolean {
  if (!lib.areas.some((a) => a.id === areaId)) return false;
  if (dest.kind === 'campaign') return lib.campaigns.some((c) => c.id === dest.campaignId);
  return lib.areas.some((a) => a.id === dest.areaId) && !subtreeOf(lib, areaId).has(dest.areaId);
}

/**
 * Moves an area into a campaign or another area. Everything nested in it
 * (areas and encounters) moves along and takes on the new campaign.
 */
export function moveArea(lib: Library, areaId: Id, dest: AreaDestination): Library {
  if (!canMoveArea(lib, areaId, dest)) return lib;
  const parent = dest.kind === 'area' ? lib.areas.find((a) => a.id === dest.areaId)! : null;
  const campaignId = dest.kind === 'campaign' ? dest.campaignId : parent!.campaignId;
  const subtree = subtreeOf(lib, areaId);
  return {
    ...lib,
    areas: lib.areas.map((a) => {
      if (a.id === areaId) return { ...a, campaignId, parentAreaId: parent?.id ?? null };
      return subtree.has(a.id) ? { ...a, campaignId } : a;
    }),
    encounters: lib.encounters.map((e) => (e.areaId && subtree.has(e.areaId) ? { ...e, campaignId } : e)),
  };
}

/** Deleting a campaign deletes everything inside it. */
export function deleteCampaign(lib: Library, campaignId: Id): Library {
  return {
    campaigns: lib.campaigns.filter((c) => c.id !== campaignId),
    areas: lib.areas.filter((a) => a.campaignId !== campaignId),
    encounters: lib.encounters.filter((e) => e.campaignId !== campaignId),
  };
}

/** Deleting an area deletes everything nested in it: areas and encounters. */
export function deleteArea(lib: Library, areaId: Id): Library {
  const subtree = subtreeOf(lib, areaId);
  return {
    ...lib,
    areas: lib.areas.filter((a) => !subtree.has(a.id)),
    encounters: lib.encounters.filter((e) => !(e.areaId && subtree.has(e.areaId))),
  };
}

/** Number of areas and encounters nested anywhere inside an area (for delete confirmations). */
export function areaContents(lib: Library, areaId: Id): { areas: number; encounters: number } {
  const subtree = subtreeOf(lib, areaId);
  return {
    areas: subtree.size - 1,
    encounters: lib.encounters.filter((e) => e.areaId && subtree.has(e.areaId)).length,
  };
}

/** Deletes one encounter. */
export function deleteEncounter(lib: Library, encounterId: Id): Library {
  return { ...lib, encounters: lib.encounters.filter((e) => e.id !== encounterId) };
}

/** Encounters that still reference a template; such templates can't be deleted. */
export function encountersUsingTemplate(lib: Library, templateId: Id): Encounter[] {
  return lib.encounters.filter((e) => e.combatants.some((c) => c.templateId === templateId));
}
