import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  useCurrentForm,
  useCurrentFormState,
  useRenderScope,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Checkbox, Label, cn, Input, Empty } from '@nop-chaos/ui';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import type { TransferSchema } from './composite-field/composite-schemas.js';
import { normalizeOptions, type NormalizedOption } from './option-normalize.js';
import {
  formFieldRules,
  shouldValidateOn,
  useFieldPresentation,
} from '@nop-chaos/flux-renderers-form';
import { useCurrentValidationScope } from '@nop-chaos/flux-react';

interface SelectedEntry {
  value: string | number | boolean;
  label: string;
}

const EMPTY_VALUES: unknown[] = [];

function toArrayValue(value: unknown): (string | number | boolean)[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string | number | boolean =>
        typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean',
    );
  }
  if (value === undefined || value === null || value === '') {
    return [];
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [value];
  }
  return [];
}

function buildSelectedEntries(
  selectedValues: (string | number | boolean)[],
  options: NormalizedOption[],
  valueIndex?: Map<unknown, NormalizedOption>,
): SelectedEntry[] {
  // O(S+N) via the prebuilt value index; the find-chain was O(S×N) per value
  // change (plan 2026-09-29-6 R2-P12).
  const index = valueIndex ?? new Map(options.map((option) => [option.value, option]));
  return selectedValues.map((value) => {
    const match = index.get(value);
    return {
      value,
      label: match ? match.label : typeof value === 'string' ? value : String(value),
    };
  });
}

/** Pane windowing gate (plan 2026-09-29-6): below this, all options mount. */
export const TRANSFER_PANE_VIRTUAL_THRESHOLD = 200;

