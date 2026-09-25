import { useMemo, useRef, useState } from 'react';
import { type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { choiceSingleAdapter, checkboxGroupAdapter } from '../input-choice-renderers.js';
import { useFormFieldFromProps } from '../../field-utils.js';
import type { OrgSelectSchema } from '../../schemas-org.js';
import { isNodeSelectable, normalizeOrgNodes, type OrgNode } from './org-data-protocol.js';
import { OrgSelectPanel } from './org-select-panel.js';
import { useOrgData } from './use-org-data.js';

const ORG_SELECT_METHODS = ['clear', 'reset', 'focus', 'open'] as const;

/**
 * Shared renderer core for user-select / department-select (plan 505). The
 * two types differ only in presentation defaults — selectableTypes and the
 * placeholder — everything else (data plane via useOrgData, panel, value
 * semantics) is the single shared implementation (protocol §9).
 */
export function OrgSelectRendererControl(input: {
  props: RendererComponentProps<OrgSelectSchema>;
  rendererType: 'user-select' | 'department-select';
  defaultSelectableTypes: string[];
  fallbackPlaceholder: string;
}) {
  const { props, rendererType, defaultSelectableTypes, fallbackPlaceholder } = input;
  const name = String(props.props.name ?? '');
  const multiple = props.props.multiple === true;
  const searchable = props.props.searchable !== false;
  const clearable = props.props.clearable === true;
  const selectableTypes = Array.isArray(props.props.selectableTypes)
    ? props.props.selectableTypes.map((entry) => String(entry))
    : defaultSelectableTypes;
  const placeholder = String(props.props.placeholder ?? '') || fallbackPlaceholder;

  const staticOptions: OrgNode[] = useMemo(
    () => normalizeOrgNodes(props.props.options),
    [props.props.options],
  );

  const { value, handlers, presentation, scope } = useFormFieldFromProps(props, {
    adapter: multiple ? checkboxGroupAdapter : choiceSingleAdapter,
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const data = useOrgData({
    helpers: props.helpers,
    scope,
    options: staticOptions,
    sourceChildren: props.props.sourceChildren,
    sourceSearch: props.props.sourceSearch,
    sourceResolve: props.props.sourceResolve,
    pageSize: typeof props.props.pageSize === 'number' ? props.props.pageSize : undefined,
    extraParams: props.props.extraParams,
    searchMergeMode: props.props.searchMergeMode === 'replace' ? 'replace' : 'append',
    panelOpen,
    selectedValues: value,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  useInputComponentHandle({
    id: props.id,
    name,
    type: rendererType,
    cid: props.meta.cid,
    methods: ORG_SELECT_METHODS,
    getFocusTarget: () =>
      rootRef.current?.querySelector<HTMLElement>('[data-slot="org-select-trigger"]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(value);
      return { fellBackToDefault: false };
    },
    openMenu: () => setPanelOpen(true),
  });

  const toggleNode = (node: OrgNode) => {
    if (!isNodeSelectable(node, selectableTypes)) {
      return;
    }
    if (multiple) {
      const current = Array.isArray(value) ? value.map((entry) => String(entry)) : [];
      const next = current.includes(node.id)
        ? current.filter((entry) => entry !== node.id)
        : [...current, node.id];
      handlers.onChange(next);
      return;
    }
    handlers.onChange(node.id);
    setPanelOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={cn('nop-org-select-field', props.meta.className)}
      data-invalid={presentation.showError ? true : undefined}
      data-multiple={multiple ? true : undefined}
    >
      <OrgSelectPanel
        value={value}
        multiple={multiple}
        searchable={searchable}
        clearable={clearable}
        interactive={presentation.interactive}
        selectableTypes={selectableTypes}
        placeholder={placeholder}
        ariaLabel={String(props.props.label ?? name) || placeholder}
        staticOptions={staticOptions}
        data={data}
        panelOpen={panelOpen}
        onPanelOpenChange={setPanelOpen}
        onToggleNode={toggleNode}
        onClear={() => handlers.onChange(undefined)}
        testid={props.meta.testid}
      />
    </div>
  );
}
