import * as React from 'react';
import type { ActionSchema } from '@nop-chaos/flux-core';
import { icons } from 'lucide-react';
import { cn, useContextMenuShell } from '@nop-chaos/ui';
import { useRendererRuntime } from './hooks.js';

// docs/components/context-menu/design.md §3: shape aligned with the
// dropdown-button item family (`action` canonical, `onClick` legacy fallback).
// Shape reuse only — the layout package's compiled-items seam is not importable
// from this layer, so the narrowing lives here.
export interface ContextMenuItemSchema {
  key?: string;
  label?: string;
  icon?: string;
  disabled?: boolean;
  destructive?: boolean;
  visible?: boolean;
  separator?: true;
  action?: ActionSchema;
  onClick?: ActionSchema;
}

export interface ContextMenuConfig {
  items?: ContextMenuItemSchema[];
}

const warnedWrapNone = new Set<string>();

export function warnContextMenuOnNonWrappedNode(key: string) {
  if (import.meta.env?.PROD) {
    return;
  }
  if (warnedWrapNone.has(key)) {
    return;
  }
  warnedWrapNone.add(key);
  console.warn(
    `[flux] contextMenu declared on a non-wrapped node (${key}): the meta capability attaches to wrap:true frame roots only — declaration ignored`,
  );
}

type OpenState = { x: number; y: number } | null;

export function useNodeContextMenu(
  config: ContextMenuConfig | undefined,
  disabled: boolean,
  onAction: (action: ActionSchema) => Promise<unknown>,
) {
  const [open, setOpen] = React.useState<OpenState>(null);
  const items = config?.items ?? [];
  const hasItems = items.length > 0;

  function openAt(x: number, y: number) {
    if (disabled || !hasItems) {
      return;
    }
    setOpen({ x, y });
  }

  function onContextMenu(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    openAt(event.clientX, event.clientY);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'F10' || !event.shiftKey) {
      if (event.key !== 'ContextMenu') {
        return;
      }
    }
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    openAt(rect.left + 8, rect.top + 8);
  }

  function close() {
    setOpen(null);
  }

  const surface =
    open && hasItems ? (
      <ContextMenuSurface items={items} position={open} onClose={close} onAction={onAction} />
    ) : null;

  return {
    contextMenuHandlers: hasItems ? { onContextMenu, onKeyDown } : undefined,
    contextMenuSurface: surface,
  };
}

function ContextMenuSurface(props: {
  items: ContextMenuItemSchema[];
  position: { x: number; y: number };
  onClose: () => void;
  onAction: (action: ActionSchema) => Promise<unknown>;
}) {
  const runtime = useRendererRuntime();
  const runtimeRef = React.useRef(runtime);
  React.useEffect(() => {
    runtimeRef.current = runtime;
  }, [runtime]);
  const { menuRef, handleMenuKeyDown } = useContextMenuShell({
    position: props.position,
    onClose: props.onClose,
  });

  // design.md §5: dispatch first, close regardless of outcome; failures surface
  // via the host notify channel (§9 ctx-action-fail).
  async function runItem(item: ContextMenuItemSchema) {
    const action = item.action ?? item.onClick;
    if (!action) {
      props.onClose();
      return;
    }
    try {
      await props.onAction(action);
    } catch (error: unknown) {
      const hostEnv = runtimeRef.current?.env;
      if (hostEnv && hostEnv.notify) {
        hostEnv.notify('warning', error instanceof Error ? error.message : String(error));
      }
    } finally {
      props.onClose();
    }
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      data-slot="context-menu-surface"
      onKeyDown={handleMenuKeyDown}
      className="fixed z-50 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {props.items.map((item, index) => {
        if (item.separator) {
          return (
            <hr
              key={item.key ?? `sep-${index}`}
              className="-mx-1 my-1 h-px border-border"
            />
          );
        }
        if (item.visible === false) {
          return null;
        }
        const Icon = item.icon ? (icons as Record<string, React.ComponentType>)[item.icon] : undefined;
        return (
          <button
            key={item.key ?? item.label ?? index}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={cn(
              'flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
              'focus:bg-accent focus:text-accent-foreground',
              item.disabled && 'pointer-events-none opacity-50',
              item.destructive && 'text-destructive focus:text-destructive',
            )}
            onClick={() => {
              runItem(item).catch(() => undefined);
            }}
          >
            {Icon ? <Icon /> : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
