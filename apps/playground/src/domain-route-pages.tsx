import React, { lazy } from 'react';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { BooleanControlValueContractDemoPage } from './pages/boolean-control-value-contract-demo';
import { CodeEditorPage } from './pages/code-editor-page';
import { ComponentHandlesDemoPage } from './pages/component-handles-demo';
import { EventPreventionDemoPage } from './pages/event-prevention-demo';
import { FlowDesignerPage } from './pages/flow-designer-page';
import { FluxBasicPage } from './pages/flux-basic-page';
import { FormInputEnhancementsDemoPage } from './pages/form-input-enhancements-demo';
import { InputSuggestDemoPage } from './pages/input-suggest-demo';
import { LayoutFamilyEnhancementsDemoPage } from './pages/layout-family-enhancements-demo';
import { M1ResponsiveDemoPage } from './pages/m1-responsive-demo';
import { M2TouchDemoPage } from './pages/m2-touch-demo';
import { M3LayoutDemoPage } from './pages/m3-layout-demo';
import { M4DataDisplayDemoPage } from './pages/m4-data-display-demo';
import { M5MobileShowcaseDemoPage } from './pages/m5-mobile-showcase-demo';
import { MobileComponentsDemoPage } from './pages/mobile-components-demo';
import { MobileInfrastructureDemoPage } from './pages/mobile-infrastructure-demo';
import { PerformanceTablePage } from './pages/performance-table-page';
import { TableColumnWidthDemoPage } from './pages/table-column-width-demo';
import { TablePopOverDemoPage } from './pages/table-popover-demo';
import { TaskFlowDesignerPage } from './pages/taskflow-designer-page';
import { TextIconVisualFieldsDemoPage } from './pages/text-icon-visual-fields-demo';
import { TreeDisplayUxDemoPage } from './pages/tree-display-ux-demo';
import { W1aContentDisplayDemoPage } from './pages/w1a-content-display-demo';
import { W1bContentFeedbackDemoPage } from './pages/w1b-content-feedback-demo';
import { W2aDataCompositionDemoPage } from './pages/w2a-data-composition-demo';
import { W2bDateFamilyDemoPage } from './pages/w2b-date-family-demo';
import { W3aW3bLayoutActionFamilyDemoPage } from './pages/w3a-w3b-layout-action-family-demo';
import { W3cValueMappingDemoPage } from './pages/w3c-value-mapping-demo';
import { W3dAdvancedInputFamilyDemoPage } from './pages/w3d-advanced-input-family-demo';
import { W4aMultimediaDemoPage } from './pages/w4a-multimedia-demo';
import { W4bProcessDisplayFamilyDemoPage } from './pages/w4b-process-display-family-demo';
import { W4cCompositeFormFamilyDemoPage } from './pages/w4c-composite-form-family-demo';

