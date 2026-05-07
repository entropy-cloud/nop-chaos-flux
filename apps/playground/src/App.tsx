import { lazy, Suspense } from 'react';
import { NopDebuggerPanel, createNopDebugger } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { HomePage } from './pages/home-page';
import { FluxBasicPage } from './pages/flux-basic-page';
import { ComponentLabPage } from './component-lab';
import { CodeEditorPage } from './pages/code-editor-page';
import { useRoute } from './use-route';
import type { RouteSpec } from './route-model';
import { Spinner } from '@nop-chaos/ui';

const LazyReportDesignerPage = lazy(() =>
  import('./pages/report-designer-page').then((m) => ({ default: m.ReportDesignerPage })),
);
const LazyDebuggerLabPage = lazy(() =>
  import('./pages/debugger-lab-page').then((m) => ({ default: m.DebuggerLabPage })),
);
const LazyConditionBuilderPage = lazy(() =>
  import('./pages/condition-builder-page').then((m) => ({ default: m.ConditionBuilderPage })),
);
const LazyWordEditorPage = lazy(() =>
  import('./pages/word-editor-page').then((m) => ({ default: m.WordEditorPage })),
);
const LazyPerformanceTablePage = lazy(() =>
  import('./pages/performance-table-page').then((m) => ({ default: m.PerformanceTablePage })),
);

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

let flowDesignerRegistered = false;
async function ensureFlowDesignerRegistered() {
  if (flowDesignerRegistered) return;
  const { registerFlowDesignerRenderers } = await import('@nop-chaos/flow-designer-renderers');
  registerFlowDesignerRenderers(registry);
  flowDesignerRegistered = true;
}

const LazyFlowDesignerPageWithRegistration = lazy(async () => {
  await ensureFlowDesignerRegistered();
  const { FlowDesignerPage } = await import('./pages/flow-designer-page');
  return { default: FlowDesignerPage };
});

const LazyDingTalkFlowDemoWithRegistration = lazy(async () => {
  await ensureFlowDesignerRegistered();
  const { DingTalkFlowDemo } = await import('./pages/ding-talk-flow-demo');
  return { default: DingTalkFlowDemo };
});

if (typeof window !== 'undefined' && typeof window.__NOP_DEBUGGER__ === 'undefined') {
  window.__NOP_DEBUGGER__ = {
    enabled: true,
    defaultOpen: false,
    defaultTab: 'timeline',
    position: { x: 24, y: 24 },
    dock: 'floating',
  };
}

const debuggerController = createNopDebugger({
  id: 'playground-main',
  capturePerformance: false,
});

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner />
    </div>
  );
}

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
          return <LazyFlowDesignerPageWithRegistration debuggerController={debuggerController} onBack={goHome} />;
        case 'dingtalk-flow-demo':
          return <LazyDingTalkFlowDemoWithRegistration onBack={goHome} />;
        case 'report-designer':
          return <LazyReportDesignerPage onBack={goHome} />;
        case 'debugger-lab':
          return <LazyDebuggerLabPage debuggerController={debuggerController} onBack={goHome} />;
        case 'condition-builder':
          return <LazyConditionBuilderPage onBack={goHome} />;
        case 'code-editor':
          return <CodeEditorPage onBack={goHome} />;
        case 'word-editor':
          return <LazyWordEditorPage onBack={goHome} />;
        case 'performance-table':
          return <LazyPerformanceTablePage onBack={goHome} />;
        default:
          return <HomePage onNavigate={() => navigate({ kind: 'home' })} />;
      }
  }
}

export function App() {
  const [route, navigate] = useRoute();

  return (
    <div className="nop-theme-root">
      <Suspense fallback={<PageFallback />}>{renderPage(route, navigate)}</Suspense>
      <NopDebuggerPanel controller={debuggerController} />
    </div>
  );
}
