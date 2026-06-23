import type { ActionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { useState } from 'react';
import { Button, ButtonGroup, cn } from '@nop-chaos/ui';
import type { ButtonGroupItemSchema, ButtonGroupSchema } from './schemas.js';

type ResolvedItem = ButtonGroupItemSchema;

function resolveItemKey(item: ResolvedItem, index: number): string {
  if (item.key !== undefined && item.key !== null && item.key !== '') {
    return String(item.key);
  }
  return String(index);
}

function toKeyArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (value !== undefined && value !== null) {
    return [String(value)];
  }
  return [];
}

function resolveSelectionMode(value: unknown): 'none' | 'single' | 'multiple' {
  return value === 'single' || value === 'multiple' ? value : 'none';
}

export function ButtonGroupRenderer(props: RendererComponentProps<ButtonGroupSchema>) {
  const schemaProps = props.props;
  const rawItems = Array.isArray(schemaProps.items)
    ? (schemaProps.items as unknown as ResolvedItem[])
    : [];
  const orientation =
    schemaProps.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const groupVariant = (schemaProps.variant as string) ?? 'outline';
  const size = (schemaProps.size as string) ?? 'default';
  const selectionMode = resolveSelectionMode(schemaProps.selectionMode);

  const [localSelected, setLocalSelected] = useState<string[]>(() =>
    toKeyArray(schemaProps.defaultValue ?? schemaProps.value),
  );
  const selectedSet = new Set(localSelected);

  const handleClick = (item: ResolvedItem, index: number, disabled: boolean) => {
    if (disabled) return;
    const key = resolveItemKey(item, index);

    if (selectionMode !== 'none') {
      let next: string[];
      if (selectionMode === 'single') {
        next = selectedSet.has(key) ? [] : [key];
      } else {
        next = selectedSet.has(key)
          ? localSelected.filter((k) => k !== key)
          : [...localSelected, key];
      }
      setLocalSelected(next);
      const payload = {
        type: 'button-group:change',
        value: selectionMode === 'single' ? (next[0] ?? null) : next,
        selectedKeys: next,
        selectionMode,
      };
      void props.events.onChange?.(payload, {
        event: payload,
        evaluationBindings: payload,
        scope: props.node.scope,
      });
    }

    if (item.action) {
      void props.helpers.dispatch(item.action as ActionSchema | ActionSchema[], {
        scope: props.node.scope,
        evaluationBindings: { item, index },
      });
    }
  };

  return (
    <ButtonGroup
      orientation={orientation}
      className={cn('nop-button-group', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="button-group-root"
      data-orientation={orientation}
      data-selection-mode={selectionMode}
    >
      {rawItems.map((item, index) => {
        const key = resolveItemKey(item, index);
        const disabled = item.disabled === true;
        const selected = selectedSet.has(key);
        const variant = (item.variant as string) ?? groupVariant;

        return (
          <Button
            key={key}
            type="button"
            variant={variant as never}
            size={size as never}
            disabled={disabled}
            data-testid={`${props.meta.testid ?? 'button-group'}-item-${key}`}
            data-slot="button-group-item"
            data-item-index={index}
            data-item-key={key}
            data-selected={selected || undefined}
            data-disabled={disabled || undefined}
            aria-pressed={selectionMode !== 'none' ? selected : undefined}
            onClick={() => handleClick(item, index, disabled)}
          >
            {item.label ?? key}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}
