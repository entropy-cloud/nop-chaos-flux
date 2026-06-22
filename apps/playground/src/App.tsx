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
import { FlowDesignerPage } from './pages/flow-designer-page';
import { TaskFlowDesignerPage } from './pages/taskflow-designer-page';
import { DingTalkFlowDemo } from './pages/ding-talk-flow-demo';
import { PerformanceTablePage } from './pages/performance-table-page';
import { ComponentHandlesDemoPage } from './pages/component-handles-demo';
import { EventPreventionDemoPage } from './pages/event-prevention-demo';
import { BooleanControlValueContractDemoPage } from './pages/boolean-control-value-contract-demo';
import { TextIconVisualFieldsDemoPage } from './pages/text-icon-visual-fields-demo';
import { LayoutFamilyEnhancementsDemoPage } from './pages/layout-family-enhancements-demo';
import { FormInputEnhancementsDemoPage } from './pages/form-input-enhancements-demo';
import { InputSuggestDemoPage } from './pages/input-suggest-demo';
import { TreeDisplayUxDemoPage } from './pages/tree-display-ux-demo';
import { useRoute } from './use-route';
import type { RouteSpec } from './route-model';
import { readDiagnosticsEnabled } from './route-model';
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
const LazyConditionBuilderFormulaPage = lazy(() =>
  import('./pages/condition-builder-formula-page').then((m) => ({ default: m.ConditionBuilderFormulaPage })),
);
const LazyWordEditorPage = lazy(() =>
  import('./pages/word-editor-page').then((m) => ({ default: m.WordEditorPage })),
);
const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

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
  exposeAutomationApi: true,
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
  const diagnosticsEnabled =
    typeof window !== 'undefined' ? readDiagnosticsEnabled(window.location.search) : false;

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
          return <FlowDesignerPage debuggerController={debuggerController} onBack={goHome} />;
        case 'taskflow-designer':
          return <TaskFlowDesignerPage debuggerController={debuggerController} onBack={goHome} />;
        case 'dingtalk-flow-demo':
          return <DingTalkFlowDemo onBack={goHome} />;
        case 'report-designer':
          return <LazyReportDesignerPage onBack={goHome} />;
        case 'debugger-lab':
          return <LazyDebuggerLabPage debuggerController={debuggerController} onBack={goHome} />;
        case 'condition-builder':
          return <LazyConditionBuilderPage onBack={goHome} />;
        case 'condition-builder-formula':
          return <LazyConditionBuilderFormulaPage onBack={goHome} />;
        case 'code-editor':
          return <CodeEditorPage onBack={goHome} />;
        case 'word-editor':
          return <LazyWordEditorPage onBack={goHome} />;
        case 'performance-table':
          return (
            <PerformanceTablePage
              debuggerController={debuggerController}
              diagnosticsEnabled={diagnosticsEnabled}
              onBack={goHome}
            />
          );
        case 'component-handles':
          return <ComponentHandlesDemoPage onBack={goHome} />;
        case 'event-prevention':
          return <EventPreventionDemoPage onBack={goHome} />;
        case 'boolean-control-value-contract':
          return <BooleanControlValueContractDemoPage onBack={goHome} />;
        case 'text-icon-visual-fields':
          return <TextIconVisualFieldsDemoPage onBack={goHome} />;
        case 'layout-family-enhancements':
          return <LayoutFamilyEnhancementsDemoPage onBack={goHome} />;
        case 'form-input-enhancements':
          return <FormInputEnhancementsDemoPage onBack={goHome} />;
        case 'input-suggest':
          return <InputSuggestDemoPage onBack={goHome} />;
        case 'tree-display-ux':
          return <TreeDisplayUxDemoPage onBack={goHome} />;
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
