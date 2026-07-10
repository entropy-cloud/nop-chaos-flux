import { useMemo } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { ShowcaseSchemaHost } from './shared/render-host';
import { PageFrame } from './shared/page-frame';
import { PAGE_DATA } from './page-data';

// Safelist: Tailwind classes used in JSON page-schemas (not auto-scanned)
// tw: bg-blue-500 bg-emerald-500 bg-violet-500 bg-amber-500 bg-cyan-500 bg-rose-500

const pageSchemas = import.meta.glob('./page-schemas/*.json', { eager: true });

const SCHEMA_CACHE: Record<string, SchemaInput> = {};
for (const [path, mod] of Object.entries(pageSchemas)) {
  const match = path.match(/\/([^/]+)\.json$/);
  if (match) SCHEMA_CACHE[match[1]] = (mod as { default: SchemaInput }).default;
}

interface SchemaPageProps {
  pageId: string;
  env: RendererEnv;
}

export function SchemaPage({ pageId, env }: SchemaPageProps) {
  const schema = useMemo(() => SCHEMA_CACHE[pageId], [pageId]);
  const data = useMemo(() => PAGE_DATA[pageId], [pageId]);

  if (!schema) {
    return (
      <PageFrame testid={`${pageId}-frame`}>
        <div className="p-8 text-center text-muted-foreground">
          Schema not found for page: {pageId}
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame testid={`${pageId}-frame`}>
      <ShowcaseSchemaHost
        schemaUrl={`showcase://${pageId}/page`}
        schema={schema}
        env={env}
        data={data}
      />
    </PageFrame>
  );
}
