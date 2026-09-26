import { useMemo, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps, SchemaValue } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { useIsMobile, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { choiceSingleAdapter } from '../input-choice-renderers.js';
import { useFormFieldFromProps } from '../../field-utils.js';
import type { InputCitySchema } from '../../schemas-org.js';
import { isNodeSelectable, normalizeOrgNodes, type OrgNode } from './org-data-protocol.js';
import { RegionColumns } from './region-columns.js';
import { RegionWheel } from './region-wheel.js';
import { useOrgData } from './use-org-data.js';

const REGION_METHODS = ['clear', 'reset', 'focus', 'open'] as const;

/**
 * Region cascade picker core (plan 506). Consumes the shared org data
 * surface (useOrgData) — no second parsing/termination/injection
 * implementation (protocol §9). Trigger shows the selected node's path text
 * from three sources (plan 506 回显路径机制裁决): the in-session navigation
 * path table, `extra.path` carried on the resolved node, or the raw value.
 */
export function InputCityRenderer(props: RendererComponentProps<InputCitySchema>) {
  const name = String(props.props.name ?? '');
  const selectableTypes = Array.isArray(props.props.selectableTypes)
    ? props.props.selectableTypes.map((entry) => String(entry))
    : [];
  const placeholder = String(props.props.placeholder ?? '') || t('flux.form.regionPlaceholder');
  const staticOptions = useMemo(() => normalizeOrgNodes(props.props.options), [props.props.options]);
  const isMobile = useIsMobile();

  const { value, handlers, presentation, scope } = useFormFieldFromProps(props, {
    adapter: choiceSingleAdapter,
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [path, setPath] = useState<OrgNode[]>([]);
  const [pathTable, setPathTable] = useState<Record<string, OrgNode[]>>({});
  const data = useOrgData({
    helpers: props.helpers,
    scope,
    options: staticOptions,
    // InputCitySchema narrows via Omit<OrgSelectSchema,…>, which collapses the
    // resolved-props index signature — cast the action-typed props at the seam.
    sourceChildren: props.props.sourceChildren as ActionSchema | undefined,
    sourceResolve: props.props.sourceResolve as ActionSchema | undefined,
    pageSize: typeof props.props.pageSize === 'number' ? props.props.pageSize : undefined,
    extraParams: props.props.extraParams as Record<string, SchemaValue> | undefined,
    panelOpen,
    selectedValues: value,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-city',
    cid: props.meta.cid,
    methods: REGION_METHODS,
    getFocusTarget: () =>
      rootRef.current?.querySelector<HTMLElement>('[data-slot="region-trigger"]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(value);
      return { fellBackToDefault: false };
    },
    openMenu: () => setPanelOpen(true),
  });

  const commit = (node: OrgNode, selectedPath: OrgNode[]) => {
    if (!isNodeSelectable(node, selectableTypes)) {
      return;
    }
    setPathTable((previous) => ({ ...previous, [node.id]: selectedPath }));
    handlers.onChange(node.id);
    setPanelOpen(false);
  };

  const valueKey = value == null ? '' : String(value);
  const pathNodes = pathTable[valueKey] ?? resolvedExtraPath(data.echoPool, valueKey);
  const pathText = pathNodes.map((node) => node.name).join(' / ');
  const triggerText = pathText || valueKey;

  return (
    <div
      ref={rootRef}
      className={cn('nop-input-city-field', props.meta.className)}
      data-invalid={presentation.showError ? true : undefined}
    >
      <button
        type="button"
        data-slot="region-trigger"
        data-testid={props.meta.testid}
        data-empty={valueKey ? undefined : true}
        aria-label={String(props.props.label ?? name) || placeholder}
        disabled={!presentation.interactive}
        className="flex w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => presentation.interactive && setPanelOpen(!panelOpen)}
      >
        <span className="truncate" data-slot="region-value" data-value={valueKey || undefined}>
          {triggerText || <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        {props.props.clearable === true && valueKey && presentation.interactive ? (
          <span
            role="button"
            tabIndex={0}
            data-slot="region-clear"
            aria-label={t('flux.form.orgClear')}
            className="px-1 text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              handlers.onChange(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation();
                handlers.onChange(undefined);
              }
            }}
          >
            ✕
          </span>
        ) : null}
      </button>
      {isMobile ? (
        <RegionWheel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          data={data}
          staticOptions={staticOptions}
          path={path}
          interactive={presentation.interactive}
          title={placeholder}
          onPathChange={setPath}
          onCommit={commit}
        />
      ) : panelOpen ? (
        <div className="relative">
          <div
            role="button"
            tabIndex={-1}
            aria-label={t('flux.form.orgPanelClose')}
            className="fixed inset-0 z-40"
            data-slot="region-backdrop"
            onClick={() => setPanelOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setPanelOpen(false);
              }
            }}
          />
          <div
            className="absolute z-50 mt-1 flex w-[33rem] rounded-md border bg-popover p-1 shadow-md"
            data-slot="region-panel"
          >
            <RegionColumns
              data={data}
              staticOptions={staticOptions}
              path={path}
              interactive={presentation.interactive}
              onCommit={commit}
              onPathChange={setPath}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Protocol §3 `extra` on-demand read: optional provider-provided path chain (ancestors → self). */
function resolvedExtraPath(echoPool: OrgNode[], valueKey: string): OrgNode[] {
  if (!valueKey) {
    return [];
  }
  const node = echoPool.find((entry) => entry.id === valueKey);
  const path = node?.extra?.path;
  return Array.isArray(path) ? (path as OrgNode[]) : [];
}
