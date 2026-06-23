import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { MappingSchema } from './schemas.js';

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function lookupMap(map: unknown, value: unknown): unknown {
  if (!isPlainObject(map)) {
    return undefined;
  }
  const key = String(value);
  if (Object.prototype.hasOwnProperty.call(map, key)) {
    return map[key];
  }
  return undefined;
}

function toTextNode(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  // Object/array hit results: render as a stable string rather than throwing.
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function MappingRenderer(props: RendererComponentProps<MappingSchema>) {
  const slotProps = props.props;
  const value = slotProps.value;
  const map = slotProps.map;
  const placeholder =
    typeof slotProps.placeholder === 'string' && slotProps.placeholder.length > 0
      ? slotProps.placeholder
      : null;
  const defaultLabel =
    typeof slotProps.defaultLabel === 'string' && slotProps.defaultLabel.length > 0
      ? slotProps.defaultLabel
      : null;

  const itemRegion = props.regions.item;
  const hasItemRegion = Boolean(itemRegion);

  const empty = isEmptyValue(value);
  const hit = empty ? undefined : lookupMap(map, value);
  const isHit = hit !== undefined;

  let content: React.ReactNode;
  let state: 'empty' | 'hit' | 'miss';

  if (empty) {
    state = 'empty';
    content = placeholder ?? defaultLabel ?? null;
  } else if (isHit) {
    state = 'hit';
    content = hasItemRegion
      ? (itemRegion?.render() as React.ReactNode)
      : toTextNode(hit);
  } else {
    state = 'miss';
    // 未命中：defaultLabel 优先，否则 placeholder 兜底。
    content = defaultLabel ?? placeholder ?? null;
  }

  return (
    <span
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="mapping-root"
      data-state={state}
      className={cn('nop-mapping', props.meta.className)}
    >
      {content !== null && content !== undefined ? (
        <span data-slot="mapping-item">{content}</span>
      ) : null}
    </span>
  );
}