const LazyAiAttachmentsDemoPage = lazy(() =>
  import('./pages/ai-attachments-demo').then((m) => ({ default: m.AiAttachmentsDemoPage })),
);
const LazyAiChatDemoPage = lazy(() =>
  import('./pages/ai-chat-demo').then((m) => ({ default: m.AiChatDemoPage })),
);
const LazyAiCitationsDemoPage = lazy(() =>
  import('./pages/ai-citations-demo').then((m) => ({ default: m.AiCitationsDemoPage })),
);
const LazyAiComponentHandleDemoPage = lazy(() =>
  import('./pages/ai-component-handle-demo').then((m) => ({ default: m.AiComponentHandleDemoPage })),
);
const LazyAiConversationsDemoPage = lazy(() =>
  import('./pages/ai-conversations-demo').then((m) => ({ default: m.AiConversationsDemoPage })),
);
const LazyAiCoverageDemoPage = lazy(() =>
  import('./pages/ai-coverage-demo').then((m) => ({ default: m.AiCoverageDemoPage })),
);
const LazyAiHitlDemoPage = lazy(() =>
  import('./pages/ai-hitl-demo').then((m) => ({ default: m.AiHitlDemoPage })),
);
const LazyAiLinkageDemoPage = lazy(() =>
  import('./pages/ai-linkage-demo').then((m) => ({ default: m.AiLinkageDemoPage })),
);
const LazyAiP4WidgetsDemoPage = lazy(() =>
  import('./pages/ai-p4-widgets-demo').then((m) => ({ default: m.AiP4WidgetsDemoPage })),
);
const LazyAiPersistenceDemoPage = lazy(() =>
  import('./pages/ai-persistence-demo').then((m) => ({ default: m.AiPersistenceDemoPage })),
);
const LazyAiRichTextDemoPage = lazy(() =>
  import('./pages/ai-rich-text-demo').then((m) => ({ default: m.AiRichTextDemoPage })),
);
const LazyAiToolsDemoPage = lazy(() =>
  import('./pages/ai-tools-demo').then((m) => ({ default: m.AiToolsDemoPage })),
);
const LazyAiVirtualScrollDemoPage = lazy(() =>
  import('./pages/ai-virtual-scroll-demo').then((m) => ({ default: m.AiVirtualScrollDemoPage })),
);
const LazyAiWidgetsDemoPage = lazy(() =>
  import('./pages/ai-widgets-demo').then((m) => ({ default: m.AiWidgetsDemoPage })),
);
const LazyBarcodeDemoPage = lazy(() =>
  import('./pages/barcode-demo').then((m) => ({ default: m.BarcodeDemoPage })),
);
const LazyCalendarDemoPage = lazy(() =>
  import('./pages/calendar-demo').then((m) => ({ default: m.CalendarDemoPage })),
);
const LazyCalendarPerfScaleDemoPage = lazy(() =>
  import('./pages/calendar-perf-scale-demo').then((m) => ({ default: m.CalendarPerfScaleDemoPage })),
);
const LazyConditionBuilderFormulaPage = lazy(() =>
  import('./pages/condition-builder-formula-page').then((m) => ({ default: m.ConditionBuilderFormulaPage })),
);
const LazyConditionBuilderPage = lazy(() =>
  import('./pages/condition-builder-page').then((m) => ({ default: m.ConditionBuilderPage })),
);
const LazyDashboardDemoPage = lazy(() =>
  import('./pages/dashboard-demo').then((m) => ({ default: m.DashboardDemoPage })),
);
const LazyDataVerifyPage = lazy(() =>
  import('./pages/data-verify-page').then((m) => ({ default: m.DataVerifyPage })),
);
const LazyDebuggerLabPage = lazy(() =>
  import('./pages/debugger-lab-page').then((m) => ({ default: m.DebuggerLabPage })),
);
const LazyDiffDemoPage = lazy(() =>
  import('./pages/diff-demo').then((m) => ({ default: m.DiffDemoPage })),
);
const LazyDiffPerfScaleDemoPage = lazy(() =>
  import('./pages/diff-perf-scale-demo').then((m) => ({ default: m.DiffPerfScaleDemoPage })),
);
const LazyEnvStreamDemoPage = lazy(() =>
  import('./pages/env-stream-demo').then((m) => ({ default: m.EnvStreamDemoPage })),
);
const LazyGanttDemoPage = lazy(() =>
  import('./pages/gantt-demo').then((m) => ({ default: m.GanttDemoPage })),
);
const LazyGanttPerfScaleDemoPage = lazy(() =>
  import('./pages/gantt-perf-scale-demo').then((m) => ({ default: m.GanttPerfScaleDemoPage })),
);
const LazyGanttStatesDemoPage = lazy(() =>
  import('./pages/gantt-states-demo').then((m) => ({ default: m.GanttStatesDemoPage })),
);
const LazyGraphDemoPage = lazy(() =>
  import('./pages/graph-demo').then((m) => ({ default: m.GraphDemoPage })),
);
const LazyKanbanDemoPage = lazy(() =>
  import('./pages/kanban-demo').then((m) => ({ default: m.KanbanDemoPage })),
);
const LazyKanbanPerfScaleDemoPage = lazy(() =>
  import('./pages/kanban-perf-scale-demo').then((m) => ({ default: m.KanbanPerfScaleDemoPage })),
);
const LazyLeaferExamplesDemoPage = lazy(() =>
  import('./pages/leafer-examples-demo').then((m) => ({ default: m.LeaferExamplesDemoPage })),
);
const LazyMapDemoPage = lazy(() =>
  import('./pages/map-demo').then((m) => ({ default: m.MapDemoPage })),
);
const LazyPageDesignerPage = lazy(() =>
  import('./pages/page-designer-demo').then((m) => ({ default: m.PageDesignerDemoPage })),
);
const LazyPivotTableDemoPage = lazy(() =>
  import('./pages/pivot-table-demo').then((m) => ({ default: m.PivotTableDemoPage })),
);
const LazyPrintDesignerDemoPage = lazy(() =>
  import('./pages/print-designer-demo').then((m) => ({ default: m.PrintDesignerDemoPage })),
);
const LazyReportDesignerHostPage = lazy(() =>
  import('./pages/report-designer-host-page').then((m) => ({ default: m.ReportDesignerHostPage })),
);
const LazyReportDesignerPage = lazy(() =>
  import('./pages/report-designer-page').then((m) => ({ default: m.ReportDesignerPage })),
);
const LazyScadaDemoPage = lazy(() =>
  import('./pages/scada-demo').then((m) => ({ default: m.ScadaDemoPage })),
);
const LazyScadaEdgeDemoPage = lazy(() =>
  import('./pages/scada-edge-demo').then((m) => ({ default: m.ScadaEdgeDemoPage })),
);
const LazyScadaEditorDemoPage = lazy(() =>
  import('./pages/scada-editor-demo').then((m) => ({ default: m.ScadaEditorDemoPage })),
);
const LazyScadaPerfScaleDemoPage = lazy(() =>
  import('./pages/scada-perf-scale-demo').then((m) => ({ default: m.ScadaPerfScaleDemoPage })),
);
const LazyScadaPressureDemoPage = lazy(() =>
  import('./pages/scada-pressure-demo').then((m) => ({ default: m.ScadaPressureDemoPage })),
);
const LazySpreadsheetPage = lazy(() =>
  import('./pages/spreadsheet-page').then((m) => ({ default: m.SpreadsheetPage })),
);
const LazyThreeCanvasDemoPage = lazy(() =>
  import('./pages/three-canvas-demo').then((m) => ({ default: m.ThreeCanvasDemoPage })),
);
const LazyWordEditorPage = lazy(() =>
  import('./pages/word-editor-page').then((m) => ({ default: m.WordEditorPage })),
);