export function TransferRenderer(props: RendererComponentProps<TransferSchema>) {
  const scope = useRenderScope();
  const currentForm = useCurrentForm();
  const validationOwner = useCurrentValidationScope();
  const name = String(props.props.name ?? '');
  const hasName = name.length > 0;
  const multiple = props.props.multiple !== false;
  const searchable = props.props.searchOnly === true ? true : props.props.searchable === true;
  const valueKey = typeof props.props.valueKey === 'string' ? props.props.valueKey : undefined;
  const labelKey = typeof props.props.labelKey === 'string' ? props.props.labelKey : undefined;
  const searchPlaceholder =
    typeof props.props.searchPlaceholder === 'string' ? props.props.searchPlaceholder : '';
  const checkAllEnabled = props.props.checkAll !== false;
  const clearable = props.props.clearable !== false;
  const selectTitle =
    typeof props.props.selectTitle === 'string' ? props.props.selectTitle : undefined;
  const resultTitle =
    typeof props.props.resultTitle === 'string' ? props.props.resultTitle : undefined;

  const presentation = useFieldPresentation(name, validationOwner, {
    disabled: props.props.disabled === true,
    required: props.props.required === true,
    readOnly: props.props.readOnly === true,
  });

  const formValue = useCurrentFormState(
    (state) =>
      currentForm && hasName ? (name ? getIn(state.values, name) : state.values) : undefined,
    Object.is,
    { enabled: Boolean(currentForm && hasName), path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) =>
      currentForm || !hasName ? undefined : name ? getIn(scopeData, name) : scopeData,
    Object.is,
    {
      enabled: Boolean(!currentForm && hasName),
      fallback: undefined,
      paths: hasName ? [name] : undefined,
    },
  );
  const rawFieldValue = React.useMemo(
    () => (currentForm ? formValue : scopeValue) ?? (multiple ? EMPTY_VALUES : undefined),
    [currentForm, formValue, scopeValue, multiple],
  );

  const options = React.useMemo(
    () => normalizeOptions(props.props.options, valueKey, labelKey),
    [props.props.options, valueKey, labelKey],
  );

  const selectedValues = React.useMemo(() => toArrayValue(rawFieldValue), [rawFieldValue]);
  const selectedSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const optionsByValue = React.useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );
  const selectedEntries = React.useMemo(
    () => buildSelectedEntries(selectedValues, options, optionsByValue),
    [selectedValues, options, optionsByValue],
  );

  const candidateOptions = React.useMemo(
    () => options.filter((option) => !selectedSet.has(option.value)),
    [options, selectedSet],
  );

  const [candidateQuery, setCandidateQuery] = React.useState('');
  const [selectedQuery, setSelectedQuery] = React.useState('');
  const [candidateChecked, setCandidateChecked] = React.useState<Set<string | number | boolean>>(
    new Set(),
  );
  const [selectedChecked, setSelectedChecked] = React.useState<Set<string | number | boolean>>(
    new Set(),
  );

  const filteredCandidates = React.useMemo(() => {
    if (!searchable || candidateQuery.trim() === '') {
      return candidateOptions;
    }
    const q = candidateQuery.trim().toLowerCase();
    return candidateOptions.filter((option) => option.label.toLowerCase().includes(q));
  }, [candidateOptions, candidateQuery, searchable]);

  const filteredSelected = React.useMemo(() => {
    if (!searchable || selectedQuery.trim() === '') {
      return selectedEntries;
    }
    const q = selectedQuery.trim().toLowerCase();
    return selectedEntries.filter((entry) => entry.label.toLowerCase().includes(q));
  }, [selectedEntries, selectedQuery, searchable]);

  const writeValue = React.useCallback(
    (next: unknown) => {
      if (currentForm && name) {
        if (!currentForm.isTouched(name)) {
          currentForm.touchField(name);
        }
        currentForm.setValue(name, next);
        if (shouldValidateOn(name, currentForm, 'change')) {
          void currentForm.validateField(name, 'change');
        }
        return;
      }
      scope.update(name, next);
    },
    [currentForm, name, scope],
  );

  const interactionDisabled = presentation.effectiveDisabled || presentation.readOnly;

  const allCandidateValues = filteredCandidates.map((o) => o.value);
  const allCandidateChecked =
    allCandidateValues.length > 0 && allCandidateValues.every((v) => candidateChecked.has(v));
  const someCandidateChecked = allCandidateValues.some((v) => candidateChecked.has(v));

  const toggleAllCandidates = React.useCallback(() => {
    if (interactionDisabled || allCandidateValues.length === 0) {
      return;
    }
    if (allCandidateChecked) {
      setCandidateChecked(new Set());
    } else {
      setCandidateChecked(new Set(allCandidateValues));
      void props.events.onSelectAll?.();
    }
  }, [allCandidateChecked, allCandidateValues, interactionDisabled, props.events]);

  const clearAll = React.useCallback(() => {
    if (interactionDisabled) {
      return;
    }
    writeValue(multiple ? [] : undefined);
    setSelectedChecked(new Set());
    void props.events.onChange?.();
  }, [interactionDisabled, multiple, props.events, writeValue]);

  const toggleCandidate = React.useCallback((value: string | number | boolean) => {
    setCandidateChecked((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const toggleSelected = React.useCallback((value: string | number | boolean) => {
    setSelectedChecked((current) => {
      const next = new Set(current);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }, []);

  const moveToSelected = React.useCallback(() => {
    if (interactionDisabled || candidateChecked.size === 0) {
      return;
    }
    const additions: Array<string | number | boolean> = [];
    for (const checked of candidateChecked) {
      if (optionsByValue.has(checked)) {
        additions.push(checked);
      }
    }
    if (additions.length === 0) {
      return;
    }
    if (multiple) {
      // Set-guarded append: the previous `next.includes` scan was O(S²) when
      // moving many items (plan 2026-09-29-6 R2-P12)
      const existing = new Set(selectedValues);
      const next = [...selectedValues];
      for (const value of additions) {
        if (!existing.has(value)) {
          existing.add(value);
          next.push(value);
        }
      }
      writeValue(next);
    } else {
      writeValue(additions[0]);
    }
    setCandidateChecked(new Set());
    void props.events.onAdd?.();
    void props.events.onChange?.();
  }, [
    candidateChecked,
    interactionDisabled,
    multiple,
    optionsByValue,
    props.events,
    selectedValues,
    writeValue,
  ]);

  const removeFromSelected = React.useCallback(() => {
    if (interactionDisabled || selectedChecked.size === 0) {
      return;
    }
    if (multiple) {
      const next = selectedValues.filter((value) => !selectedChecked.has(value));
      writeValue(next);
    } else {
      writeValue(undefined);
    }
    setSelectedChecked(new Set());
    void props.events.onRemove?.();
    void props.events.onChange?.();
  }, [interactionDisabled, multiple, props.events, selectedChecked, selectedValues, writeValue]);

  if (!props.meta.visible) {
    return null;
  }

  return (
    <div
      className={cn(
        'nop-transfer',
        'grid grid-cols-[1fr_auto_1fr] items-stretch gap-3',
        props.meta.className,
      )}
    >
      <TransferPane
        kind="candidate"
        multiple={multiple}
        title={selectTitle || t('flux.transfer.candidates', { defaultValue: 'Candidates' })}
        totalCount={candidateOptions.length}
        options={filteredCandidates}
        checked={candidateChecked}
        onToggle={toggleCandidate}
        checkAllEnabled={checkAllEnabled}
        allChecked={allCandidateChecked}
        someChecked={someCandidateChecked}
        onToggleAll={toggleAllCandidates}
        checkAllLabel={
          typeof props.props.checkAllLabel === 'string' ? props.props.checkAllLabel : undefined
        }
        searchable={searchable}
        query={candidateQuery}
        onQueryChange={setCandidateQuery}
        searchPlaceholder={
          searchPlaceholder || t('flux.transfer.search', { defaultValue: 'Search' })
        }
        interactionDisabled={interactionDisabled}
        emptyText={t('flux.transfer.noCandidates', { defaultValue: 'No candidates' })}
      />

      <div className="flex flex-col items-center justify-center gap-2" data-slot="transfer-actions">
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-slot="transfer-select"
          disabled={interactionDisabled || candidateChecked.size === 0}
          aria-label={t('flux.transfer.select', { defaultValue: 'Select' })}
          onClick={moveToSelected}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          data-slot="transfer-deselect"
          disabled={interactionDisabled || selectedChecked.size === 0}
          aria-label={t('flux.transfer.deselect', { defaultValue: 'Deselect' })}
          onClick={removeFromSelected}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      </div>

      <TransferPane
        kind="selected"
        multiple={multiple}
        title={resultTitle || t('flux.transfer.selected', { defaultValue: 'Selected' })}
        totalCount={selectedEntries.length}
        options={filteredSelected.map((entry) => ({
          label: entry.label,
          value: entry.value,
          raw: entry.value,
        }))}
        checked={selectedChecked}
        onToggle={toggleSelected}
        clearable={clearable && selectedEntries.length > 0}
        onClearAll={clearAll}
        searchable={searchable}
        query={selectedQuery}
        onQueryChange={setSelectedQuery}
        searchPlaceholder={
          searchPlaceholder || t('flux.transfer.search', { defaultValue: 'Search' })
        }
        interactionDisabled={interactionDisabled}
        emptyText={t('flux.transfer.noSelection', { defaultValue: 'No selection' })}
      />

      <input
        type="hidden"
        data-testid="transfer-value"
        value={JSON.stringify(multiple ? selectedValues : (selectedValues[0] ?? ''))}
        readOnly
      />
    </div>
  );
}

interface TransferPaneProps {
  kind: 'candidate' | 'selected';
  multiple: boolean;
  title: string;
  totalCount: number;
  options: NormalizedOption[];
  checked: Set<string | number | boolean>;
  onToggle: (value: string | number | boolean) => void;
  checkAllEnabled?: boolean;
  allChecked?: boolean;
  someChecked?: boolean;
  onToggleAll?: () => void;
  checkAllLabel?: string;
  clearable?: boolean;
  onClearAll?: () => void;
  searchable: boolean;
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder: string;
  interactionDisabled: boolean;
  emptyText: string;
}

function TransferPane(props: TransferPaneProps) {
  // plan 2026-09-28-5 Phase 3: roving-tabindex listbox keyboard navigation —
  // ArrowUp/ArrowDown move the active item (clamped at the edges), Home/End
  // jump to the first/last option, Space toggles the active option's checkbox.
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const optionKeys = props.options.map((option) => String(option.value));
  const activeIndex = activeKey != null ? optionKeys.indexOf(activeKey) : -1;
  const activeVisible = activeIndex >= 0;
  const listRef = React.useRef<HTMLUListElement | null>(null);

  // Pane windowing (plan 2026-09-29-6 R2-P12; audit r2 follow-through): above
  // the threshold only the visible slice mounts. The pane's overflow container
  // (max-h-64, :503) is the scroll element — the roving tabindex stays on the
  // UL container, so keyboard semantics are untouched; the active row follows
  // the window via virtualizer.scrollToIndex (unmounted rows are unreachable
  // by scrollIntoView — kanban/calendar virtualizer precedent).
  const paneScrollRef = React.useRef<HTMLDivElement | null>(null);
  const paneWindowing = props.options.length > TRANSFER_PANE_VIRTUAL_THRESHOLD;
  const paneVirtualizer = useVirtualizer({
    count: paneWindowing ? props.options.length : 0,
    getScrollElement: () => paneScrollRef.current,
    estimateSize: () => 32,
    overscan: 8,
  });
  const paneVirtualRows = paneWindowing ? paneVirtualizer.getVirtualItems() : null;
  React.useEffect(() => {
    if (paneWindowing && activeVisible) {
      paneVirtualizer.scrollToIndex(activeIndex);
    }
  }, [paneWindowing, activeVisible, activeIndex, paneVirtualizer]);

  React.useEffect(() => {
    if (activeKey != null && !activeVisible) {
      setActiveKey(null);
    }
  }, [activeKey, activeVisible]);

  const moveActive = (nextIndex: number) => {
    if (props.options.length === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(props.options.length - 1, nextIndex));
    setActiveKey(optionKeys[clamped]);
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (props.interactionDisabled || props.options.length === 0) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActive(activeVisible ? activeIndex + 1 : 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActive(activeVisible ? activeIndex - 1 : props.options.length - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveActive(0);
        break;
      case 'End':
        event.preventDefault();
        moveActive(props.options.length - 1);
        break;
      case ' ': {
        event.preventDefault();
        const target = activeVisible ? props.options[activeIndex] : undefined;
        if (target && !target.disabled) {
          props.onToggle(target.value);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      className={cn('flex flex-col rounded-lg border border-border bg-card')}
      data-slot={`transfer-pane-${props.kind}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          {props.checkAllEnabled && props.onToggleAll && (
            <Checkbox
              checked={props.allChecked}
              // [G2-视角3-01] presence-selector contract: data-indeterminate must
              // be the string 'true' or absent — a bare boolean renders 'false'
              // as a present attribute and `[data-indeterminate]` matches always.
              data-indeterminate={props.someChecked && !props.allChecked ? 'true' : undefined}
              disabled={props.interactionDisabled || props.options.length === 0}
              onCheckedChange={() => props.onToggleAll?.()}
              data-slot="transfer-toggle-all"
              aria-label={
                props.checkAllLabel || t('flux.transfer.selectAll', { defaultValue: 'Select all' })
              }
            />
          )}
          <span className="text-sm font-medium">{props.title}</span>
          <span className="text-xs text-muted-foreground">
            （{props.options.length}/{props.totalCount}）
          </span>
        </div>
        {props.clearable && props.onClearAll && (
          <Button
            variant="ghost"
            className={cn(
              'text-xs text-muted-foreground hover:text-foreground transition-colors',
              props.interactionDisabled && 'pointer-events-none opacity-50',
            )}
            disabled={props.interactionDisabled}
            onClick={() => props.onClearAll?.()}
            data-slot="transfer-clear-all"
          >
            {t('flux.transfer.clear', { defaultValue: 'Clear' })}
          </Button>
        )}
      </div>
      {props.searchable && (
        <div className="border-b border-border px-2 py-2">
          <div className="relative flex items-center">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={props.query}
              placeholder={props.searchPlaceholder}
              className="flex-1"
              style={{ paddingLeft: '2rem' }}
              onChange={(event) => props.onQueryChange(event.target.value)}
            />
          </div>
        </div>
      )}
      <div ref={paneScrollRef} className="max-h-64 min-h-24 overflow-y-auto p-1">
        {props.options.length === 0 ? (
          <Empty className="p-4 text-sm text-muted-foreground">{props.emptyText}</Empty>
        ) : (
          <ul
            ref={listRef}
            className={cn('flex flex-col', paneVirtualRows && 'relative h-full')}
            style={paneVirtualRows ? { height: paneVirtualizer.getTotalSize() } : undefined}
            // plan 2026-09-28-5 Phase 3: keyboard navigation WITHOUT the
            // composite listbox role — adjudicated 20-05 (WCAG 4.1.2/1.3.1)
            // keeps selection semantics in the per-row checkboxes; a composite
            // listbox wrapping checkboxes is invalid ARIA. The pane keeps a
            // roving-tabindex key handler and a visual active marker only.
            aria-label={props.title}
            tabIndex={0}
            onKeyDown={handleListKeyDown}
          >
            {paneVirtualRows
              ? (paneVirtualRows as Array<{ index: number; start: number }>).map((entry) => {
              const index = entry.index;
              const option = props.options[index]!;
              const isChecked = props.checked.has(option.value);
              const isActive = activeVisible && index === activeIndex;
              return (
                <li
                  key={String(option.value)}
                  ref={paneVirtualizer.measureElement}
                  data-index={index}
                  aria-disabled={option.disabled || undefined}
                  data-active={isActive ? 'true' : undefined}
                  className={cn('absolute inset-x-1', isActive && 'rounded bg-accent')}
                  style={{ transform: `translateY(${entry.start}px)` }}
                >
                  <Label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-accent',
                      props.interactionDisabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={props.interactionDisabled || option.disabled}
                      onCheckedChange={() => props.onToggle(option.value)}
                      data-slot={`transfer-option-${props.kind}`}
                      aria-label={option.label}
                    />
                    <span className="truncate">{option.label}</span>
                  </Label>
                </li>
              );
              })
              : props.options.map((option, index) => {
              const isChecked = props.checked.has(option.value);
              const isActive = activeVisible && index === activeIndex;
              return (
                <li
                  key={String(option.value)}
                  aria-disabled={option.disabled || undefined}
                  data-active={isActive ? 'true' : undefined}
                  className={cn(isActive && 'rounded bg-accent')}
                >
                  <Label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm font-normal hover:bg-accent',
                      props.interactionDisabled && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      disabled={props.interactionDisabled || option.disabled}
                      onCheckedChange={() => props.onToggle(option.value)}
                      data-slot={`transfer-option-${props.kind}`}
                      aria-label={option.label}
                    />
                    <span className="truncate">{option.label}</span>
                  </Label>
                </li>
              );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}

export const transferRendererDefinition: RendererDefinition = {
  type: 'transfer',
  displayName: 'Transfer',
  category: 'Form Advanced',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: TransferRenderer,
  wrap: true,
  fields: [
    { key: 'name', kind: 'prop' },
    ...formFieldRules,
    { key: 'options', kind: 'prop' },
    { key: 'multiple', kind: 'prop', valueType: 'boolean' },
    { key: 'valueKey', kind: 'prop' },
    { key: 'labelKey', kind: 'prop' },
    { key: 'searchable', kind: 'prop', valueType: 'boolean' },
    { key: 'searchOnly', kind: 'prop', valueType: 'boolean' },
    { key: 'searchPlaceholder', kind: 'prop' },
    { key: 'checkAll', kind: 'prop', valueType: 'boolean' },
    { key: 'checkAllLabel', kind: 'prop' },
    { key: 'clearable', kind: 'prop', valueType: 'boolean' },
    { key: 'selectTitle', kind: 'prop' },
    { key: 'resultTitle', kind: 'prop' },
    { key: 'readOnly', kind: 'prop' },
    { key: 'onAdd', kind: 'event' },
    { key: 'onRemove', kind: 'event' },
    { key: 'onChange', kind: 'event' },
    { key: 'onSelectAll', kind: 'event' },
  ],
  validation: {
    kind: 'field',
    valueKind: 'array',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules(schema: BaseSchema) {
      const rules: ValidationRule[] = [];
      if (schema.required === true || schema.required === 'true') {
        rules.push({
          kind: 'required',
          message: `${schema.label ?? schema.name ?? 'Field'} is required`,
        });
      }
      return rules;
    },
  },
  frameRootTag: 'div',
};
