/**
 * @file The campaign editor's Lorekeeper field: which Lorekeeper notebook the
 * campaign is linked to (chosen from the notebooks Lorekeeper shares on this
 * device), and whether the link is confirmed.
 */
import type { Id } from '../../domain/ids';
import { useCampaignLink } from '../../state/campaignLink';

/** Notebook picker plus the link's status. `value` is the chosen notebook (applied when the dialog saves). */
export function LorekeeperNotebookField({ campaignId, value, onChange }: { campaignId: Id; value: Id | null; onChange(v: Id | null): void }) {
  const problem = useCampaignLink((s) => (s.location ? null : s.problem));
  const partner = useCampaignLink((s) => s.partner);
  const partnerProblem = useCampaignLink((s) => s.partnerProblem);
  const claim = useCampaignLink((s) => s.claims[campaignId] ?? null);
  const status = useCampaignLink((s) => s.status[campaignId]);

  if (problem) {
    return (
      <div className="field">
        Lorekeeper notebook
        <span className="muted">{problem}</span>
      </div>
    );
  }

  const notebooks = [...(partner?.campaigns ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  // The saved link's notebook stays listed even if Lorekeeper's list hasn't caught up.
  const knownSaved = !claim || notebooks.some((n) => n.id === claim.partnerId);
  const unchanged = (claim?.partnerId ?? null) === value;

  return (
    <label className="field">
      Lorekeeper notebook
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Not linked</option>
        {!knownSaved && claim && <option value={claim.partnerId}>(notebook not found)</option>}
        {notebooks.map((n) => {
          const elsewhere = n.link && n.link.partnerId !== campaignId;
          return (
            <option key={n.id} value={n.id} disabled={!!elsewhere}>
              {n.name}
              {elsewhere ? ' (linked to another campaign)' : ''}
            </option>
          );
        })}
      </select>
      <span className="muted">
        {partnerProblem
          ? `Lorekeeper's notebook list couldn't be read: ${partnerProblem}`
          : !partner
            ? "Lorekeeper hasn't shared its notebooks on this device yet. Open Lorekeeper once, then come back."
            : !unchanged
              ? 'Saved when you press Save.'
              : status === 'linked'
                ? 'Linked: Lorekeeper sees this campaign.'
                : claim
                  ? 'Waiting for Lorekeeper to confirm.'
                  : "Link a notebook to suggest its characters and places here, and show this campaign's encounters there."}
      </span>
    </label>
  );
}
