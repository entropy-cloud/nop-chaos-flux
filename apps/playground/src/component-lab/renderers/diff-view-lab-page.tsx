import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  c6c5CrossFileSchema,
  c6c5DialogSchema,
  c6c5EmptySchema,
  c6c5ExpandSchema,
  c6c5ReactionSchema,
  registerC6c5Probe,
} from './data-c6c5-host';

export function DiffViewLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Diff View renderer: split/unified/three-column text diff comparison with hunk folding, cross-file navigation, syntax highlighting, inline diff markers, component handles (toggleViewType/setViewType/expandAll/collapseAll) and CX-9 reaction wiring."
      scenarios={[
        {
          title: 'Host diff in dialog + line click (C6.5 bug 73 pattern)',
          description:
            'C6.5 Phase 3 host-diff-dialog: diff-view inside an openDialog surface; clicking an add line in the new pane dispatches onLineClick and the action args resolve ${lineNumber}|${side}|${type} from the event payload.',
          schema: c6c5DialogSchema,
          data: {},
          onActionScopeChange: registerC6c5Probe,
        },
        {
          title: 'Host cross-file nav + out-of-range clamp (C6.5)',
          description:
            'C6.5 Phase 3 host-diff-crosfile: file-list navigation drives content switching; activeFileIndex 99 clamps to the last file and -5 clamps to the first.',
          schema: c6c5CrossFileSchema,
          data: {},
          onActionScopeChange: registerC6c5Probe,
        },
        {
          title: 'Host diff reaction wiring + component handles (C6.5)',
          description:
            'C6.5 Phase 3 host-diff-reaction: schema-declared toggleViewType reaction (dependsOn: [toggle]) fires on scope change and flips data-view; setViewType reaction (dependsOn: [viewMode]) drives explicit view types.',
          schema: c6c5ReactionSchema,
          data: {},
          onActionScopeChange: registerC6c5Probe,
        },
        {
          title: 'Host diff expandAll/collapseAll (C6.5)',
          description:
            'C6.5 Phase 3 host-diff-expand: component:expandAll/collapseAll handles drive the data-expanded state of folded hunks.',
          schema: c6c5ExpandSchema,
          data: {},
          onActionScopeChange: registerC6c5Probe,
        },
        {
          title: 'Host diff empty state (C6.5)',
          description:
            'C6.5 Phase 3 host-diff-empty: identical old/new content renders the noChanges empty state without crashing.',
          schema: c6c5EmptySchema,
          data: {},
          onActionScopeChange: registerC6c5Probe,
        },
      ]}
    />
  );
}
