import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { getIn, toRecord } from '@nop-chaos/flux-core';
import type {
  ComponentHandle,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import {
    asReactNode,
  unwrapBooleanLiteral,
  unwrapPreservedLiteral,
  useCurrentComponentRegistry,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@nop-chaos/ui';
import type { ResizablePanelSchema, ResizableSchema } from './schemas.js';

export interface ResizableRendererProps extends RendererComponentProps<ResizableSchema> {}

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

const RESIZABLE_PANEL_METHODS = ['collapse', 'expand', 'toggle'] as const;

export function createResizablePanelCapabilities(input: {
  getPanel: () => PanelImperativeHandle | null;
}) {
  return {
    hasMethod(method: string) {
      return (RESIZABLE_PANEL_METHODS as readonly string[]).includes(method);
    },
    listMethods() {
      return RESIZABLE_PANEL_METHODS as unknown as readonly string[];
    },
    invoke(method: string) {
      const api = input.getPanel();
      if (!api) {
        return { ok: false, error: new Error('Resizable panel instance is not mounted') };
      }
      switch (method) {
        case 'collapse': {
          if (api.isCollapsed()) {
            return { ok: true, skipped: true };
          }
          api.collapse();
          return { ok: true };
        }
        case 'expand': {
          if (!api.isCollapsed()) {
            return { ok: true, skipped: true };
          }
          api.expand();
          return { ok: true };
        }
        case 'toggle': {
          if (api.isCollapsed()) {
            api.expand();
          } else {
            api.collapse();
          }
          return { ok: true };
        }
        default:
          return {
            ok: false,
            error: new Error(`Unsupported resizable-panel method: ${method}`),
          };
      }
    },
  };
}

interface ResizablePanelEntryProps {
  entry: ResizablePanelSchema & { bodyRegionKey?: string };
  index: number;
  seededSize: string | undefined;
  regions: RendererComponentProps<ResizableSchema>['regions'];
  registerCollapsibleRef: (
    index: number,
    ref: React.RefObject<PanelImperativeHandle | null> | null,
  ) => void;
}

function ResizablePanelEntry(props: ResizablePanelEntryProps) {
  const { entry, index, seededSize, regions, registerCollapsibleRef } = props;
  const panelRef = useRef<PanelImperativeHandle | null>(null);

  const panelKey = String(unwrapPreservedLiteral(entry.key) ?? entry.key ?? `panel-${index}`);
  const defaultSizeRaw = unwrapPreservedLiteral(entry.defaultSize);
  const minRaw = unwrapPreservedLiteral(entry.min);
  const maxRaw = unwrapPreservedLiteral(entry.max);
  const collapsible = unwrapBooleanLiteral(entry.collapsible);
  const collapsedSizeRaw = unwrapPreservedLiteral(entry.collapsedSize);
  const defaultCollapsed = unwrapBooleanLiteral(entry.defaultCollapsed);
  const defaultSize = clampPercent(seededSize) ?? clampPercent(defaultSizeRaw);

  // Expose the collapsible panel's imperative API to the root handle.
  useEffect(() => {
    if (!collapsible) {
      return;
    }
    registerCollapsibleRef(index, panelRef);
    return () => registerCollapsibleRef(index, null);
  }, [collapsible, index, registerCollapsibleRef]);

  // defaultCollapsed: one-shot imperative collapse after mount (the
  // react-resizable-panels v4 API has no declarative defaultCollapsed).
  useEffect(() => {
    if (collapsible && defaultCollapsed) {
      panelRef.current?.collapse();
    }
    // mount-only by design — re-running would fight user drags.
  }, [collapsible, defaultCollapsed]);

  const bodyRegion = typeof entry.bodyRegionKey === 'string' ? regions[entry.bodyRegionKey] : undefined;
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
        panelRef={panelRef}
        defaultSize={defaultSize}
        minSize={clampPercent(minRaw)}
        maxSize={clampPercent(maxRaw)}
        collapsible={collapsible}
        collapsedSize={clampPercent(collapsedSizeRaw)}
      >
        {bodyContent}
      </ResizablePanel>
    </Fragment>
  );
}

/**
 * L4.6 resizable layout (G-J): schema-driven split panes over the ui
 * react-resizable-panels wrapper. Panels render their `body` schema; a
 * `persistStatePath` seeds sizes on mount (corrupt values fall back to
 * `defaultSize`) and receives the size array after each drag settle
 * (adjudication §2.2 — schema min/max map to the wrapper's minSize/maxSize,
 * the settle callback to the wrapper's onLayoutChanged).
 *
 * Collapsible panels (G-J m3): `collapsible` + `collapsedSize` snap the
 * panel to a slim strip when the handle is dragged below `min`;
 * `defaultCollapsed` collapses on mount; and the resizable root registers
 * a component handle (id = node `id`) so `component:collapse|expand|toggle`
 * actions drive the collapsible panel's imperative API — the same contract
 * family as dialog / drawer / palette surfaces (X1 Phase 3).
 */
export function ResizableRenderer(props: ResizableRendererProps) {
  const schemaProps = props.props;
  const scope = useRenderScope();
  const componentRegistry = useCurrentComponentRegistry();
  const panels = (schemaProps.panels ?? []) as (ResizablePanelSchema & {
    bodyRegionKey?: string;
  })[];
  const persistStatePath = schemaProps.persistStatePath;

  const collapsibleRefs = useRef<Record<number, React.RefObject<PanelImperativeHandle | null>>>({});
  const collapsiblePanelRef = useRef<PanelImperativeHandle | null>(null);

  const registerCollapsibleRef = useCallback(
    (index: number, ref: React.RefObject<PanelImperativeHandle | null> | null) => {
      if (ref) {
        collapsibleRefs.current[index] = ref;
      } else {
        delete collapsibleRefs.current[index];
      }
      // The root handle drives the last-registered collapsible panel.
      const entries = Object.values(collapsibleRefs.current);
      collapsiblePanelRef.current = entries[entries.length - 1]?.current ?? null;
    },
    [],
  );

  // Root component handle: component:collapse/expand/toggle on the resizable
  // node `id` drives the collapsible panel's imperative API. Built inside the
  // effect (ref reads are effect-time, per the tabs handle precedent) so hook
  // order stays stable and the ref is never read during render.
  useEffect(() => {
    if (!componentRegistry || !props.id) {
      return;
    }
    const rootHandle: ComponentHandle = {
      id: props.id,
      name: props.id,
      type: 'resizable',
      capabilities: createResizablePanelCapabilities({
        getPanel: () => collapsiblePanelRef.current,
      }),
    };
    return componentRegistry.register(rootHandle, { cid: props.meta.cid });
  }, [componentRegistry, props.id, props.meta.cid]);

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
      {panels.map((entry, index) => (
        <ResizablePanelEntry
          key={String(unwrapPreservedLiteral(entry.key) ?? entry.key ?? `panel-${index}`)}
          entry={entry}
          index={index}
          seededSize={seededSizes?.[index]}
          regions={props.regions}
          registerCollapsibleRef={registerCollapsibleRef}
        />
      ))}
    </ResizablePanelGroup>
    </div>
  );
}
