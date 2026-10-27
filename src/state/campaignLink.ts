/**
 * @file Encounters' side of Campaign Link: links campaigns to Lorekeeper
 * notebooks and keeps the shared folder up to date (see the campaign-link
 * package). Publishes the campaign list and, for each linked campaign, its
 * areas, encounters (combat state, who's in them) and characters; reads
 * Lorekeeper's notebook list and the catalogue of each linked notebook.
 *
 * Link claims are per device (the folder is), so they live in their own
 * campaign-link.json, not in campaigns (which would carry them into exports).
 */
import {
  createLinkSync,
  makeEncountersCatalog,
  readLorekeeperCatalog,
  sameData,
  type AppIndex,
  type EncountersCatalog,
  type LinkClaim,
  type LinkResolution,
  type LinkSync,
  type LorekeeperCatalog,
} from 'campaign-link';
import { create } from 'zustand';
import { newId, type Id } from '../domain/ids';
import { loadDocument, saveDocument } from '../storage/documents';
import { isMobile } from '../platform';
import { chooseLinkFolder, openLinkFolder, type LinkFolder, type LinkFolderAccess } from '../storage/linkFolder';
import { useCharacters } from './characterStore';
import { useLibrary } from './libraryStore';

/** How often to look at the other app's files while the window is visible. */
const POLL_MS = 3000;
/** Wait this long after a local change before publishing it. */
const CHANGE_DELAY_MS = 800;
/** This app's saved link claims. */
const CLAIMS_DOC = 'campaign-link';

/** Campaign Link state, for the UI. */
interface LinkState {
  /** Where the shared folder is (full path; on Android its name), when available. */
  location: string | null;
  /** Why linking can't work here, or the last error; null when all is well. */
  problem: string | null;
  /** Android: the user picks the shared folder (offer Choose folder… / Change). */
  canChooseFolder: boolean;
  /** Each campaign's link to a Lorekeeper notebook, by campaign id. */
  claims: Record<Id, LinkClaim>;
  /** Each campaign's link status, by campaign id (absent until the first sync). */
  status: Record<Id, LinkResolution['status']>;
  /** Lorekeeper's notebook list; null until Lorekeeper has run on this device. */
  partner: AppIndex | null;
  /** Why Lorekeeper's list couldn't be read, if it couldn't. */
  partnerProblem: string | null;
  /** The linked notebook's catalogue, by campaign id. */
  catalogs: Record<Id, LorekeeperCatalog>;
}

export const useCampaignLink = create<LinkState>(() => ({
  location: null,
  problem: null,
  canChooseFolder: false,
  claims: {},
  status: {},
  partner: null,
  partnerProblem: null,
  catalogs: {},
}));

/** Runs a sync pass soon (set once the folder is open). */
let requestSync: (delay?: number) => void = () => undefined;

/** Links a campaign to a Lorekeeper notebook, or unlinks it (null). Lorekeeper confirms on its next look. */
export function linkCampaign(campaignId: Id, notebookId: Id | null) {
  const current = useCampaignLink.getState().claims[campaignId];
  if ((current?.partnerId ?? null) === notebookId) return;
  setClaim(campaignId, notebookId ? { linkId: newId(), partnerId: notebookId, confirmed: false } : null);
  requestSync(0);
}

function setClaim(campaignId: Id, claim: LinkClaim | null) {
  useCampaignLink.setState((s) => {
    const { [campaignId]: _old, ...rest } = s.claims;
    return { claims: claim ? { ...rest, [campaignId]: claim } : rest };
  });
}

/**
 * What Lorekeeper needs to know about a campaign: its areas, encounters, the
 * characters in them, and characters made from the linked notebook's pages
 * (with their stat blocks, so the page can take one).
 */
function buildCatalog(campaignId: Id): EncountersCatalog | null {
  const { campaigns, areas, encounters } = useLibrary.getState();
  const campaign = campaigns.find((c) => c.id === campaignId);
  if (!campaign) return null;
  const mine = encounters.filter((e) => e.campaignId === campaignId);
  const used = new Set(mine.flatMap((e) => e.combatants.map((c) => c.templateId)));
  // Only pages of the linked notebook mean anything to it.
  const notebookId = useCampaignLink.getState().claims[campaignId]?.partnerId;
  return makeEncountersCatalog(campaignId, campaign.name, {
    ...(campaign.formatId ? { formatId: campaign.formatId } : {}),
    areas: areas
      .filter((a) => a.campaignId === campaignId)
      .map((a) => ({ id: a.id, name: a.name, parentAreaId: a.parentAreaId })),
    encounters: mine.map((e) => ({
      id: e.id,
      name: e.name,
      areaId: e.areaId,
      inCombat: e.combat.active,
      round: e.combat.active ? e.combat.round : 0,
      combatants: e.combatants.map((c) => ({ characterId: c.templateId, name: c.name, status: c.status })),
    })),
    characters: useCharacters
      .getState()
      .templates.filter((t) => used.has(t.id) || (notebookId && t.lore?.notebookId === notebookId))
      .map((t) => {
        const lorePageId = t.lore && t.lore.notebookId === notebookId ? t.lore.pageId : null;
        return {
          id: t.id,
          name: t.name,
          kind: t.kind,
          lorePageId,
          ...(lorePageId && t.statBlock ? { statBlock: { formatId: t.formatId, statBlock: t.statBlock } } : {}),
        };
      }),
  });
}

