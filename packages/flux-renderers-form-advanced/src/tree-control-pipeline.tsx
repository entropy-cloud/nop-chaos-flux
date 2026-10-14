import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { Spinner } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { resolveSourceErrorRefs, useFormFieldFromProps } from '@nop-chaos/flux-renderers-form';
import type { InputTreeSchema, TreeSelectSchema } from '@nop-chaos/flux-renderers-form';
import {
  buildTreeOptionMetaList,
  getTreeOptionConfig,
  type TreeOptionMeta,
} from './tree-options.js';
import {
  getSourceErrorMessage,
  isMultipleMode,
  useTreeLazyChildren,
  useTreeRemoteSearch,
} from './tree-control-controllers.js';
import { TreeOptionList } from './tree-option-list.js';

/**
 * CX-13 (plan 591) Leg B — shared data pipeline for the input-tree /
 * tree-select twin renderers (plan 589 G1b left them as verbatim twins).
 *
 * Absorption scope (plan R1 m1): the head data pipeline, the TreeOptionList
 * prop block, and the trailing source-error/loading fragment ONLY. The
 * divergent render structures stay per-site in `tree-controls.tsx`:
 * the input-tree clear row, the tree-select popover/sheet/mobile trigger
 * (+ `useTreeSelectController`), the per-handle `getFocusTarget` selector
 * variants, the handle type ids, and the `searchLabel` fallback positions.
 */

interface TreeControlSourceFeedbackInput {
  slotPrefix: 'input-tree' | 'tree-select';
  sourceErrorRefs: ReturnType<typeof resolveSourceErrorRefs>;
  sourceError: string | undefined;
  loadingId: string | undefined;
  loading: boolean;
}

function TreeControlSourceFeedback(input: TreeControlSourceFeedbackInput) {
  if (input.sourceErrorRefs.spanProps) {
    return (
      <span {...input.sourceErrorRefs.spanProps} data-slot={`${input.slotPrefix}-source-error`}>
        {input.sourceError}
      </span>
    );
  }
  if (input.loading) {
    return (
      <span
        id={input.loadingId}
        data-slot={`${input.slotPrefix}-source-loading`}
        role="status"
        aria-live="polite"
        className="flex items-center gap-1.5"
      >
        <Spinner className="size-4" aria-hidden="true" />
        <span>{t('flux.common.loading')}</span>
      </span>
    );
  }
  return null;
}

