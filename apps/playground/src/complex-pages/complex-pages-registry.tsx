import type { ComponentType } from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { SchemaPage } from './schema-page';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages-model';
import { PihWorkspaceHost } from './pih-workspace-host';

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
};

