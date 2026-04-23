import React, { useCallback, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useOwnScopeSelector, useRenderScope } from '@nop-chaos/flux-react';
import type {
  InspectorPanelDescriptor,
  MetadataBag,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
} from '@nop-chaos/report-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Tabs, TabsList, TabsTrigger } from '@nop-chaos/ui';
import { formatSelectionLabel, joinClassNames } from './helpers.js';
import { renderFallbackInspector } from './fallbacks.js';
import type { ReportInspectorShellSchema } from './types.js';

export function ReportInspectorShellRenderer(props: RendererComponentProps<ReportInspectorShellSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const scope = useRenderScope();
  const scopeData = useOwnScopeSelector((data: Record<string, unknown>) => data);
  const target = scopeData.selectionTarget as ReportSelectionTarget | undefined;
  const inspector = scopeData.inspector as ReportDesignerRuntimeSnapshot['inspector'] | undefined;
  const panels = useMemo(
    () =>
      (Array.isArray(scopeData.inspectorPanels) ? (scopeData.inspectorPanels as InspectorPanelDescriptor[]) : [])
        .slice()
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    [scopeData.inspectorPanels],
  );
  const tabPanels = useMemo(
    () => panels.filter((panel) => panel.mode == null || panel.mode === 'tab'),
    [panels],
  );
  const sectionPanels = useMemo(() => panels.filter((panel) => panel.mode === 'section'), [panels]);
  const inlinePanels = useMemo(() => panels.filter((panel) => panel.mode === 'inline'), [panels]);
  const activePanelId = inspector?.activePanelId ?? tabPanels[0]?.id ?? panels[0]?.id;
  const [submittingPanelId, setSubmittingPanelId] = React.useState<string | undefined>();
  const [submitResult, setSubmitResult] = React.useState<{ ok: boolean; error?: unknown } | undefined>();

  const setActivePanelId = useCallback(
    (panelId: string) => {
      void props.helpers.dispatch(
        { action: 'report-designer:setActivePanel', args: { panelId } },
        { scope },
      );
    },
    [props.helpers, scope],
  );

  const activePanel = tabPanels.find((panel) => panel.id === activePanelId) ?? tabPanels[0];
  const inspectorErrorLabel = inspector?.error != null ? String(inspector.error) : undefined;

  const groupedSectionPanels = useMemo(() => {
    const grouped = new Map<string, InspectorPanelDescriptor[]>();
    for (const panel of sectionPanels) {
      const groupKey = panel.group ?? 'General';
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.push(panel);
      } else {
        grouped.set(groupKey, [panel]);
      }
    }
    return Array.from(grouped.entries()).map(([group, groupedPanels]) => ({ group, panels: groupedPanels }));
  }, [sectionPanels]);

  const groupedInlinePanels = useMemo(() => {
    const grouped = new Map<string, InspectorPanelDescriptor[]>();
    for (const panel of inlinePanels) {
      const groupKey = panel.group ?? 'Inline';
      const existing = grouped.get(groupKey);
      if (existing) {
        existing.push(panel);
      } else {
        grouped.set(groupKey, [panel]);
      }
    }
    return Array.from(grouped.entries()).map(([group, groupedPanels]) => ({ group, panels: groupedPanels }));
  }, [inlinePanels]);

  async function handleSubmit(panel: InspectorPanelDescriptor) {
    if (!panel.submitAction) return;
    setSubmittingPanelId(panel.id);
    setSubmitResult(undefined);
    try {
      const result = await props.helpers.dispatch(panel.submitAction as any, { scope });
      setSubmitResult(result);
    } catch (error) {
      setSubmitResult({ ok: false, error });
    } finally {
      setSubmittingPanelId((current) => (current === panel.id ? undefined : current));
    }
  }

  function renderPanelChrome(panel: InspectorPanelDescriptor, options?: { showHeader?: boolean }) {
    const showHeader = options?.showHeader ?? true;
    return (
      <div key={panel.id} data-slot="report-designer-stack">
        {showHeader ? (
          <div data-slot="report-designer-section-header">
            <h4>{panel.title}</h4>
            <span>
              {panel.badge ? `${panel.badge}${panel.readonly ? ` | ${t('flux.reportDesigner.readOnly')}` : ''}` : panel.readonly ? t('flux.reportDesigner.readOnly') : ''}
            </span>
          </div>
        ) : null}
        {props.helpers.render(panel.body as any, {
          scope,
          pathSuffix: `inspector-panels.${panel.id}`,
        })}
        {panel.submitAction && !panel.readonly ? (
          <div data-slot="report-designer-toolbar">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSubmit(panel)}
              disabled={submittingPanelId === panel.id}
            >
              {submittingPanelId === panel.id ? t('flux.reportDesigner.saving') : String(props.props.saveLabel ?? t('flux.reportDesigner.savePanel'))}
            </Button>
            {submitResult && panel.id === submittingPanelId ? (
              submitResult.ok ? <span>{t('flux.reportDesigner.saved')}</span> : submitResult.error ? <span>{t('flux.reportDesigner.saveFailed')}</span> : null
            ) : null}
          </div>
        ) : panel.readonly ? (
          <p data-slot="report-designer-empty">{t('flux.reportDesigner.panelReadOnly')}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section className={joinClassNames('nop-report-designer', props.meta.className)} data-slot="report-designer-inspector-shell">
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="report-designer-section-header">
          <h3>{titleContent}</h3>
          <span>{formatSelectionLabel(target)}</span>
        </header>
      ) : null}

      {!target ? (
        <p data-slot="report-designer-empty">{String(props.props.noSelectionLabel ?? t('flux.reportDesigner.noSelection'))}</p>
      ) : inspector?.loading ? (
        <p data-slot="report-designer-empty">{t('flux.reportDesigner.loadingPanels')}</p>
      ) : inspector?.error ? (
        <div data-slot="report-designer-stack">
          <p data-slot="report-designer-empty">{String(props.props.errorLabel ?? t('flux.reportDesigner.loadPanelsFailed'))}</p>
          <p data-slot="report-designer-empty">{inspectorErrorLabel}</p>
        </div>
      ) : panels.length === 0 ? (
        <div data-slot="report-designer-stack">
          <p data-slot="report-designer-empty">{String(props.props.emptyLabel ?? t('flux.reportDesigner.noPanels'))}</p>
          {scopeData.meta ? renderFallbackInspector(scopeData.meta as MetadataBag) : null}
        </div>
      ) : (
        <div data-slot="report-designer-stack">
          {tabPanels.length > 1 ? (
            <Tabs data-orientation="horizontal" className="flex-col gap-0">
              <TabsList variant="line" className="w-full rounded-none px-0">
                {tabPanels.map((panel) => (
                  <TabsTrigger
                    key={panel.id}
                    value={panel.id}
                    type="button"
                    onClick={() => setActivePanelId(panel.id)}
                  >
                    <span>{panel.title}</span>
                    {panel.badge ? <span>{panel.badge}</span> : null}
                    {panel.readonly ? <span>{t('flux.reportDesigner.readOnly')}</span> : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}
          {activePanel ? renderPanelChrome(activePanel, { showHeader: tabPanels.length <= 1 }) : null}
          {groupedSectionPanels.map((group) => (
            <section key={`section-group-${group.group}`} data-slot="report-designer-stack">
              <div data-slot="report-designer-section-header">
                <h4>{group.group}</h4>
              </div>
              {group.panels.map((panel) => renderPanelChrome(panel))}
            </section>
          ))}
          {groupedInlinePanels.length > 0 ? (
            <div data-slot="report-designer-stack">
              {groupedInlinePanels.map((group) => (
                <section key={`inline-group-${group.group}`} data-slot="report-designer-stack">
                  <div data-slot="report-designer-section-header">
                    <h4>{group.group}</h4>
                  </div>
                  {group.panels.map((panel) => renderPanelChrome(panel, { showHeader: false }))}
                </section>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
