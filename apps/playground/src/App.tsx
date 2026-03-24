import { useState } from 'react';
import { AmisDebuggerPanel, createAmisDebugger } from '@nop-chaos/amis-debugger';
import { createDefaultRegistry } from '@nop-chaos/amis-react';
import { registerBasicRenderers } from '@nop-chaos/amis-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/amis-renderers-form';
import { registerDataRenderers } from '@nop-chaos/amis-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { HomePage, AmisBasicPage, FlowDesignerPage, DebuggerLabPage } from './pages';
import type { PageId } from './pages';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerFlowDesignerRenderers(registry);

if (typeof window !== 'undefined' && typeof window.__NOP_AMIS_DEBUGGER__ === 'undefined') {
  window.__NOP_AMIS_DEBUGGER__ = {
    enabled: true,
    defaultOpen: false,
    defaultTab: 'timeline',
    position: { x: 24, y: 24 },
    dock: 'floating'
  };
}

const debuggerController = createAmisDebugger({
  id: 'playground-main'
});

export function App() {
  const [activePage, setActivePage] = useState<PageId>('home');

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
  };

  return (
    <>
      {activePage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {activePage === 'amis-basic' && <AmisBasicPage debuggerController={debuggerController} />}
      {activePage === 'flow-designer' && <FlowDesignerPage />}
      {activePage === 'debugger-lab' && <DebuggerLabPage debuggerController={debuggerController} />}
      <AmisDebuggerPanel controller={debuggerController} />
    </>
  );
}