export function useTreeControlPipeline(input: {
  props: RendererComponentProps<InputTreeSchema> | RendererComponentProps<TreeSelectSchema>;
  /** Per-site display label (label ?? name with renderer-specific fallback). */
  fieldLabel: string;
  /** Per-site search placeholder (`${t('flux.common.search')} …` composition). */
  searchLabel: string;
  /** Slot prefix for the shared source-error/loading fragment markers. */
  slotPrefix: 'input-tree' | 'tree-select';
  /**
   * Invoked after a non-multiple selection change commits — the tree-select
   * site closes its popover/sheet here (G2-R2-视角6-01, plan 486 Phase 2);
   * multiple mode stays open until the sheet footer confirm button.
   */
  onSinglePickClose?: () => void;
}) {
  const { props } = input;
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldFromProps(
    props as RendererComponentProps<InputTreeSchema>,
  );
  const multiple = isMultipleMode(props.props.treeMode);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const enableNodePath = props.props.enableNodePath === true;
  const {
    childrenKey,
    labelField,
    valueField,
    onlyLeaf,
    showPathLabel,
    options: treeOptions,
  } = props.props as InputTreeSchema;
  // H8: getTreeOptionConfig returns a new object each call; without memoizing,
  // the new `config` identity is a dep of useTreeRemoteSearch's 300ms debounce
  // effect, so every re-render reset the timer and remote search never fired.
  const treeConfig = React.useMemo(
    () => getTreeOptionConfig({ childrenKey, labelField, valueField, onlyLeaf, showPathLabel, pathSeparator: props.props.pathSeparator }),
    [childrenKey, labelField, valueField, onlyLeaf, showPathLabel, props.props.pathSeparator],
  );
  const baseOptions = React.useMemo(
    () => buildTreeOptionMetaList(treeOptions, treeConfig),
    [treeOptions, treeConfig],
  );
  const valuePathMap = React.useMemo(() => {
    const map = new Map<unknown, string>();
    function walk(options: TreeOptionMeta[]) {
      for (const opt of options) {
        map.set(opt.value, opt.valuePath);
        if (opt.children.length > 0) {
          walk(opt.children);
        }
      }
    }
    walk(baseOptions);
    return map;
  }, [baseOptions]);
  const [query, setQuery] = React.useState('');
  const remoteSearchActive =
    props.props.searchable === true && Boolean(props.props.searchSource);
  const lazyEnabled = Boolean(props.props.childrenSource);
  const interactionDisabled =
    presentation.effectiveDisabled || presentation.readOnly || optionsSourceState?.loading === true;
  const { remoteOptions, loading: searchLoading, error: searchError } = useTreeRemoteSearch({
    query,
    searchSource: props.props.searchSource,
    searchable: props.props.searchable === true,
    disabled: interactionDisabled,
    helpers: props.helpers,
    config: treeConfig,
  });
  const {
    options: lazyOptions,
    nodeStates: lazyNodeStates,
    loadChildren: lazyLoadChildren,
    retryLoadChildren: lazyRetryChildren,
  } = useTreeLazyChildren({
    baseOptions,
    childrenSource: props.props.childrenSource,
    helpers: props.helpers,
    config: treeConfig,
    enabled: lazyEnabled && !remoteSearchActive,
  });
  const options = remoteSearchActive
    ? remoteOptions ?? baseOptions
    : lazyEnabled
      ? lazyOptions
      : baseOptions;
  const sourceError = getSourceErrorMessage(optionsSourceState) ?? searchError;
  // plan 589 G1b ruling (a): this site's id strings stay name-only (VERBATIM,
  // host-visible contract) — no cid qualification here, unlike the choice sites.
  const sourceErrorRefs = resolveSourceErrorRefs({ instanceKey: name, errorMessage: sourceError });
  const loadingId = name ? `${name}-source-loading` : undefined;
  const sourceLoading = optionsSourceState?.loading === true || searchLoading;

  const optionListElement = (
    <TreeOptionList
      options={options}
      value={value}
      multiple={multiple}
      cascade={props.props.cascade === true}
      onlyLeaf={props.props.onlyLeaf === true}
      showPathLabel={props.props.showPathLabel === true}
      searchable={props.props.searchable === true}
      disabled={interactionDisabled}
      onChange={(nextValue) => {
        if (enableNodePath) {
          if (multiple && Array.isArray(nextValue)) {
            handlers.onChange(nextValue.map((v: unknown) => valuePathMap.get(v) ?? String(v)));
          } else {
            handlers.onChange(valuePathMap.get(nextValue) ?? String(nextValue));
          }
        } else {
          handlers.onChange(nextValue);
        }
        if (!multiple) {
          input.onSinglePickClose?.();
        }
      }}
      ariaLabel={input.fieldLabel}
      searchLabel={input.searchLabel}
      describedBy={sourceErrorRefs.describedby}
      loadingDescriptionId={loadingId}
      loading={sourceLoading}
      errorMessage={sourceErrorRefs.errormessage}
      invalid={Boolean(sourceError)}
      virtualThreshold={props.props.virtualThreshold}
      remoteSearch={remoteSearchActive}
      onQueryChange={setQuery}
      lazyNodeStates={lazyNodeStates}
      onLazyExpand={lazyLoadChildren}
      onLazyRetry={lazyRetryChildren}
    />
  );

  const sourceFeedbackElement = (
    <TreeControlSourceFeedback
      slotPrefix={input.slotPrefix}
      sourceErrorRefs={sourceErrorRefs}
      sourceError={sourceError}
      loadingId={loadingId}
      loading={sourceLoading}
    />
  );

  return {
    name,
    value,
    handlers,
    presentation,
    multiple,
    treeConfig,
    baseOptions,
    lazyEnabled,
    remoteSearchActive,
    options,
    optionListDisabled: interactionDisabled,
    optionListElement,
    sourceError,
    sourceErrorAriaDescribedBy: sourceErrorRefs.describedby,
    sourceErrorAriaErrorMessage: sourceErrorRefs.errormessage,
    sourceFeedbackElement,
    loadingId,
    sourceLoading,
  };
}
