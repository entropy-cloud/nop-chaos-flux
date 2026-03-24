import type { AmisDebuggerController } from '@nop-chaos/amis-debugger';

export type PageId = 'home' | 'amis-basic' | 'flow-designer' | 'debugger-lab';

export interface PageRouterProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  debuggerController: AmisDebuggerController;
}
