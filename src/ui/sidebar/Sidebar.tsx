/**
 * @file The collapsible left panel: campaign tree, Unfiled section, and
 * drag-and-drop between them.
 */
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLibrary } from '../../state/libraryStore';
import { useUi } from '../../state/uiStore';
import { CampaignNode } from './CampaignNode';
import { handleDragEnd } from './dnd';
import { UnfiledSection } from './UnfiledSection';
import './sidebar.css';

/** Campaign tree with drag and drop, or a thin strip with an expand button when collapsed. */
export function Sidebar() {
  const campaigns = useLibrary((s) => s.campaigns);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  // Mouse drags start after 6px so clicks still work; touch drags need a 250ms hold so lists still scroll.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  if (collapsed) {
    return (
      <aside className="panel sidebar collapsed">
        <button className="icon" onClick={toggleSidebar} title="Show encounters">
          <PanelLeftOpen size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="panel sidebar">
      <div className="panel-header">
        <h3>Campaigns</h3>
        <span className="spacer" />
        <button className="icon" onClick={toggleSidebar} title="Hide encounters">
          <PanelLeftClose size={18} />
        </button>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="panel-body">
          {campaigns.length === 0 && <p className="empty-state">Use the + button above to create a campaign.</p>}
          {campaigns.map((c) => <CampaignNode key={c.id} campaign={c} />)}
        </div>
        <UnfiledSection />
      </DndContext>
    </aside>
  );
}
