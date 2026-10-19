import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { FieldFrame, useCurrentForm } from '@nop-chaos/flux-react';
import type { WheelCascaderOption, WheelCascaderSchema } from './schemas.js';
import { WheelPickerPopup } from './wheel-picker-popup.js';
import type { WheelPickerOption } from './schemas.js';

/**
 * Wheel cascader (plan 665 Phase 4, M7d): parent→children column linkage
 * over the shared popup shell. Column n lists the children of the value
 * selected in column n-1; changing a parent resets every deeper column to
 * that parent's first descendant chain. A leaf selection collapses the
 * column count (no empty trailing columns).
 *
 * Naming/ownership note (docs/components/wheel-picker/design.md §7): the
 * `cascader` type name is reserved by missing-components roadmap L2.6; this
 * renderer intentionally registers as `wheel-cascader`.
 */

interface CascadeState {
  /** Selected option per depth level (root → current leaf chain). */
  chain: WheelCascaderOption[];
}

function chainForValue(
  options: WheelCascaderOption[],
  value: (string | number)[],
): CascadeState {
  const chain: WheelCascaderOption[] = [];
  let level = options;
  for (const wanted of value) {
    const found = level.find((option) => option.value === wanted);
    if (!found) break;
    chain.push(found);
    level = found.children ?? [];
    if (level.length === 0) break;
  }
  // seed the first chain when the value is empty/unknown
  if (chain.length === 0 && options.length > 0) {
    let level2 = options;
    let cursor = level2[0];
    while (cursor) {
      chain.push(cursor);
      level2 = cursor.children ?? [];
      if (level2.length === 0) break;
      cursor = level2[0];
    }
  }
  return { chain };
}

function chainForFirstPaths(options: WheelCascaderOption[], base: WheelCascaderOption[]): CascadeState {
  const chain = [...base];
  let level = chain[chain.length - 1]?.children ?? [];
  while (level.length > 0) {
    const next = level[0];
    chain.push(next);
    level = next.children ?? [];
  }
  return { chain };
}

function columnsForChain(chain: WheelCascaderOption[], root: WheelCascaderOption[]): WheelPickerOption[][] {
  const columns: WheelPickerOption[][] = [root];
  for (const node of chain) {
    const children = node.children ?? [];
    if (children.length === 0) break;
    columns.push(children);
  }
  return columns;
}

export function WheelCascaderRenderer(
  props: RendererComponentProps<WheelCascaderSchema>,
) {
  const slotProps = props.props;
  const options = slotProps.options ?? [];
  const disabled = slotProps.disabled === true;
  const form = useCurrentForm();

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<CascadeState>(() => chainForValue(options, slotProps.value ?? []));

  const columns = columnsForChain(draft.chain, options);
  const values = draft.chain.map((node) => node.value);
  const labels = draft.chain.map((node) => node.label);

  const openPopup = () => {
    if (disabled) return;
    setDraft(chainForValue(options, slotProps.value ?? []));
    setOpen(true);
  };

  const reconcile = (values: (string | number)[]) => {
    // WheelView settle reports the full per-column value list; rebuild the
    // chain from the root, clamping to the deepest matching node.
    setDraft(chainForValue(options, values));
  };

  const close = () => setOpen(false);

  const confirm = () => {
    // complete the chain to a leaf (first-descendant path) before writing —
    // a confirm on a non-leaf node commits its first full path
    const full = chainForFirstPaths(options, draft.chain);
    const payload = {
      type: 'confirm',
      value: full.chain.map((node) => node.value),
      labels: full.chain.map((node) => node.label),
    };
    if (slotProps.name && form) {
      form.setValue(slotProps.name, payload.value);
      if (typeof form.validateField === 'function') {
        void form.validateField(slotProps.name, 'change');
      }
    }
    void props.events.onConfirm?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    close();
  };

  const cancel = () => {
    const payload = { type: 'cancel' };
    void props.events.onCancel?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    close();
  };

  return (
    <FieldFrame
      name={slotProps.name}
      label={slotProps.label}
      required={slotProps.required}
      testid={props.meta.testid != null ? String(props.meta.testid) : undefined}
      cid={props.meta.cid}
    >
      <button
        type="button"
        data-slot="wheel-picker-trigger"
        data-testid={props.meta.testid != null ? `${props.meta.testid}-trigger` : undefined}
        disabled={disabled}
        onClick={openPopup}
        className={cn(
          'nop-wheel-picker',
          'w-full min-h-11 rounded-md border px-3 text-left text-base',
          disabled && 'opacity-50',
        )}
        style={{ background: 'inherit', color: 'inherit' }}
      >
        {labels.length > 0 ? labels.join(' / ') : (slotProps.placeholder ?? '')}
      </button>
      {open ? (
        <WheelPickerPopup
          columns={columns}
          draft={values}
          cid={props.meta.cid}
          onDraftChange={reconcile}
          onConfirmClick={confirm}
          onCancelClick={cancel}
        />
      ) : null}
    </FieldFrame>
  );
}
