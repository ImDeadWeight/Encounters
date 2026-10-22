/**
 * @file Encounters' side of Campaign Link: publishes the list of campaigns
 * to the shared folder (encounters.json) so Lorekeeper can offer to link its
 * notebooks to them. Rewrites the file only when the list actually changed.
 */
import { fileText, indexPath, makeIndex, readIndex, sameData, type AppIndex } from 'campaign-link';
import { create } from 'zustand';
import { openLinkFolder, type LinkFolder } from '../storage/linkFolder';
import { useLibrary } from './libraryStore';

/** Whether Campaign Link works on this device, for showing in the UI. */
interface LinkState {
  /** Full path of the shared folder, when available. */
  location: string | null;
  /** Why linking is unavailable, or the last error publishing; null when all is well. */
  problem: string | null;
}

export const useCampaignLink = create<LinkState>(() => ({ location: null, problem: null }));

/** The index as last written (or found on disk), to skip rewriting an unchanged one. */
let published: AppIndex | null = null;

/** Encounters' index: every campaign, not yet linked to anything. */
function currentIndex(): AppIndex {
  const campaigns = useLibrary.getState().campaigns;
  return makeIndex(
    'encounters',
    campaigns.map((c) => ({ id: c.id, name: c.name, link: null })),
  );
}

/** Writes the index if it differs from what's published. */
async function publish(folder: LinkFolder) {
  const index = currentIndex();
  if (sameData(index, published)) return;
  await folder.write(indexPath('encounters'), fileText(index));
  published = index;
}

/** Opens the shared folder and keeps encounters.json up to date. Never throws: problems show in useCampaignLink. */
export async function startCampaignLink(): Promise<void> {
  const access = await openLinkFolder();
  if (!access.available) {
    useCampaignLink.setState({ problem: access.reason });
    return;
  }
  const { folder } = access;
  useCampaignLink.setState({ location: folder.location });

  const report = (err: unknown) => useCampaignLink.setState({ problem: `Could not update the Campaign Link folder: ${(err as Error).message}` });
  // One publish at a time, so two quick changes can't write the same file at once.
  let queue = Promise.resolve();
  const run = () =>
    (queue = queue
      .then(() => publish(folder))
      .then(() => useCampaignLink.setState({ problem: null }))
      .catch(report));

  try {
    const existing = await folder.read(indexPath('encounters'));
    published = existing ? readIndex(existing, 'encounters') : null;
  } catch {
    // A damaged or outdated file of our own is simply replaced.
    published = null;
  }
  await run();
  useLibrary.subscribe((s, before) => {
    if (s.campaigns !== before.campaigns) run();
  });
}
