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
      <InspectorField label="Id">
        <Input readOnly value={selectedPanel.id} data-testid="inspector-id" />
      </InspectorField>
      <InspectorField label="Type">
        <NativeSelect
          value={selectedPanel.type}
          data-testid="inspector-type"
          onChange={(event) => updatePanel(core, selectedPanel.id, { type: event.target.value })}
        >
          {DASHBOARD_PALETTE_TYPES.filter((entry) => runtime.registry.has(entry.type)).map(
            (entry) => (
              <option key={entry.type} value={entry.type}>
                {entry.label}
              </option>
            ),
          )}
        </NativeSelect>
      </InspectorField>
      <InspectorField label="Title">
        <Input
          value={selectedPanel.title ?? ''}
          data-testid="inspector-title"
          onChange={(event) => updatePanel(core, selectedPanel.id, { title: event.target.value })}
        />
      </InspectorField>
      <div className="grid grid-cols-2 gap-2">
        <InspectorField label="X">
          <NumberInput
            testId="inspector-x"
            value={selectedPanel.x}
            onChange={(value) => updatePanel(core, selectedPanel.id, { x: value })}
          />
        </InspectorField>
        <InspectorField label="Y">
          <NumberInput
            testId="inspector-y"
            value={selectedPanel.y}
            onChange={(value) => updatePanel(core, selectedPanel.id, { y: value })}
          />
        </InspectorField>
        <InspectorField label="W">
          <NumberInput
            testId="inspector-w"
            value={selectedPanel.w}
            onChange={(value) => updatePanel(core, selectedPanel.id, { w: value })}
          />
        </InspectorField>
        <InspectorField label="H">
          <NumberInput
            testId="inspector-h"
            value={selectedPanel.h}
            onChange={(value) => updatePanel(core, selectedPanel.id, { h: value })}
          />
        </InspectorField>
      </div>
      <InspectorField label="Source (data expression)">
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
      <InspectorField label="Props (JSON)">
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
  const current = draft ?? (value !== undefined ? JSON.stringify(value, null, 2) : '');
  return (
    <>
      <Textarea
        data-testid="inspector-props"
        rows={6}
        value={current}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="inspector-props-reset"
          onClick={() => setDraft(null)}
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
              onChange(parsed);
              setDraft(null);
            } catch {
              // invalid JSON: keep draft, do not touch the panel
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
