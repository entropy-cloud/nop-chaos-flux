import type { NopDebuggerController } from '@nop-chaos/nop-debugger';

export type PageId =
  | 'home'
  | 'flux-basic'
  | 'flow-designer'
  | 'dingtalk-flow-demo'
  | 'report-designer'
  | 'debugger-lab'
  | 'condition-builder'
  | 'code-editor'
  | 'word-editor'
  | 'performance-table';

export interface PageRouterProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  debuggerController: NopDebuggerController;
}
