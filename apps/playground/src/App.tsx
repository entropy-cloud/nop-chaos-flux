import { Component, lazy, Suspense, type ReactNode } from 'react';
import { NopDebuggerPanel, createNopDebugger } from '@nop-chaos/nop-debugger';
import { createDefaultRegistry } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';
import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';
import { registerGraphRenderers } from '@nop-chaos/flux-renderers-graph';
import { registerMapRenderers } from '@nop-chaos/flux-renderers-map';
import { registerPivotRenderers } from '@nop-chaos/flux-renderers-pivot';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
// Editor registration via `/editor` subpath (NOT main entry) — preserves bundle isolation:
// `@leafer-in/editor` stays out of the runtime `scada-canvas` bundle (design-architecture.md §4.4.1).
import { registerScadaEditorRenderers } from '@nop-chaos/flux-renderers-industrial/editor';
import { HomePage } from './pages/home-page';
import { ThemeSwitcher } from './theme-switcher';
import { Toaster } from '@nop-chaos/ui';
import { FluxBasicPage } from './pages/flux-basic-page';
import { ComponentLabPage } from './component-lab';
import { ComplexPagesShowcase } from './complex-pages';
import { CodeEditorPage } from './pages/code-editor-page';
import { FlowDesignerPage } from './pages/flow-designer-page';
import { TaskFlowDesignerPage } from './pages/taskflow-designer-page';
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
import { TableColumnWidthDemoPage } from './pages/table-column-width-demo';
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
import { useRoute } from './use-route';
import type { RouteSpec } from './route-model';
import { readDiagnosticsEnabled } from './route-model';
import { Spinner } from '@nop-chaos/ui';

