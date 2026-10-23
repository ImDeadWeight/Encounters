/**
 * @file Root layout: top bar, the three panels (sidebar, initiative order,
 * combatant details), plus the dialog host and notices. On a phone the
 * panels take turns filling the screen (see phone.css).
 */
import { useUi } from '../state/uiStore';
import { CombatantPanel } from './combatant/CombatantPanel';
import { Notices } from './common/Notices';
import { EncounterView } from './encounter/EncounterView';
import { ModalHost } from './ModalHost';
import { Sidebar } from './sidebar/Sidebar';
import { TopBar } from './TopBar';
// After every component's styles, so touch mode and the phone layout can override them.
import '../styles/touch.css';
import '../styles/phone.css';

/** The whole app window. */
export function App() {
  const sidebarOpen = useUi((s) => !s.sidebarCollapsed);
  const detailsOpen = useUi((s) => s.detailsOpen);
  return (
    <div className="app">
      <TopBar />
      <div className={`workspace${sidebarOpen ? ' sidebar-open' : ''}${detailsOpen ? ' details-open' : ''}`}>
        <Sidebar />
        <EncounterView />
        <CombatantPanel />
      </div>
      <ModalHost />
      <Notices />
    </div>
  );
}
