import React, { useState } from 'react';
import type { EditorCore } from '@nop-chaos/editor-core';
import { useRendererRuntime } from '@nop-chaos/flux-react';
import { Button, Input, Label, NativeSelect, Textarea } from '@nop-chaos/ui';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import type { SchemaValue } from '@nop-chaos/flux-core';
import type { DashboardDocument } from './dashboard-domain-adapter.js';
import { DASHBOARD_PALETTE_TYPES } from './editor-palette.js';
import type { DashboardPanelSchema } from '../schemas.js';

type PanelPatch = Partial<
  Pick<DashboardPanelSchema, 'type' | 'title' | 'x' | 'y' | 'w' | 'h' | 'source' | 'props'>
>;

export interface EditorInspectorProps {
  core: EditorCore<DashboardDocument, unknown>;
  selection: readonly string[];
}

/**
 * inspector 面板（位置/尺寸/标题/type/props/source 编辑）。
 * 编辑经 `core.update` 写入会话（单次更新 = 单 undo 步）。
 */
export function EditorInspector({ core, selection }: EditorInspectorProps) {
  const runtime = useRendererRuntime();
  const { t } = useFluxTranslation();
  const working = core.getState().working;
  const selectedPanel = selection.length === 1 ? working.panels.find((p) => p.id === selection[0]) : undefined;
  // [G3-R2-视角4-02] one id per primary control so every InspectorField Label
  // is programmatically associated (htmlFor/id) instead of being loose text.
  const id = {
    panelId: React.useId(),
    panelType: React.useId(),
    panelTitle: React.useId(),
    posX: React.useId(),
    posY: React.useId(),
    width: React.useId(),
    height: React.useId(),
    source: React.useId(),
    props: React.useId(),
  };

  if (!selectedPanel) {
    return (
      <div data-slot="dashboard-editor-inspector" className="p-3">
        <p className="text-sm text-muted-foreground">
          {t('flux.dashboard.editor.selectHint')}
        </p>
      </div>
    );
  }

  return (
    <div
      data-slot="dashboard-editor-inspector"
      className="flex h-full flex-col gap-3 overflow-y-auto p-3"
    >
      <InspectorField label={t('flux.dashboard.editor.panelId')} htmlFor={id.panelId}>
        <Input readOnly value={selectedPanel.id} data-testid="inspector-id" id={id.panelId} />
      </InspectorField>
      <InspectorField label={t('flux.dashboard.editor.panelType')} htmlFor={id.panelType}>
        <NativeSelect
          value={selectedPanel.type}
          data-testid="inspector-type"
          id={id.panelType}
          onChange={(event) => updatePanel(core, selectedPanel.id, { type: event.target.value })}
        >
          {DASHBOARD_PALETTE_TYPES.filter((entry) => runtime.registry.has(entry.type)).map(
            (entry) => (
              <option key={entry.type} value={entry.type}>
                {t(entry.labelKey)}
              </option>
            ),
          )}
        </NativeSelect>
      </InspectorField>
      <InspectorField label={t('flux.dashboard.editor.panelTitle')} htmlFor={id.panelTitle}>
        <Input
          value={selectedPanel.title ?? ''}
          data-testid="inspector-title"
          id={id.panelTitle}
          onChange={(event) => updatePanel(core, selectedPanel.id, { title: event.target.value })}
        />
      </InspectorField>
      <div className="grid grid-cols-2 gap-2">
        <InspectorField label={t('flux.dashboard.editor.posX')} htmlFor={id.posX}>
          <NumberInput
            testId="inspector-x"
            inputId={id.posX}
            value={selectedPanel.x}
            min={0}
            onChange={(value) => updatePanel(core, selectedPanel.id, { x: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.posY')} htmlFor={id.posY}>
          <NumberInput
            testId="inspector-y"
            inputId={id.posY}
            value={selectedPanel.y}
            min={0}
            onChange={(value) => updatePanel(core, selectedPanel.id, { y: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.width')} htmlFor={id.width}>
          <NumberInput
            testId="inspector-w"
            inputId={id.width}
            value={selectedPanel.w}
            min={1}
            onChange={(value) => updatePanel(core, selectedPanel.id, { w: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.height')} htmlFor={id.height}>
          <NumberInput
            testId="inspector-h"
            inputId={id.height}
            value={selectedPanel.h}
            min={1}
            onChange={(value) => updatePanel(core, selectedPanel.id, { h: value })}
          />
        </InspectorField>
      </div>
      <InspectorField label={t('flux.dashboard.editor.source')} htmlFor={id.source}>
        <Input
          value={typeof selectedPanel.source === 'string' ? selectedPanel.source : ''}
          data-testid="inspector-source"
          id={id.source}
          placeholder="${sales}"
          onChange={(event) =>
            updatePanel(core, selectedPanel.id, {
              source: event.target.value === '' ? undefined : event.target.value,
            })
          }
        />
      </InspectorField>
      <InspectorField label={t('flux.dashboard.editor.props')} htmlFor={id.props}>
        <JsonPropsEditor
          value={selectedPanel.props}
          textareaId={id.props}
          onChange={(props) => updatePanel(core, selectedPanel.id, { props })}
        />
      </InspectorField>
    </div>
  );
}

function InspectorField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  /** [G3-R2-视角4-02] id of the field's primary control — Label ↔ control association. */
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  testId,
  inputId,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  testId: string;
  inputId?: string;
  /** [G3-R5-视角4-01] geometric floor — x/y ≥ 0, w/h ≥ 1. Values below are
   * clamped on entry (not silently written), so the inspector can never
   * produce a negative or zero-size panel the canvas math has to repair. */
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const effectiveValue = Number.isFinite(value) ? Math.max(min, value) : min;
  return (
    <Input
      type="number"
      data-testid={testId}
      id={inputId}
      value={draft}
      min={min}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) onChange(Math.max(min, Math.trunc(parsed)));
      }}
      onBlur={() => setDraft(String(effectiveValue))}
    />
  );
}

function JsonPropsEditor({
  value,
  textareaId,
  onChange,
}: {
  value: unknown;
  textareaId?: string;
  onChange: (value: SchemaValue | undefined) => void;
}) {
  const { t } = useFluxTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  // G3-视角4-03 (plan 485 Phase 2): invalid JSON no longer dies in an empty
  // catch — the apply button reports an inline, dismissible-by-retry error.
  const [invalid, setInvalid] = useState(false);
  const current = draft ?? (value !== undefined ? JSON.stringify(value, null, 2) : '');
  return (
    <>
      <Textarea
        data-testid="inspector-props"
        id={textareaId}
        rows={6}
        aria-invalid={invalid || undefined}
        value={current}
        onChange={(event) => setDraft(event.target.value)}
      />
      {invalid ? (
        <p
          data-testid="inspector-props-error"
          role="alert"
          className="text-xs text-destructive"
        >
          {t('flux.dashboard.editor.invalidJson')}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="inspector-props-reset"
          onClick={() => {
            setDraft(null);
            setInvalid(false);
          }}
        >
          {t('flux.dashboard.editor.reset')}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          data-testid="inspector-props-apply"
          onClick={() => {
            if (draft === null) return;
            try {
              const parsed = draft.trim() === '' ? undefined : (JSON.parse(draft) as SchemaValue);
              setInvalid(false);
              onChange(parsed);
              setDraft(null);
            } catch {
              // G3-视角4-03: keep the draft so the user can repair it, and
              // surface the failure inline.
              setInvalid(true);
            }
          }}
        >
          {t('flux.dashboard.editor.apply')}
        </Button>
      </div>
    </>
  );
}

function updatePanel(
  core: EditorCore<DashboardDocument, unknown>,
  panelId: string,
  patch: PanelPatch,
): void {
  core.update((doc) => ({
    panels: doc.panels.map((p) => (p.id === panelId ? { ...p, ...patch } : p)),
  }));
}
