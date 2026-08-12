import { useEffect, useRef, useState } from 'react';
import type { ActionSchema, RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, unwrapPreservedLiteral } from '@nop-chaos/flux-react';
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

/**
 * Resolve the dispatchable action of a menu item.
 *
 * The schema-definition compiler may deliver the action in three forms:
 * 1. `{ __nopPreserveLiteral: true, value }` envelope (fully-static items),
 * 2. the raw ActionSchema (authoring form),
 * 3. a raw value inside a mixed item (dynamic sibling fields).
 * `item.action` wins over `item.onClick`; each is unwrapped before use.
 */
function resolveItemAction(item: ResolvedItem): ActionSchema | ActionSchema[] | undefined {
  const action = item.action ?? (item as Record<string, unknown>).onClick;
  const unwrapped = unwrapPreservedLiteral(action);
  return (unwrapped ?? action) as ActionSchema | ActionSchema[] | undefined;
}

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

  // P1-04: the menu content is rendered through a portal into document.body —
  // a synchronous close on wrapper mouseleave makes `trigger="hover"` unusable
  // for mouse users (the pointer can never reach the portal menu before it
  // unmounts). Close is deferred into a grace window that the portal menu's
  // own hover cancels; hover mode stays mouse-oriented (touch users should use
  // the default click trigger — the 150ms window never delays a click-driven
  // open/close cycle).
  const HOVER_CLOSE_GRACE_MS = 150;
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHoverClose = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverCloseTimerRef.current = setTimeout(() => {
      hoverCloseTimerRef.current = null;
      setOpen(false);
    }, HOVER_CLOSE_GRACE_MS);
  };

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
      }
    };
  }, []);

  const hoverOpenHandlers =
    trigger === 'hover' && !disabled
      ? {
          onMouseEnter: () => {
            cancelHoverClose();
            setOpen(true);
          },
          onMouseLeave: scheduleHoverClose,
        }
      : {};
  // The portal menu lives outside the wrapper subtree: its own hover must
  // cancel the pending close (pointer traveling trigger → menu) and re-arm it
  // when the pointer leaves the menu.
  const hoverContentHandlers =
    trigger === 'hover' && !disabled
      ? {
          onMouseEnter: cancelHoverClose,
          onMouseLeave: scheduleHoverClose,
        }
      : {};

  const handleItemClick = (item: ResolvedItem, index: number, itemDisabled: boolean) => {
    if (itemDisabled) return;
    const action = resolveItemAction(item);
    if (action) {
      void props.helpers.dispatch(action, {
        scope: props.node.scope,
        evaluationBindings: { item, index },
      });
    }
    cancelHoverClose();
    setOpen(false);
  };

  return (
    <div
      className={cn('nop-dropdown-button', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="dropdown-button-root"
      {...hoverOpenHandlers}
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
        <DropdownMenuContent {...hoverContentHandlers}>
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
