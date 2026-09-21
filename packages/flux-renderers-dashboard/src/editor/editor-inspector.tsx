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
      <InspectorField label={t('flux.dashboard.editor.panelId')}>
        <Input readOnly value={selectedPanel.id} data-testid="inspector-id" />
      </InspectorField>
      <InspectorField label={t('flux.dashboard.editor.panelType')}>
        <NativeSelect
          value={selectedPanel.type}
          data-testid="inspector-type"
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
      <InspectorField label={t('flux.dashboard.editor.panelTitle')}>
        <Input
          value={selectedPanel.title ?? ''}
          data-testid="inspector-title"
          onChange={(event) => updatePanel(core, selectedPanel.id, { title: event.target.value })}
        />
      </InspectorField>
      <div className="grid grid-cols-2 gap-2">
        <InspectorField label={t('flux.dashboard.editor.posX')}>
          <NumberInput
            testId="inspector-x"
            value={selectedPanel.x}
            onChange={(value) => updatePanel(core, selectedPanel.id, { x: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.posY')}>
          <NumberInput
            testId="inspector-y"
            value={selectedPanel.y}
            onChange={(value) => updatePanel(core, selectedPanel.id, { y: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.width')}>
          <NumberInput
            testId="inspector-w"
            value={selectedPanel.w}
            onChange={(value) => updatePanel(core, selectedPanel.id, { w: value })}
          />
        </InspectorField>
        <InspectorField label={t('flux.dashboard.editor.height')}>
          <NumberInput
            testId="inspector-h"
            value={selectedPanel.h}
            onChange={(value) => updatePanel(core, selectedPanel.id, { h: value })}
          />
        </InspectorField>
      </div>
      <InspectorField label={t('flux.dashboard.editor.source')}>
        <Input
          value={typeof selectedPanel.source === 'string' ? selectedPanel.source : ''}
          data-testid="inspector-source"
          placeholder="${sales}"
          onChange={(event) =>
            updatePanel(core, selectedPanel.id, {
              source: event.target.value === '' ? undefined : event.target.value,
            })
          }
        />
      </InspectorField>
      <InspectorField label={t('flux.dashboard.editor.props')}>
        <JsonPropsEditor
          value={selectedPanel.props}
          onChange={(props) => updatePanel(core, selectedPanel.id, { props })}
        />
      </InspectorField>
    </div>
  );
}

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  testId,
}: {
  value: number;
  onChange: (value: number) => void;
  testId: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const effectiveValue = Number.isFinite(value) ? value : 0;
  return (
    <Input
      type="number"
      data-testid={testId}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
      onBlur={() => setDraft(String(effectiveValue))}
    />
  );
}

function JsonPropsEditor({
  value,
  onChange,
}: {
  value: unknown;
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