/**
 * Single-source domain route wiring (cq-6 Phase 3): the former 78-case
 * domainId switch collapsed onto this table. DomainRouteEntry metadata
 * (domain-route-entries.ts) and this table are reconciled by the
 * domain-route-pages completeness test — `dingtalk-flow-demo` intentionally
 * has metadata but no page (it drives the domain-not-found screen in
 * app-route-resilience tests).
 */
export interface DomainPageContext {
  debuggerController: NopDebuggerController;
  goHome: () => void;
  diagnosticsEnabled: boolean;
}

export const DOMAIN_ROUTE_PAGES: Record<string, (ctx: DomainPageContext) => React.ReactNode> = {
  'flux-basic': (ctx) => <FluxBasicPage debuggerController={ctx.debuggerController} onBack={ctx.goHome} />,
  'flow-designer': (ctx) => <FlowDesignerPage debuggerController={ctx.debuggerController} onBack={ctx.goHome} />,
  gantt: (ctx) => <LazyGanttDemoPage onBack={ctx.goHome} />,
  'gantt-states': (ctx) => <LazyGanttStatesDemoPage onBack={ctx.goHome} />,
  kanban: (ctx) => <LazyKanbanDemoPage onBack={ctx.goHome} />,
  'scheduling-calendar': (ctx) => <LazyCalendarDemoPage onBack={ctx.goHome} />,
  'taskflow-designer': (ctx) => <TaskFlowDesignerPage debuggerController={ctx.debuggerController} onBack={ctx.goHome} />,
  'report-designer': (ctx) => <LazyReportDesignerPage onBack={ctx.goHome} />,
  'report-designer-host': (ctx) => <LazyReportDesignerHostPage onBack={ctx.goHome} />,
  spreadsheet: (ctx) => <LazySpreadsheetPage onBack={ctx.goHome} />,
  'debugger-lab': (ctx) => <LazyDebuggerLabPage debuggerController={ctx.debuggerController} onBack={ctx.goHome} />,
  'condition-builder': (ctx) => <LazyConditionBuilderPage onBack={ctx.goHome} />,
  'condition-builder-formula': (ctx) => <LazyConditionBuilderFormulaPage onBack={ctx.goHome} />,
  'code-editor': (ctx) => <CodeEditorPage onBack={ctx.goHome} />,
  'word-editor': (ctx) => <LazyWordEditorPage onBack={ctx.goHome} />,
  'performance-table': (ctx) => (
    <PerformanceTablePage
      debuggerController={ctx.debuggerController}
      diagnosticsEnabled={ctx.diagnosticsEnabled}
      onBack={ctx.goHome}
    />
  ),
  'component-handles': (ctx) => <ComponentHandlesDemoPage onBack={ctx.goHome} />,
  'event-prevention': (ctx) => <EventPreventionDemoPage onBack={ctx.goHome} />,
  'boolean-control-value-contract': (ctx) => <BooleanControlValueContractDemoPage onBack={ctx.goHome} />,
  'text-icon-visual-fields': (ctx) => <TextIconVisualFieldsDemoPage onBack={ctx.goHome} />,
  'layout-family-enhancements': (ctx) => <LayoutFamilyEnhancementsDemoPage onBack={ctx.goHome} />,
  'form-input-enhancements': (ctx) => <FormInputEnhancementsDemoPage onBack={ctx.goHome} />,
  'input-suggest': (ctx) => <InputSuggestDemoPage onBack={ctx.goHome} />,
  'tree-display-ux': (ctx) => <TreeDisplayUxDemoPage onBack={ctx.goHome} />,
  'table-popover': (ctx) => <TablePopOverDemoPage onBack={ctx.goHome} />,
  'table-column-width': (ctx) => <TableColumnWidthDemoPage onBack={ctx.goHome} />,
  'mobile-infrastructure': (ctx) => <MobileInfrastructureDemoPage onBack={ctx.goHome} />,
  'mobile-components': (ctx) => <MobileComponentsDemoPage onBack={ctx.goHome} />,
  'w1b-content': (ctx) => <W1bContentFeedbackDemoPage onBack={ctx.goHome} />,
  'w1a-content': (ctx) => <W1aContentDisplayDemoPage onBack={ctx.goHome} />,
  'w2a-data-composition': (ctx) => <W2aDataCompositionDemoPage onBack={ctx.goHome} />,
  'w2b-date-family': (ctx) => <W2bDateFamilyDemoPage onBack={ctx.goHome} />,
  'w3a-w3b-layout-action-family': (ctx) => <W3aW3bLayoutActionFamilyDemoPage onBack={ctx.goHome} />,
  'w3c-value-mapping': (ctx) => <W3cValueMappingDemoPage onBack={ctx.goHome} />,
  'w3d-advanced-input-family': (ctx) => <W3dAdvancedInputFamilyDemoPage onBack={ctx.goHome} />,
  'w4a-multimedia': (ctx) => <W4aMultimediaDemoPage onBack={ctx.goHome} />,
  'w4b-process-display': (ctx) => <W4bProcessDisplayFamilyDemoPage onBack={ctx.goHome} />,
  'w4c-composite-form-family': (ctx) => <W4cCompositeFormFamilyDemoPage onBack={ctx.goHome} />,
  'm1-responsive': (ctx) => <M1ResponsiveDemoPage onBack={ctx.goHome} />,
  'm2-touch': (ctx) => <M2TouchDemoPage onBack={ctx.goHome} />,
  'm3-layout': (ctx) => <M3LayoutDemoPage onBack={ctx.goHome} />,
  'm4-data': (ctx) => <M4DataDisplayDemoPage onBack={ctx.goHome} />,
  'm5-showcase': (ctx) => <M5MobileShowcaseDemoPage onBack={ctx.goHome} />,
  'barcode-input': (ctx) => <LazyBarcodeDemoPage onBack={ctx.goHome} />,
  'graph-demo': (ctx) => <LazyGraphDemoPage onBack={ctx.goHome} />,
  'map-demo': (ctx) => <LazyMapDemoPage onBack={ctx.goHome} />,
  'pivot-table-demo': (ctx) => <LazyPivotTableDemoPage onBack={ctx.goHome} />,
  'diff-view': (ctx) => <LazyDiffDemoPage onBack={ctx.goHome} />,
  'scada-demo': (ctx) => <LazyScadaDemoPage onBack={ctx.goHome} />,
  'scada-pressure-demo': (ctx) => <LazyScadaPressureDemoPage onBack={ctx.goHome} />,
  'scada-perf-scale': (ctx) => <LazyScadaPerfScaleDemoPage onBack={ctx.goHome} />,
  'leafer-examples': (ctx) => <LazyLeaferExamplesDemoPage onBack={ctx.goHome} />,
  'three-canvas-demo': (ctx) => <LazyThreeCanvasDemoPage onBack={ctx.goHome} />,
  'scada-edge-cases': (ctx) => <LazyScadaEdgeDemoPage onBack={ctx.goHome} />,
  'scada-editor-demo': (ctx) => <LazyScadaEditorDemoPage onBack={ctx.goHome} />,
  'print-designer': () => <LazyPrintDesignerDemoPage />,
  'page-designer': (ctx) => <LazyPageDesignerPage onBack={ctx.goHome} />,
  'dashboard-demo': (ctx) => <LazyDashboardDemoPage onBack={ctx.goHome} />,
  'calendar-perf-scale': (ctx) => <LazyCalendarPerfScaleDemoPage onBack={ctx.goHome} />,
  'kanban-perf-scale': (ctx) => <LazyKanbanPerfScaleDemoPage onBack={ctx.goHome} />,
  'gantt-perf-scale': (ctx) => <LazyGanttPerfScaleDemoPage onBack={ctx.goHome} />,
  'diff-perf-scale': (ctx) => <LazyDiffPerfScaleDemoPage onBack={ctx.goHome} />,
  'data-verify': (ctx) => <LazyDataVerifyPage onBack={ctx.goHome} />,
  'env-stream': (ctx) => <LazyEnvStreamDemoPage onBack={ctx.goHome} />,
  'ai-chat': (ctx) => <LazyAiChatDemoPage onBack={ctx.goHome} />,
  'ai-conversations': (ctx) => <LazyAiConversationsDemoPage onBack={ctx.goHome} />,
  'ai-tools': (ctx) => <LazyAiToolsDemoPage onBack={ctx.goHome} />,
  'ai-attachments': (ctx) => <LazyAiAttachmentsDemoPage onBack={ctx.goHome} />,
  'ai-component-handle': (ctx) => <LazyAiComponentHandleDemoPage onBack={ctx.goHome} />,
  'ai-virtual-scroll': (ctx) => <LazyAiVirtualScrollDemoPage onBack={ctx.goHome} />,
  'ai-persistence': (ctx) => <LazyAiPersistenceDemoPage onBack={ctx.goHome} />,
  'ai-citations': (ctx) => <LazyAiCitationsDemoPage onBack={ctx.goHome} />,
  'ai-hitl': (ctx) => <LazyAiHitlDemoPage onBack={ctx.goHome} />,
  'ai-p4': (ctx) => <LazyAiP4WidgetsDemoPage onBack={ctx.goHome} />,
  'ai-linkage': (ctx) => <LazyAiLinkageDemoPage onBack={ctx.goHome} />,
  'ai-coverage': (ctx) => <LazyAiCoverageDemoPage onBack={ctx.goHome} />,
  'ai-rich-text': (ctx) => <LazyAiRichTextDemoPage onBack={ctx.goHome} />,
  'ai-widgets': (ctx) => <LazyAiWidgetsDemoPage onBack={ctx.goHome} />,
};