/** Starts linking. Never throws: problems show in useCampaignLink. */
export async function startCampaignLink(): Promise<void> {
  const saved = await loadDocument<{ claims: Record<Id, LinkClaim> }>(CLAIMS_DOC, () => ({ claims: {} }));
  useCampaignLink.setState({ claims: saved.data.claims, problem: saved.warning ?? null });
  useCampaignLink.subscribe((s, before) => {
    if (s.claims !== before.claims) saveDocument(CLAIMS_DOC, { claims: s.claims }).catch(() => undefined);
  });

  await connect();
}

/** The sync loop over the open folder; replaced when another folder is chosen (Android). */
let sync: LinkSync | null = null;

/** Opens the shared folder and syncs with it; the first time, also starts watching for changes. */
async function connect() {
  let access: LinkFolderAccess;
  try {
    access = await openLinkFolder();
  } catch (err) {
    useCampaignLink.setState({ problem: `The shared folder couldn't be opened: ${(err as Error).message ?? err}` });
    return;
  }
  if (!access.available) {
    useCampaignLink.setState({ location: null, problem: access.reason, canChooseFolder: access.canChoose });
    return;
  }
  const first = sync === null;
  sync = syncOver(access.folder);
  useCampaignLink.setState({ location: access.folder.location, problem: null, canChooseFolder: isMobile() });
  if (first) await startWatching();
  else requestSync(0);
}

/** Android: lets the user pick (or change) the shared folder, then syncs with it. */
export async function chooseFolder(): Promise<void> {
  try {
    if (await chooseLinkFolder()) await connect();
  } catch (err) {
    useCampaignLink.setState({ problem: `Couldn't use that folder: ${(err as Error).message ?? err}` });
  }
}

/** A sync loop over one folder. */
function syncOver(folder: LinkFolder): LinkSync {
  return createLinkSync(folder, {
    app: 'encounters',
    campaigns: () => {
      const { claims } = useCampaignLink.getState();
      return useLibrary.getState().campaigns.map((c) => ({ id: c.id, name: c.name, link: claims[c.id] ?? null }));
    },
    setClaim,
    catalog: async (campaignId) => buildCatalog(campaignId),
  });
}

/** Syncs now, after local changes, when the app comes back to the front, and every few seconds while it's visible. */
async function startWatching() {
  /** One pass, then read the catalogue of every linked notebook. */
  async function pass() {
    if (!sync) return;
    const result = await sync.refresh();
    const catalogs: Record<Id, LorekeeperCatalog> = {};
    for (const [campaignId, claim] of Object.entries(useCampaignLink.getState().claims)) {
      if (result.status[campaignId] !== 'linked') continue;
      const text = await sync.readPartnerCatalog(claim.linkId).catch(() => null);
      if (!text) continue;
      try {
        // Keep the same object while nothing changed, so suggestions don't recompute on every look.
        const fresh = readLorekeeperCatalog(text);
        const previous = useCampaignLink.getState().catalogs[campaignId];
        catalogs[campaignId] = previous && sameData(previous, fresh) ? previous : fresh;
      } catch {
        // A damaged catalogue is skipped; the previous one stays until a good one arrives.
        const previous = useCampaignLink.getState().catalogs[campaignId];
        if (previous) catalogs[campaignId] = previous;
      }
    }
    useCampaignLink.setState({ ...result, catalogs, problem: null });
  }

  // One pass at a time; requests during a pass run once it finishes.
  let running = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      await pass();
    } catch (err) {
      useCampaignLink.setState({ problem: `Could not update the Campaign Link folder: ${(err as Error).message}` });
    } finally {
      running = false;
      if (again) {
        again = false;
        run();
      }
    }
  };
  requestSync = (delay = CHANGE_DELAY_MS) => {
    clearTimeout(timer);
    timer = setTimeout(run, delay);
  };

  await run();
  // Local changes Lorekeeper should see: campaigns, areas, encounters, combat state, characters.
  useLibrary.subscribe(() => requestSync());
  useCharacters.subscribe((s, before) => {
    if (s.templates !== before.templates) requestSync();
  });
  // Changes Lorekeeper made: look when the window (or, on Android, the app) comes back, and every few seconds while visible.
  window.addEventListener('focus', () => requestSync(0));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestSync(0);
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') run();
  }, POLL_MS);
}
