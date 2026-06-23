import { useState } from 'react';
import type { ActionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  resolveLucideIcon,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@nop-chaos/ui';
import { ChevronDownIcon } from 'lucide-react';
import type { DropdownButtonItemSchema, DropdownButtonSchema } from './schemas.js';

type ResolvedItem = DropdownButtonItemSchema;

export function DropdownButtonRenderer(props: RendererComponentProps<DropdownButtonSchema>) {
  const schemaProps = props.props;
  const rawItems = Array.isArray(schemaProps.items)
    ? (schemaProps.items as unknown as ResolvedItem[])
    : [];
  const variant = (schemaProps.variant as string) ?? 'default';
  const size = (schemaProps.size as string) ?? 'default';
  const trigger = schemaProps.trigger === 'hover' ? 'hover' : 'click';
  const disabled = schemaProps.disabled === true;

  const label = resolveRendererSlotContent(props, 'label');

  const iconName =
    typeof schemaProps.icon === 'string' && schemaProps.icon.length > 0
      ? schemaProps.icon
      : undefined;
  const IconComp = iconName
    ? (resolveLucideIcon(iconName) as React.ComponentType<Record<string, unknown>> | null)
    : null;
  const Icon = IconComp ?? null;

  const [open, setOpen] = useState(false);

  const handleItemClick = (item: ResolvedItem, index: number, itemDisabled: boolean) => {
    if (itemDisabled) return;
    if (item.action) {
      void props.helpers.dispatch(item.action as ActionSchema | ActionSchema[], {
        scope: props.node.scope,
        evaluationBindings: { item, index },
      });
    }
    setOpen(false);
  };

  return (
    <div
      className={cn('nop-dropdown-button inline-block', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="dropdown-button-root"
      {...(trigger === 'hover' && !disabled
        ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) }
        : {})}
    >
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant={variant as never}
              size={size as never}
              disabled={disabled}
              data-slot="dropdown-button-trigger"
              data-disabled={disabled || undefined}
              data-trigger={trigger}
              aria-haspopup="menu"
            >
              {Icon ? (
                <span data-slot="dropdown-button-icon" className="inline-flex shrink-0">
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" focusable="false" />
                </span>
              ) : null}
              <span data-slot="dropdown-button-label">{label}</span>
              <ChevronDownIcon
                data-slot="dropdown-button-caret"
                className="size-4 shrink-0 opacity-70"
              />
            </Button>
          }
        />
        <DropdownMenuContent>
          {rawItems.map((item, index) => {
            const key =
              item.key !== undefined && item.key !== null && item.key !== ''
                ? String(item.key)
                : String(index);
            const itemDisabled = item.disabled === true;
            return (
              <DropdownMenuItem
                key={key}
                variant={item.destructive === true ? 'destructive' : 'default'}
                disabled={itemDisabled}
                data-slot="dropdown-menu-item"
                data-item-index={index}
                data-item-key={key}
                onClick={() => handleItemClick(item, index, itemDisabled)}
              >
                {item.label ?? key}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
