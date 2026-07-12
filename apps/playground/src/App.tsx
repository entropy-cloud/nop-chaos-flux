import { lazy, Suspense } from 'react';
import { NopDebuggerPanel, createNopDebugger } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { HomePage } from './pages/home-page';
import { FluxBasicPage } from './pages/flux-basic-page';
import { ComponentLabPage } from './component-lab';
import { ComplexPagesShowcase } from './complex-pages';
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
import { TablePopOverDemoPage } from './pages/table-popover-demo';
import { MobileInfrastructureDemoPage } from './pages/mobile-infrastructure-demo';
import { MobileComponentsDemoPage } from './pages/mobile-components-demo';
import { W1bContentFeedbackDemoPage } from './pages/w1b-content-feedback-demo';
import { W1aContentDisplayDemoPage } from './pages/w1a-content-display-demo';
import { W2aDataCompositionDemoPage } from './pages/w2a-data-composition-demo';
import { W2bDateFamilyDemoPage } from './pages/w2b-date-family-demo';
import { W3aW3bLayoutActionFamilyDemoPage } from './pages/w3a-w3b-layout-action-family-demo';
import { W3cValueMappingDemoPage } from './pages/w3c-value-mapping-demo';
import { W3dAdvancedInputFamilyDemoPage } from './pages/w3d-advanced-input-family-demo';
import { W4aMultimediaDemoPage } from './pages/w4a-multimedia-demo';
import { W4bProcessDisplayFamilyDemoPage } from './pages/w4b-process-display-family-demo';
import { W4cCompositeFormFamilyDemoPage } from './pages/w4c-composite-form-family-demo';
import { M1ResponsiveDemoPage } from './pages/m1-responsive-demo';
import { M2TouchDemoPage } from './pages/m2-touch-demo';
import { M3LayoutDemoPage } from './pages/m3-layout-demo';
import { M4DataDisplayDemoPage } from './pages/m4-data-display-demo';
import { M5MobileShowcaseDemoPage } from './pages/m5-mobile-showcase-demo';
import { DataVerifyPage } from './pages/data-verify-page';
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
registerMobileRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

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
            } else if (pageId === 'complex-pages') {
              navigate({ kind: 'showcase' });
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
    case 'showcase':
      return (
        <ComplexPagesShowcase
          activePageId={null}
          onSelectPage={(id) => navigate({ kind: 'showcase-page', pageId: id })}
          onBack={goHome}
        />
      );
    case 'showcase-page':
      return (
        <ComplexPagesShowcase
          activePageId={route.pageId}
          onSelectPage={(id) => navigate({ kind: 'showcase-page', pageId: id })}
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
        case 'table-popover':
          return <TablePopOverDemoPage onBack={goHome} />;
        case 'mobile-infrastructure':
          return <MobileInfrastructureDemoPage onBack={goHome} />;
        case 'mobile-components':
          return <MobileComponentsDemoPage onBack={goHome} />;
        case 'w1b-content':
          return <W1bContentFeedbackDemoPage onBack={goHome} />;
        case 'w1a-content':
          return <W1aContentDisplayDemoPage onBack={goHome} />;
        case 'w2a-data-composition':
          return <W2aDataCompositionDemoPage onBack={goHome} />;
        case 'w2b-date-family':
          return <W2bDateFamilyDemoPage onBack={goHome} />;
        case 'w3a-w3b-layout-action-family':
          return <W3aW3bLayoutActionFamilyDemoPage onBack={goHome} />;
        case 'w3c-value-mapping':
          return <W3cValueMappingDemoPage onBack={goHome} />;
        case 'w3d-advanced-input-family':
          return <W3dAdvancedInputFamilyDemoPage onBack={goHome} />;
        case 'w4a-multimedia':
          return <W4aMultimediaDemoPage onBack={goHome} />;
        case 'w4b-process-display':
          return <W4bProcessDisplayFamilyDemoPage onBack={goHome} />;
        case 'w4c-composite-form-family':
          return <W4cCompositeFormFamilyDemoPage onBack={goHome} />;
        case 'm1-responsive':
          return <M1ResponsiveDemoPage onBack={goHome} />;
        case 'm2-touch':
          return <M2TouchDemoPage onBack={goHome} />;
        case 'm3-layout':
          return <M3LayoutDemoPage onBack={goHome} />;
        case 'm4-data':
          return <M4DataDisplayDemoPage onBack={goHome} />;
        case 'm5-showcase':
          return <M5MobileShowcaseDemoPage onBack={goHome} />;
        case 'data-verify':
          return <DataVerifyPage onBack={goHome} />;
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
