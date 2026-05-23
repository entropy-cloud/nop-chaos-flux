// @vitest-environment happy-dom

import React from 'react';
import { afterEach, beforeEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createDefaultRegistry,
  createSchemaRenderer,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  defineReportDesignerPageSchema,
  registerReportDesignerRenderers,
} from './index.js';

export const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

export const actionButtonRenderer: RendererDefinition = {
  type: 'action-button',
  component: (props) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

export const textRenderer: RendererDefinition = {
  type: 'text',
  component: (props) => <span>{String(props.props.text ?? '')}</span>,
};

export const pageRenderer: RendererDefinition = {
  type: 'page',
  component: (props) => <section>{props.regions.body?.render() as React.ReactNode}</section>,
  fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
};

function ReportRuntimeDirtyProbe() {
  const dirty = useScopeSelector((data: any) => data.runtime?.dirty);
  return <span data-testid="report-runtime-dirty">{String(Boolean(dirty))}</span>;
}

export const reportRuntimeDirtyProbeRenderer: RendererDefinition = {
  type: 'report-runtime-dirty-probe',
  component: ReportRuntimeDirtyProbe,
};

function ReportTargetKindProbe() {
  const targetKind = useScopeSelector((data: any) => data.selectionTarget?.kind ?? '');
  return <span data-testid="report-target-kind">{String(targetKind)}</span>;
}

export const reportTargetKindProbeRenderer: RendererDefinition = {
  type: 'report-target-kind-probe',
  component: ReportTargetKindProbe,
};

function ReportStatusProbe() {
  const status = useScopeSelector((data: any) => data.reportStatus);
  return (
    <span data-testid="report-status">
      {status
        ? `${status.kind}:${status.fieldSourceCount}:${status.dirty ? 'dirty' : 'clean'}`
        : ''}
    </span>
  );
}

export const reportStatusProbeRenderer: RendererDefinition = {
  type: 'report-status-probe',
  component: ReportStatusProbe,
};

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

export function createRuntimeConfig(overrides?: Partial<ReportDesignerConfig>): ReportDesignerConfig {
  return {
    kind: 'report-template',
    ...(overrides ?? {}),
  };
}

export function createReportDesignerRegistry(extraRenderers: RendererDefinition[] = []) {
  const registry = createDefaultRegistry([
    pageRenderer,
    actionButtonRenderer,
    textRenderer,
    reportRuntimeDirtyProbeRenderer,
    reportTargetKindProbeRenderer,
    reportStatusProbeRenderer,
    ...extraRenderers,
  ]);
  registerReportDesignerRenderers(registry);
  return registry;
}

export function renderReportDesignerPage(input: {
  document?: any;
  config?: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: any;
  toolbar?: any;
  inspector?: any;
  registry?: ReturnType<typeof createReportDesignerRegistry>;
  env?: RendererEnv;
}) {
  const spreadsheet = createEmptyDocument('page-renderer-report-designer');
  const document =
    input.document ?? createReportTemplateDocument(spreadsheet, 'Page Renderer Report');
  const schema = defineReportDesignerPageSchema({
    type: 'report-designer-page',
    document,
    config: input.config ?? createRuntimeConfig(),
    profile: input.profile,
    adapters: input.adapters,
    toolbar: input.toolbar,
    inspector: input.inspector,
  });

  const registry = input.registry ?? createReportDesignerRegistry();
  const SchemaRenderer = createSchemaRenderer();

  render(
    <SchemaRenderer
      schemaUrl="test://report/page-renderer"
      schema={schema}
      env={input.env ?? env}
      registry={registry}
      formulaCompiler={createFormulaCompiler()}
      data={{}}
    />,
  );
}
