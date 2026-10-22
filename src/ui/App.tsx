/**
 * @file Root layout: top bar, the three panels (sidebar, initiative order,
 * combatant details), plus the dialog host and notices.
 */
import { CombatantPanel } from './combatant/CombatantPanel';
import { Notices } from './common/Notices';
import { EncounterView } from './encounter/EncounterView';
import { ModalHost } from './ModalHost';
import { Sidebar } from './sidebar/Sidebar';
import { TopBar } from './TopBar';

/** The whole app window. */
export function App() {
  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <Sidebar />
        <EncounterView />
        <CombatantPanel />
      </div>
      <ModalHost />
      <Notices />
    </div>
  );
}