const LazyReportDesignerPage = lazy(() =>
  import('./pages/report-designer-page').then((m) => ({ default: m.ReportDesignerPage })),
);
const LazyReportDesignerHostPage = lazy(() =>
  import('./pages/report-designer-host-page').then((m) => ({ default: m.ReportDesignerHostPage })),
);
const LazySpreadsheetPage = lazy(() =>
  import('./pages/spreadsheet-page').then((m) => ({ default: m.SpreadsheetPage })),
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
// Lazy-loaded: page-designer chunk pulls in the designer two-package stack plus a
// self-held renderer registry — only loaded on #/page-designer (S1 §11.1 keeps the
// main playground bundle free of designer code).
const LazyPageDesignerPage = lazy(() =>
  import('./pages/page-designer-demo').then((m) => ({ default: m.PageDesignerDemoPage })),
);
// Lazy-loaded: pulls in Tiptap/ProseMirror (~100KB) — only loaded when the
// user navigates to #/ai-rich-text. Keeps the main bundle Tiptap-free (mirrors
// the `./rich-text` opt-in subpath isolation at the app level).
const LazyAiRichTextDemoPage = lazy(() =>
  import('./pages/ai-rich-text-demo').then((m) => ({ default: m.AiRichTextDemoPage })),
);
// Lazy-loaded: pulls in leafer-ui canvas runtime (~heavy, requires browser CanvasRenderingContext2D) —
// only loaded when the user navigates to #/leafer-examples. Keeps the main bundle + App unit tests
// leafer-ui-free (mirrors report-designer / debugger-lab lazy isolation).
const LazyLeaferExamplesDemoPage = lazy(() =>
  import('./pages/leafer-examples-demo').then((m) => ({ default: m.LeaferExamplesDemoPage })),
);
// Lazy-loaded: pulls in three.js WebGL runtime (~heavy, requires browser WebGLRenderingContext) —
// only loaded when the user navigates to #/three-canvas-demo. Keeps the main bundle + App unit tests
// three-free (mirrors report-designer / debugger-lab / leafer-examples lazy isolation).
const LazyThreeCanvasDemoPage = lazy(() =>
  import('./pages/three-canvas-demo').then((m) => ({ default: m.ThreeCanvasDemoPage })),
);
const LazyScadaDemoPage = lazy(() =>
  import('./pages/scada-demo').then((m) => ({ default: m.ScadaDemoPage })),
);
const LazyScadaPressureDemoPage = lazy(() =>
  import('./pages/scada-pressure-demo').then((m) => ({ default: m.ScadaPressureDemoPage })),
);
const LazyScadaPerfScaleDemoPage = lazy(() =>
  import('./pages/scada-perf-scale-demo').then((m) => ({ default: m.ScadaPerfScaleDemoPage })),
);
const LazyScadaEdgeDemoPage = lazy(() =>
  import('./pages/scada-edge-demo').then((m) => ({ default: m.ScadaEdgeDemoPage })),
);
const LazyScadaEditorDemoPage = lazy(() =>
  import('./pages/scada-editor-demo').then((m) => ({ default: m.ScadaEditorDemoPage })),
);
const LazyDashboardDemoPage = lazy(() =>
  import('./pages/dashboard-demo').then((m) => ({ default: m.DashboardDemoPage })),
);
const LazyPrintDesignerDemoPage = lazy(() =>
  import('./pages/print-designer-demo').then((m) => ({ default: m.PrintDesignerDemoPage })),
);
const LazyCalendarDemoPage = lazy(() =>
  import('./pages/calendar-demo').then((m) => ({ default: m.CalendarDemoPage })),
);
const LazyBarcodeDemoPage = lazy(() =>
  import('./pages/barcode-demo').then((m) => ({ default: m.BarcodeDemoPage })),
);
const LazyGraphDemoPage = lazy(() =>
  import('./pages/graph-demo').then((m) => ({ default: m.GraphDemoPage })),
);
const LazyMapDemoPage = lazy(() =>
  import('./pages/map-demo').then((m) => ({ default: m.MapDemoPage })),
);
const LazyPivotTableDemoPage = lazy(() =>
  import('./pages/pivot-table-demo').then((m) => ({ default: m.PivotTableDemoPage })),
);
const LazyCalendarPerfScaleDemoPage = lazy(() =>
  import('./pages/calendar-perf-scale-demo').then((m) => ({ default: m.CalendarPerfScaleDemoPage })),
);
const LazyKanbanPerfScaleDemoPage = lazy(() =>
  import('./pages/kanban-perf-scale-demo').then((m) => ({ default: m.KanbanPerfScaleDemoPage })),
);
const LazyGanttPerfScaleDemoPage = lazy(() =>
  import('./pages/gantt-perf-scale-demo').then((m) => ({ default: m.GanttPerfScaleDemoPage })),
);
const LazyDiffPerfScaleDemoPage = lazy(() =>
  import('./pages/diff-perf-scale-demo').then((m) => ({ default: m.DiffPerfScaleDemoPage })),
);
const LazyDataVerifyPage = lazy(() =>
  import('./pages/data-verify-page').then((m) => ({ default: m.DataVerifyPage })),
);
const LazyEnvStreamDemoPage = lazy(() =>
  import('./pages/env-stream-demo').then((m) => ({ default: m.EnvStreamDemoPage })),
);
const LazyAiChatDemoPage = lazy(() =>
  import('./pages/ai-chat-demo').then((m) => ({ default: m.AiChatDemoPage })),
);
const LazyAiConversationsDemoPage = lazy(() =>
  import('./pages/ai-conversations-demo').then((m) => ({ default: m.AiConversationsDemoPage })),
);
const LazyAiToolsDemoPage = lazy(() =>
  import('./pages/ai-tools-demo').then((m) => ({ default: m.AiToolsDemoPage })),
);
const LazyAiAttachmentsDemoPage = lazy(() =>
  import('./pages/ai-attachments-demo').then((m) => ({ default: m.AiAttachmentsDemoPage })),
);
const LazyAiComponentHandleDemoPage = lazy(() =>
  import('./pages/ai-component-handle-demo').then((m) => ({ default: m.AiComponentHandleDemoPage })),
);
const LazyAiVirtualScrollDemoPage = lazy(() =>
  import('./pages/ai-virtual-scroll-demo').then((m) => ({ default: m.AiVirtualScrollDemoPage })),
);
const LazyAiPersistenceDemoPage = lazy(() =>
  import('./pages/ai-persistence-demo').then((m) => ({ default: m.AiPersistenceDemoPage })),
);
const LazyAiCitationsDemoPage = lazy(() =>
  import('./pages/ai-citations-demo').then((m) => ({ default: m.AiCitationsDemoPage })),
);
const LazyAiHitlDemoPage = lazy(() =>
  import('./pages/ai-hitl-demo').then((m) => ({ default: m.AiHitlDemoPage })),
);
const LazyAiP4WidgetsDemoPage = lazy(() =>
  import('./pages/ai-p4-widgets-demo').then((m) => ({ default: m.AiP4WidgetsDemoPage })),
);
const LazyAiLinkageDemoPage = lazy(() =>
  import('./pages/ai-linkage-demo').then((m) => ({ default: m.AiLinkageDemoPage })),
);
const LazyAiCoverageDemoPage = lazy(() =>
  import('./pages/ai-coverage-demo').then((m) => ({ default: m.AiCoverageDemoPage })),
);
const LazyAiWidgetsDemoPage = lazy(() =>
  import('./pages/ai-widgets-demo').then((m) => ({ default: m.AiWidgetsDemoPage })),
);
const LazyGanttDemoPage = lazy(() =>
  import('./pages/gantt-demo').then((m) => ({ default: m.GanttDemoPage })),
);
const LazyGanttStatesDemoPage = lazy(() =>
  import('./pages/gantt-states-demo').then((m) => ({ default: m.GanttStatesDemoPage })),
);
const LazyKanbanDemoPage = lazy(() =>
  import('./pages/kanban-demo').then((m) => ({ default: m.KanbanDemoPage })),
);
const LazyDiffDemoPage = lazy(() =>
  import('./pages/diff-demo').then((m) => ({ default: m.DiffDemoPage })),
);
const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerMobileRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);
registerSchedulingRenderers(registry);
registerGraphRenderers(registry);
registerMapRenderers(registry);
registerPivotRenderers(registry);
registerScadaRenderers(registry);
registerScadaEditorRenderers(registry);

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

