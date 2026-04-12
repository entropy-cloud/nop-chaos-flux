import { NopDebuggerPanel, createNopDebugger } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers';
import { HomePage, FluxBasicPage, FlowDesignerPage, ReportDesignerPage, DebuggerLabPage, ConditionBuilderPage, CodeEditorPage, WordEditorPage } from './pages';
import { ComponentLabPage } from './component-lab';
import { useRoute } from './useRoute';
import type { RouteSpec } from './route-model';

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

function renderPage(route: RouteSpec, navigate: (spec: RouteSpec) => void) {
  const goHome = () => navigate({ kind: 'home' });

  switch (route.kind) {
    case 'home':
      return (
        <HomePage
          onNavigate={(pageId) => {
            if (pageId === 'component-lab') {
              navigate({ kind: 'lab' });
            } else {
              navigate({ kind: 'domain', domainId: pageId });
            }
          }}
        />
      );
    case 'lab':
      return (
        <ComponentLabPage
          activeRendererId={null}
          onSelectRenderer={(id) => navigate({ kind: 'lab-renderer', rendererId: id })}
          onBack={goHome}
        />
      );
    case 'lab-renderer':
      return (
        <ComponentLabPage
          activeRendererId={route.rendererId}
          onSelectRenderer={(id) => navigate({ kind: 'lab-renderer', rendererId: id })}
          onBack={goHome}
        />
      );
    case 'domain':
      switch (route.domainId) {
        case 'flux-basic':
          return <FluxBasicPage debuggerController={debuggerController} onBack={goHome} />;
        case 'flow-designer':
          return <FlowDesignerPage onBack={goHome} />;
        case 'report-designer':
          return <ReportDesignerPage onBack={goHome} />;
        case 'debugger-lab':
          return <DebuggerLabPage debuggerController={debuggerController} onBack={goHome} />;
        case 'condition-builder':
          return <ConditionBuilderPage onBack={goHome} />;
        case 'code-editor':
          return <CodeEditorPage onBack={goHome} />;
        case 'word-editor':
          return <WordEditorPage onBack={goHome} />;
        default:
          return <HomePage onNavigate={() => navigate({ kind: 'home' })} />;
      }
  }
}

export function App() {
  const [route, navigate] = useRoute();

  return (
    <div className="nop-theme-root">
      {renderPage(route, navigate)}
      <NopDebuggerPanel controller={debuggerController} />
    </div>
  );
}
