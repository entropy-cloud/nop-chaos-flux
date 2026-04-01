import React, { useEffect, useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type {
  InspectorPanelDescriptor,
  MetadataBag,
  ReportDesignerRuntimeSnapshot,
  ReportSelectionTarget,
} from '@nop-chaos/report-designer-core';
import { formatSelectionLabel, joinClassNames } from './helpers.js';
import { renderFallbackInspector } from './fallbacks.js';
import type { ReportInspectorShellSchema } from './types.js';

export function ReportInspectorShellRenderer(props: RendererComponentProps<ReportInspectorShellSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const scope = useRenderScope();
  const scopeData = useScopeSelector((data: Record<string, unknown>) => data);
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
  const [activePanelId, setActivePanelId] = React.useState<string | undefined>(inspector?.activePanelId ?? tabPanels[0]?.id ?? panels[0]?.id);
  const [submittingPanelId, setSubmittingPanelId] = React.useState<string | undefined>();
  const [submitResult, setSubmitResult] = React.useState<{ ok: boolean; error?: unknown } | undefined>();

  useEffect(() => {
    const nextActivePanelId = inspector?.activePanelId ?? tabPanels[0]?.id ?? panels[0]?.id;
    setActivePanelId((current) => {
      if (current && tabPanels.some((panel) => panel.id === current)) return current;
      return current === nextActivePanelId ? current : nextActivePanelId;
    });
  }, [inspector?.activePanelId, panels, tabPanels]);

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
      <div key={panel.id} className="nop-report-designer__stack">
        {showHeader ? (
          <div className="nop-report-designer__section-header">
            <h4>{panel.title}</h4>
            <span>
              {panel.badge ? `${panel.badge}${panel.readonly ? ' | Read only' : ''}` : panel.readonly ? 'Read only' : ''}
            </span>
          </div>
        ) : null}
        {props.helpers.render(panel.body as any, {
          scope,
          pathSuffix: `inspector-panels.${panel.id}`,
        })}
        {panel.submitAction && !panel.readonly ? (
          <div className="nop-report-designer__toolbar">
            <button type="button" onClick={() => void handleSubmit(panel)} disabled={submittingPanelId === panel.id}>
              {submittingPanelId === panel.id ? 'Saving...' : String(props.props.saveLabel ?? 'Save Panel')}
            </button>
            {submitResult && panel.id === submittingPanelId ? (
              submitResult.ok ? <span>Saved</span> : submitResult.error ? <span>Save failed</span> : null
            ) : null}
          </div>
        ) : panel.readonly ? (
          <p className="nop-report-designer__empty">This panel is read only.</p>
        ) : null}
      </div>
    );
  }

  return (
    <section className={joinClassNames('nop-report-designer__inspector-shell', props.meta.className)}>
      {hasRendererSlotContent(titleContent) ? (
        <header className="nop-report-designer__section-header">
          <h3>{titleContent}</h3>
          <span>{formatSelectionLabel(target)}</span>
        </header>
      ) : null}

      {!target ? (
        <p className="nop-report-designer__empty">{String(props.props.noSelectionLabel ?? 'Select a target to inspect.')}</p>
      ) : inspector?.loading ? (
        <p className="nop-report-designer__empty">Loading inspector panels...</p>
      ) : inspector?.error ? (
        <div className="nop-report-designer__stack">
          <p className="nop-report-designer__empty">{String(props.props.errorLabel ?? 'Failed to load inspector panels.')}</p>
          <p className="nop-report-designer__empty">{inspectorErrorLabel}</p>
        </div>
      ) : panels.length === 0 ? (
        <div className="nop-report-designer__stack">
          <p className="nop-report-designer__empty">{String(props.props.emptyLabel ?? 'No inspector panels available.')}</p>
          {scopeData.meta ? renderFallbackInspector(scopeData.meta as MetadataBag) : null}
        </div>
      ) : (
        <div className="nop-report-designer__stack">
          {tabPanels.length > 1 ? (
            <div className="nop-report-designer__toolbar">
              {tabPanels.map((panel) => (
                <button key={panel.id} type="button" className="nop-report-designer__tab" onClick={() => setActivePanelId(panel.id)}>
                  <span>{panel.title}</span>
                  {panel.badge ? <span>{panel.badge}</span> : null}
                  {panel.readonly ? <span>Read only</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          {activePanel ? renderPanelChrome(activePanel, { showHeader: tabPanels.length <= 1 }) : null}
          {groupedSectionPanels.map((group) => (
            <section key={`section-group-${group.group}`} className="nop-report-designer__stack">
              <div className="nop-report-designer__section-header">
                <h4>{group.group}</h4>
              </div>
              {group.panels.map((panel) => renderPanelChrome(panel))}
            </section>
          ))}
          {groupedInlinePanels.length > 0 ? (
            <div className="nop-report-designer__stack">
              {groupedInlinePanels.map((group) => (
                <section key={`inline-group-${group.group}`} className="nop-report-designer__stack">
                  <div className="nop-report-designer__section-header">
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

