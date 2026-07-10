import type { ComponentType } from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { SchemaPage } from './schema-page';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages-model';

export interface ComplexPageComponentProps {
  /** The shared showcase env (fetcher/notify/confirm/dict). */
  env: RendererEnv;
}

export const COMPLEX_PAGE_REGISTRY: Record<string, ComponentType<ComplexPageComponentProps>> =
  Object.fromEntries(
    COMPLEX_PAGE_ENTRIES.map((entry) => [
      entry.id,
      (props: ComplexPageComponentProps) => <SchemaPage pageId={entry.id} {...props} />,
    ]),
  ) as Record<string, ComponentType<ComplexPageComponentProps>>;

