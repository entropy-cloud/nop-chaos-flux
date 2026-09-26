import { Fragment, useState } from 'react';
import { getIn, toRecord } from '@nop-chaos/flux-core';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { unwrapPreservedLiteral, useRenderScope } from '@nop-chaos/flux-react';
import type { RendererRenderOutput } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@nop-chaos/ui';
import type { ResizablePanelSchema, ResizableSchema } from './schemas.js';

export interface ResizableRendererProps extends RendererComponentProps<ResizableSchema> {}

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

function clampPercent(value: unknown): string | undefined {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 && n < 100 ? `${n}%` : undefined;
}

/**
 * Normalize a persisted size array into percent strings for seeding. Returns
 * null when the stored value is unusable (wrong shape/length or all-invalid
 * entries) so callers fall back to schema defaultSize.
 */
export function normalizePersistedSizes(stored: unknown, panelCount: number): (string | undefined)[] | null {
  if (!Array.isArray(stored) || stored.length !== panelCount) return null;
  const normalized = stored.map((value) => clampPercent(value));
  return normalized.every((value) => value === undefined) ? null : normalized;
}

/**
 * L4.6 resizable layout (G-J): schema-driven split panes over the ui
 * react-resizable-panels wrapper. Panels render their `body` schema; a
 * `persistStatePath` seeds sizes on mount (corrupt values fall back to
 * `defaultSize`) and receives the size array after each drag settle
 * (adjudication §2.2 — schema min/max map to the wrapper's minSize/maxSize,
 * the settle callback to the wrapper's onLayoutChanged).
 */
export function ResizableRenderer(props: ResizableRendererProps) {
  const schemaProps = props.props;
  const scope = useRenderScope();
  const panels = (schemaProps.panels ?? []) as (ResizablePanelSchema & {
    bodyRegionKey?: string;
  })[];
  const persistStatePath = schemaProps.persistStatePath;

  const [seededSizes] = useState<(string | undefined)[] | null>(() => {
    if (!persistStatePath || !scope || panels.length === 0) return null;
    const stored = getIn(toRecord(scope.readVisible?.() ?? {}), persistStatePath);
    return normalizePersistedSizes(stored, panels.length);
  });

  if (panels.length === 0) {
    return null;
  }


  const direction = schemaProps.direction === 'vertical' ? 'vertical' : 'horizontal';

  return (
    // The panels library overwrites data-testid/id on its group element with a
    // generated id, so the renderer meta attrs live on this outer div.
    <div
      data-slot="resizable-root"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      className={cn('h-full', props.meta.className)}
    >
    <ResizablePanelGroup
      orientation={direction}
      onLayoutChanged={(layout: Record<string, number>) => {
        if (persistStatePath && scope) {
          const total = Object.values(layout).reduce((sum, grow) => sum + grow, 0);
          scope.merge({
            [persistStatePath]: Object.values(layout).map((grow) =>
              total > 0 ? Math.round((grow / total) * 1000) / 10 : grow,
            ),
          });
        }
      }}
    >
      {panels.map((entry, index) => {
        const panelKey = String(unwrapPreservedLiteral(entry.key) ?? entry.key ?? `panel-${index}`);
        const defaultSizeRaw = unwrapPreservedLiteral(entry.defaultSize);
        const minRaw = unwrapPreservedLiteral(entry.min);
        const maxRaw = unwrapPreservedLiteral(entry.max);
        const seeded = seededSizes?.[index];
        const defaultSize = clampPercent(seeded) ?? clampPercent(defaultSizeRaw);
        const bodyRegion = typeof entry.bodyRegionKey === 'string' ? props.regions[entry.bodyRegionKey] : undefined;
        const bodyContent = bodyRegion
          ? asReactNode(bodyRegion.render({ pathSuffix: `panels/${panelKey}` }))
          : null;
        return (
          <Fragment key={panelKey}>
            {index > 0 ? (
              <ResizableHandle
                withHandle
                aria-label={t('flux.layout.resizeHandle')}
                data-slot="resizable-panel-handle"
              />
            ) : null}
            <ResizablePanel
              id={panelKey}
              data-panel-key={panelKey}
              defaultSize={defaultSize}
              minSize={clampPercent(minRaw)}
              maxSize={clampPercent(maxRaw)}
            >
              {bodyContent}
            </ResizablePanel>
          </Fragment>
        );
      })}
    </ResizablePanelGroup>
    </div>
  );
}
