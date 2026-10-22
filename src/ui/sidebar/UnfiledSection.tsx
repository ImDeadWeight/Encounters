/**
 * @file The Unfiled section pinned to the bottom of the sidebar: encounters
 * that belong to no campaign. Closed by default and always a drop target.
 */
import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { unfiledEncounters } from '../../domain/library/tree';
import { useLibrary } from '../../state/libraryStore';
import { useUi } from '../../state/uiStore';
import { ROOT_DROP_ID, UNFILED_NODE_ID } from './dnd';
import { EncounterNode } from './EncounterNode';

/**
 * Small collapsible footer of the sidebar for encounters outside any campaign.
 * Collapsed by default; the header stays a drop target either way.
 */
export function UnfiledSection() {
  const encounters = useLibrary(useShallow(unfiledEncounters));
  // collapsedNodes stores "toggled from default"; this section defaults to closed.
  const open = useUi((s) => !!s.collapsedNodes[UNFILED_NODE_ID]);
  const toggle = useUi((s) => s.toggleNode);
  const { setNodeRef, isOver, active } = useDroppable({ id: ROOT_DROP_ID, data: { type: 'root', id: 'root' } });
  const showTarget = isOver && active?.data.current?.type === 'encounter';

  return (
    <div ref={setNodeRef} className={`unfiled${showTarget ? ' drop-target' : ''}`}>
      <button className="unfiled-header" onClick={() => toggle(UNFILED_NODE_ID)} title={open ? 'Collapse' : 'Expand'}>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Unfiled encounters ({encounters.length})
      </button>
      {open && (
        <div className="unfiled-list">
          {encounters.length === 0 && <p className="muted unfiled-empty">Drag an encounter here to unfile it.</p>}
          {encounters.map((e) => <EncounterNode key={e.id} encounter={e} depth={0} />)}
        </div>
      )}
    </div>
  );
}
