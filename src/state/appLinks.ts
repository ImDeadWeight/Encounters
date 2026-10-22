/**
 * @file Links between the apps: opening a Lorekeeper page (lorekeeper://…)
 * and handling encounters://… links, whether they started the app or arrived
 * while it was open.
 */
import { getCurrent, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { openUrl } from '@tauri-apps/plugin-opener';
import { linkUrl, parseLinkUrl } from 'campaign-link';
import type { LoreRef } from '../domain/characters';
import { isTauri } from '../platform';
import { useCharacters } from './characterStore';
import { useLibrary } from './libraryStore';
import { useUi } from './uiStore';

/** Opens a page in Lorekeeper (starting it if needed). */
export async function openInLorekeeper(lore: LoreRef): Promise<void> {
  const notify = useUi.getState().notify;
  if (!isTauri()) {
    notify('error', 'Opening Lorekeeper needs the desktop app.');
    return;
  }
  try {
    await openUrl(linkUrl({ app: 'lorekeeper', kind: 'page', notebookId: lore.notebookId, pageId: lore.pageId }));
  } catch (err) {
    notify('error', `Could not open Lorekeeper. Is it installed and opened at least once? (${(err as Error).message ?? err})`);
  }
}

/** Shows what an encounters:// link points at. */
function handle(url: string) {
  const ui = useUi.getState();
  const target = parseLinkUrl(url);
  if (target?.app !== 'encounters') {
    ui.notify('error', `Encounters can't open this link: ${url}`);
    return;
  }
  if (target.kind === 'encounter') {
    if (useLibrary.getState().encounters.some((e) => e.id === target.encounterId)) ui.selectEncounter(target.encounterId);
    else ui.notify('error', 'That encounter no longer exists.');
  } else if (target.kind === 'character') {
    if (useCharacters.getState().templates.some((t) => t.id === target.characterId)) {
      ui.openModal({ type: 'editCharacter', templateId: target.characterId });
    } else ui.notify('error', 'That character no longer exists.');
  }
}

/** Handles the link that started the app, if any, and every link opened while it runs. */
export async function startAppLinks(): Promise<void> {
  if (!isTauri()) return;
  try {
    (await getCurrent())?.forEach(handle);
    await onOpenUrl((urls) => urls.forEach(handle));
  } catch (err) {
    useUi.getState().notify('error', `Links from Lorekeeper won't open here: ${(err as Error).message ?? err}`);
  }
}
