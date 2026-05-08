import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useCurrentActionScope,
  useOwnScopeSelector,
  useRendererRuntime,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import type { FieldSourceSnapshot, ReportSelectionTarget } from '@nop-chaos/report-designer-core';
import { getFieldCount } from './helpers.js';
import type { ReportFieldPanelSchema } from './types.js';

export function ReportFieldPanelRenderer(props: RendererComponentProps<ReportFieldPanelSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const actionScope = useCurrentActionScope();
  const runtime = useRendererRuntime();
  const scopeData = useOwnScopeSelector(
    (data: Record<string, unknown>) => ({
      fieldSources: data.fieldSources,
      designer: data.designer,
      selectionTarget: data.selectionTarget,
    }),
    (a, b) =>
      a.fieldSources === b.fieldSources &&
      a.designer === b.designer &&
      a.selectionTarget === b.selectionTarget,
  );

  const schemaFieldSources = props.props['fieldSources'] as FieldSourceSnapshot[] | undefined;
  const scopeFieldSources = Array.isArray(scopeData.fieldSources)
    ? (scopeData.fieldSources as FieldSourceSnapshot[])
    : [];
  const fieldSources: FieldSourceSnapshot[] =
    Array.isArray(schemaFieldSources) && schemaFieldSources.length > 0
      ? schemaFieldSources
      : scopeFieldSources;

  const designer = scopeData.designer as { documentName?: string; fieldCount?: number } | undefined;
  const selectionTarget = scopeData.selectionTarget as ReportSelectionTarget | undefined;

  const showHeader = props.props.showFieldSourceHeader !== false;
  const dragEnabled = props.props.dragEnabled !== false;
  const keyboardInsertEnabled = props.props.keyboardInsertEnabled !== false;
  const emptyLabel = String(props.props.emptyLabel ?? t('flux.reportDesigner.noFieldSources'));

  function createFieldPayload(source: FieldSourceSnapshot, field: FieldSourceSnapshot['groups'][number]['fields'][number]) {
    return {
      sourceId: source.id,
      fieldId: field.id,
      label: field.label,
      data: { ...field },
    };
  }

  function canInsertToSelection(target: ReportSelectionTarget | undefined) {
    return target != null && target.kind !== 'workbook';
  }

  async function handleKeyboardInsert(
    source: FieldSourceSnapshot,
    field: FieldSourceSnapshot['groups'][number]['fields'][number],
  ) {
    if (!canInsertToSelection(selectionTarget)) {
      return;
    }

    const resolved = actionScope?.resolve('report-designer:dropFieldToTarget');
    if (!resolved) {
      return;
    }

    const fieldPayload = createFieldPayload(source, field);
    await resolved.provider.invoke(
      resolved.method,
      {
        field: fieldPayload,
        target: selectionTarget,
      },
      {
        runtime,
        scope: props.helpers.createScope(
          {
            field: fieldPayload,
            target: selectionTarget,
          },
          {
            scopeKey: `report-field-panel:${source.id}:${field.id}`,
            pathSuffix: `fieldPanel.${source.id}.${field.id}`,
          },
        ),
        actionScope,
      },
    );
  }

  return (
    <section
      className={cn('nop-report-designer', props.meta.className)}
      data-slot="report-field-panel-shell"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      {hasRendererSlotContent(titleContent) ? (
        <header data-slot="report-designer-section-header">
          <h3>{titleContent}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : designer?.documentName ? (
        <header data-slot="report-designer-section-header">
          <h3>{designer.documentName}</h3>
          <span>{designer?.fieldCount ?? getFieldCount(fieldSources)} fields</span>
        </header>
      ) : null}
      {fieldSources.length === 0 ? (
        <p data-slot="report-designer-empty">{emptyLabel}</p>
      ) : (
        <div data-slot="report-field-panel-stack">
          {fieldSources.map((source) => (
            <section key={source.id} data-slot="report-field-panel-source">
              {showHeader ? (
                <h4 data-slot="report-field-panel-source-label">{source.label}</h4>
              ) : null}
              {source.groups.map((group) => (
                <div key={group.id} data-slot="report-field-panel-group">
                  {showHeader ? <strong>{group.label}</strong> : null}
                  <ul data-slot="report-field-panel-items">
                    {group.fields.map((field) => (
                      <li
                        key={field.id}
                        draggable={dragEnabled}
                        data-field-id={field.id}
                        data-field-source-id={source.id}
                        data-slot="report-field-panel-item"
                      >
                        <span data-slot="report-field-panel-item-label">{field.label}</span>
                        {keyboardInsertEnabled ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            disabled={!canInsertToSelection(selectionTarget)}
                            aria-label={t('flux.reportDesigner.insertFieldToSelection', {
                              field: field.label,
                            })}
                            onClick={() => {
                              void handleKeyboardInsert(source, field);
                            }}
                          >
                            {t('flux.reportDesigner.insert')}
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
