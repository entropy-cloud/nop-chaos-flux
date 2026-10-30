import type { ComponentType } from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { SchemaPage } from './schema-page';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages-model';
import { PihWorkspaceHost } from './pih-workspace-host';
import { WmsPdaReceivingHost } from './replication/wms-pda-receiving-host';

export interface ComplexPageComponentProps {
  /** The shared showcase env (fetcher/notify/confirm/dict). */
  env: RendererEnv;
}

export const COMPLEX_PAGE_REGISTRY: Record<string, ComponentType<ComplexPageComponentProps>> = {
  ...(Object.fromEntries(
    COMPLEX_PAGE_ENTRIES.map((entry) => [
      entry.id,
      (props: ComplexPageComponentProps) => <SchemaPage pageId={entry.id} {...props} />,
    ]),
  ) as Record<string, ComponentType<ComplexPageComponentProps>>),
  // pih-workspace needs host-owned AI conversation state (useConversation), so
  // it overrides the generic SchemaPage entry with a dedicated host.
  'pih-workspace': PihWorkspaceHost,
  // wms-pda-receiving is a mobile-form page (D1 §0 决策① 例外注): it renders
  // through the 375×667 mobile-canvas host instead of the desktop shell.
  'wms-pda-receiving': WmsPdaReceivingHost,
};

