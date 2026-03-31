import { useState } from 'react';
import { NopDebuggerPanel, createNopDebugger } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { HomePage, FluxBasicPage, FlowDesignerPage, ReportDesignerPage, DebuggerLabPage, ConditionBuilderPage, CodeEditorPage, WordEditorPage } from './pages';
import type { PageId } from './pages';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerFlowDesignerRenderers(registry);

if (typeof window !== 'undefined' && typeof window.__NOP_DEBUGGER__ === 'undefined') {
  window.__NOP_DEBUGGER__ = {
    enabled: true,
    defaultOpen: false,
    defaultTab: 'timeline',
    position: { x: 24, y: 24 },
    dock: 'floating'
  };
}

const debuggerController = createNopDebugger({
  id: 'playground-main'
});

export function App() {
  const [activePage, setActivePage] = useState<PageId>('home');

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
  };

  const handleBackHome = () => {
    setActivePage('home');
  };

  return (
    <div className="nop-theme-root">
      {activePage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {activePage === 'flux-basic' && <FluxBasicPage debuggerController={debuggerController} onBack={handleBackHome} />}
      {activePage === 'flow-designer' && <FlowDesignerPage onBack={handleBackHome} />}
      {activePage === 'report-designer' && <ReportDesignerPage onBack={handleBackHome} />}
      {activePage === 'debugger-lab' && <DebuggerLabPage debuggerController={debuggerController} onBack={handleBackHome} />}
      {activePage === 'condition-builder' && <ConditionBuilderPage onBack={handleBackHome} />}
      {activePage === 'code-editor' && <CodeEditorPage onBack={handleBackHome} />}
      {activePage === 'word-editor' && <WordEditorPage onBack={handleBackHome} />}
      <NopDebuggerPanel controller={debuggerController} />
    </div>
  );
}