interface RouteErrorBoundaryProps {
  /** Route identity; a change resets a caught error so navigation recovers. */
  routeKey: string;
  children: ReactNode;
}

/**
 * Shell-level guard around the lazy route outlet (R3-U5): a failed/stale chunk
 * after a redeploy renders a reload fallback instead of a white screen.
 */
class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prevProps: RouteErrorBoundaryProps) {
    if (this.state.error && prevProps.routeKey !== this.props.routeKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
          data-testid="route-error-boundary"
          role="alert"
        >
          <p className="text-lg font-medium">{t('flux.app.routeErrorTitle')}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {t('flux.app.routeErrorDescription')}
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            {t('flux.app.routeErrorReload')}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DomainNotFound({ domainId, onBack }: { domainId: string; onBack: () => void }) {
  return (
    <div
      className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center"
      data-testid="domain-not-found"
    >
      <p className="text-lg font-medium">{t('flux.app.domainNotFoundTitle', { domain: domainId })}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        {t('flux.app.domainNotFoundDescription')}
      </p>
      <Button type="button" onClick={onBack}>
        {t('flux.app.backHome')}
      </Button>
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
          onNavigate={(target) => {
            if (target.kind === 'lab') {
              navigate({ kind: 'lab' });
            } else if (target.kind === 'showcase') {
              navigate({ kind: 'showcase' });
            } else {
              navigate({ kind: 'domain', domainId: target.domainId });
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
        case 'gantt':
          return <LazyGanttDemoPage onBack={goHome} />;
        case 'gantt-states':
          return <LazyGanttStatesDemoPage onBack={goHome} />;
        case 'kanban':
          return <LazyKanbanDemoPage onBack={goHome} />;
        case 'scheduling-calendar':
          return <LazyCalendarDemoPage onBack={goHome} />;
        case 'taskflow-designer':
          return <TaskFlowDesignerPage debuggerController={debuggerController} onBack={goHome} />;
        case 'report-designer':
          return <LazyReportDesignerPage onBack={goHome} />;
        case 'report-designer-host':
          return <LazyReportDesignerHostPage onBack={goHome} />;
        case 'spreadsheet':
          return <LazySpreadsheetPage onBack={goHome} />;
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
        case 'table-column-width':
          return <TableColumnWidthDemoPage onBack={goHome} />;
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
        case 'barcode-input':
          return <LazyBarcodeDemoPage onBack={goHome} />;
        case 'graph-demo':
          return <LazyGraphDemoPage onBack={goHome} />;
        case 'map-demo':
          return <LazyMapDemoPage onBack={goHome} />;
        case 'pivot-table-demo':
          return <LazyPivotTableDemoPage onBack={goHome} />;
        case 'diff-view':
          return <LazyDiffDemoPage onBack={goHome} />;
        case 'scada-demo':
          return <LazyScadaDemoPage onBack={goHome} />;
        case 'scada-pressure-demo':
          return <LazyScadaPressureDemoPage onBack={goHome} />;
        case 'scada-perf-scale':
          return <LazyScadaPerfScaleDemoPage onBack={goHome} />;
        case 'leafer-examples':
          return <LazyLeaferExamplesDemoPage onBack={goHome} />;
        case 'three-canvas-demo':
          return <LazyThreeCanvasDemoPage onBack={goHome} />;
        case 'scada-edge-cases':
          return <LazyScadaEdgeDemoPage onBack={goHome} />;
        case 'scada-editor-demo':
          return <LazyScadaEditorDemoPage onBack={goHome} />;
        case 'print-designer':
          return <LazyPrintDesignerDemoPage />;
        case 'page-designer':
          return <LazyPageDesignerPage onBack={goHome} />;
        case 'dashboard-demo':
          return <LazyDashboardDemoPage onBack={goHome} />;
        case 'calendar-perf-scale':
          return <LazyCalendarPerfScaleDemoPage onBack={goHome} />;
        case 'kanban-perf-scale':
          return <LazyKanbanPerfScaleDemoPage onBack={goHome} />;
        case 'gantt-perf-scale':
          return <LazyGanttPerfScaleDemoPage onBack={goHome} />;
        case 'diff-perf-scale':
          return <LazyDiffPerfScaleDemoPage onBack={goHome} />;
        case 'data-verify':
          return <LazyDataVerifyPage onBack={goHome} />;
        case 'env-stream':
          return <LazyEnvStreamDemoPage onBack={goHome} />;
        case 'ai-chat':
          return <LazyAiChatDemoPage onBack={goHome} />;
        case 'ai-conversations':
          return <LazyAiConversationsDemoPage onBack={goHome} />;
        case 'ai-tools':
          return <LazyAiToolsDemoPage onBack={goHome} />;
        case 'ai-attachments':
          return <LazyAiAttachmentsDemoPage onBack={goHome} />;
        case 'ai-component-handle':
          return <LazyAiComponentHandleDemoPage onBack={goHome} />;
        case 'ai-virtual-scroll':
          return <LazyAiVirtualScrollDemoPage onBack={goHome} />;
        case 'ai-persistence':
          return <LazyAiPersistenceDemoPage onBack={goHome} />;
        case 'ai-citations':
          return <LazyAiCitationsDemoPage onBack={goHome} />;
        case 'ai-hitl':
          return <LazyAiHitlDemoPage onBack={goHome} />;
        case 'ai-p4':
          return <LazyAiP4WidgetsDemoPage onBack={goHome} />;
        case 'ai-linkage':
          return <LazyAiLinkageDemoPage onBack={goHome} />;
        case 'ai-coverage':
          return <LazyAiCoverageDemoPage onBack={goHome} />;
        case 'ai-rich-text':
          return <LazyAiRichTextDemoPage onBack={goHome} />;
        case 'ai-widgets':
          return <LazyAiWidgetsDemoPage onBack={goHome} />;
        default:
          return <DomainNotFound domainId={route.domainId} onBack={goHome} />;
      }
  }
}

export function App() {
  const [route, navigate] = useRoute();
  // Full route identity (kind + every discriminated id) — a tripped boundary
  // must reset on ANY navigation, including same-kind id switches like
  // #/lab/form → #/lab/button.
  const routeKey = JSON.stringify(route);

  return (
    <div className="nop-theme-root">
      <RouteErrorBoundary routeKey={routeKey}>
        <Suspense fallback={<PageFallback />}>{renderPage(route, navigate)}</Suspense>
      </RouteErrorBoundary>
      <ThemeSwitcher />
      <NopDebuggerPanel controller={debuggerController} />
      {/* Host-channels contract (plan 512 L3.4): the app shell owns the ONLY
         persistent <Toaster/> — route swaps must not kill in-flight toasts.
         Page/host components must not mount their own. */}
      <Toaster />
    </div>
  );
}
