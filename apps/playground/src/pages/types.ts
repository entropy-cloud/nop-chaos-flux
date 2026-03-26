import type { NopDebuggerController } from '@nop-chaos/nop-debugger';

export type PageId = 'home' | 'flux-basic' | 'flow-designer' | 'report-designer' | 'debugger-lab';

export interface PageRouterProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  debuggerController: NopDebuggerController;
}
