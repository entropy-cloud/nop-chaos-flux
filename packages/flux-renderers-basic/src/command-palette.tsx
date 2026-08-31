import React from 'react';
import type {
  ActionSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import {
  comboMatchesKey,
  createNormalizedActionEvent,
  parseModifierHotkey,
  useCurrentComponentRegistry,
  useCurrentPage,
} from '@nop-chaos/flux-react';
import { resolveContainerElement } from '@nop-chaos/flux-react';
import { useStatusPathPublication } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  cn,
  resolveLucideIcon,
} from '@nop-chaos/ui';
import type { CommandPaletteSchema } from './schemas.js';

const PALETTE_KIND = 'command-palette' as const;

/** Compile-time sentinel marking the resolved `open` wrapper object (see compileOpenBinding). */
export const OPEN_BINDING_KIND = 'command-palette-open' as const;

interface CommandPaletteOpenBinding {
  kind: typeof OPEN_BINDING_KIND;
  path?: string;
  value?: unknown;
}

interface CommandEntry {
  item: Record<string, unknown>;
  /**
   * 23-01 fix: action value from the RAW schema item (static tracks only).
   * Prop-kind compilation resolves `items` against the render scope, which
   * bakes `${id}`-style templates in a static item's `action` args to empty
   * (or worse, to an unrelated same-named scope value) before the dispatch
   * bindings ever see them. The raw counterpart keeps the templates intact so
   * they resolve at dispatch time against the command payload, matching the
   * onCommand event channel. Expression/`source`-track items are runtime data
   * (never template-baked) and need no counterpart.
   */
  rawAction?: unknown;
  key: string;
  groupId: string;
}

interface CommandSection {
  key: string;
  heading?: string;
  items: CommandEntry[];
}

function asItemRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toItemRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(asItemRecord)
    .filter((item): item is Record<string, unknown> => item !== undefined);
}

function resolveItemLabel(item: Record<string, unknown>): string {
  const label = item.label;
  if (typeof label === 'string' && label.length > 0) {
    return label;
  }
  const id = item.id;
  return typeof id === 'string' ? id : '';
}

function isItemDisabled(item: Record<string, unknown>): boolean {
  return item.disabled === true || item.disabled === 'true';
}

function buildSections(
  resolved: Record<string, unknown>,
  rawSchema?: Record<string, unknown>,
): CommandSection[] {
  const sections: CommandSection[] = [];
  let runningIndex = 0;
  const sectionKeyCounts = new Map<string, number>();

  const sectionKey = (base: string) => {
    const seen = sectionKeyCounts.get(base) ?? 0;
    sectionKeyCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  // Raw counterpart of a static track: only array-shaped raw values pair with
  // the resolved track (expression-shaped raw values mean the track is
  // data-driven and needs no template preservation).
  const rawTrack = (value: unknown): Record<string, unknown>[] | undefined => {
    if (!rawSchema || !Array.isArray(rawSchema[value as string])) {
      return undefined;
    }
    const rawFiltered = toItemRecords(rawSchema[value as string]);
    const resolvedFiltered = toItemRecords(resolved[value as string]);
    return rawFiltered.length === resolvedFiltered.length ? rawFiltered : undefined;
  };
  const rawGroupsTrack = rawTrack('groups');
  const rawItemsTrack = rawTrack('items');

  const pushItems = (
    items: Record<string, unknown>[],
    groupId: string,
    rawItems?: Record<string, unknown>[],
  ) => {
    return items.map((item, index) => {
      const explicitId = item.id;
      const key =
        typeof explicitId === 'string' && explicitId.length > 0
          ? explicitId
          : `item-${runningIndex++}`;
      const rawItem = rawItems?.[index];
      return {
        item,
        rawAction: rawItem && typeof rawItem === 'object' ? rawItem.action : undefined,
        key,
        groupId,
      };
    });
  };

  let groupOrdinal = 0;
  let groupIndex = -1;
  for (const raw of toItemRecords(resolved.groups)) {
    groupOrdinal += 1;
    groupIndex += 1;
    const heading = typeof raw.label === 'string' ? raw.label : undefined;
    const resolvedGroupItems = toItemRecords(raw.items);
    const rawGroup = rawGroupsTrack?.[groupIndex];
    const rawGroupItems =
      rawGroup && Array.isArray(rawGroup.items) ? toItemRecords(rawGroup.items) : undefined;
    sections.push({
      key: sectionKey(`group-${heading ?? groupOrdinal}`),
      heading,
      items: pushItems(
        resolvedGroupItems,
        heading ?? '',
        rawGroupItems && rawGroupItems.length === resolvedGroupItems.length
          ? rawGroupItems
          : undefined,
      ),
    });
  }

  const flatByGroup = new Map<string, Record<string, unknown>[]>();
  const flatRawByGroup = new Map<string, Record<string, unknown>[]>();
  const groupOrder: string[] = [];
  const ungrouped: Record<string, unknown>[] = [];
  const ungroupedRaw: Record<string, unknown>[] = [];
  const resolvedItems = toItemRecords(resolved.items);
  for (let index = 0; index < resolvedItems.length; index += 1) {
    const item = resolvedItems[index];
    const rawItem = rawItemsTrack?.[index];
    const group = typeof item.group === 'string' && item.group.length > 0 ? item.group : undefined;
    if (!group) {
      ungrouped.push(item);
      ungroupedRaw.push(rawItem ?? (undefined as unknown as Record<string, unknown>));
      continue;
    }
    if (!flatByGroup.has(group)) {
      flatByGroup.set(group, []);
      flatRawByGroup.set(group, []);
      groupOrder.push(group);
    }
    flatByGroup.get(group)!.push(item);
    flatRawByGroup.get(group)!.push(rawItem ?? (undefined as unknown as Record<string, unknown>));
  }
  const rawAligned = (raw: Record<string, unknown>[], resolved: Record<string, unknown>[]) =>
    raw.length === resolved.length ? raw : undefined;
  for (const group of groupOrder) {
    sections.push({
      key: sectionKey(`flat-${group}`),
      heading: group,
      items: pushItems(flatByGroup.get(group)!, group, rawAligned(flatRawByGroup.get(group)!, flatByGroup.get(group)!)),
    });
  }
  if (ungrouped.length > 0) {
    sections.push({
      key: sectionKey('flat'),
      items: pushItems(ungrouped, '', rawAligned(ungroupedRaw, ungrouped)),
    });
  }

  const sourceItems = toItemRecords(resolved.source);
  if (sourceItems.length > 0) {
    sections.push({ key: sectionKey('source'), items: pushItems(sourceItems, '') });
  }

  return sections;
}

function useCommandPaletteHandle(input: {
  id: string;
  cid?: number;
  stateRef: React.RefObject<{ controlled: boolean; open: boolean }>;
  setOpen: (open: boolean) => void;
}) {
  const componentRegistry = useCurrentComponentRegistry();
  const setOpenRef = React.useRef(input.setOpen);
  React.useEffect(() => {
    setOpenRef.current = input.setOpen;
  });

  const handle = React.useMemo(
    () => ({
      id: input.id,
      type: PALETTE_KIND,
      capabilities: {
        hasMethod(method: string) {
          return method === 'open' || method === 'close' || method === 'toggle';
        },
        listMethods() {
          return ['open', 'close', 'toggle'] as const;
        },
        invoke(method: string) {
          const { controlled, open } = input.stateRef.current;
          if (controlled) {
            return { ok: true, skipped: true };
          }
          switch (method) {
            case 'open': {
              if (open) {
                return { ok: true, skipped: true };
              }
              setOpenRef.current(true);
              return { ok: true };
            }
            case 'close': {
              if (!open) {
                return { ok: true, skipped: true };
              }
              setOpenRef.current(false);
              return { ok: true };
            }
            case 'toggle': {
              setOpenRef.current(!open);
              return { ok: true };
            }
            default:
              return {
                ok: false,
                error: new Error(`Unsupported ${PALETTE_KIND} handle method: ${method}`),
              };
          }
        },
      },
    }),
    [input.id, input.stateRef],
  );

  React.useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    return componentRegistry.register(handle, { cid: input.cid });
  }, [componentRegistry, handle, input.cid]);
}

export function CommandPaletteRenderer(props: RendererComponentProps<CommandPaletteSchema>) {
  const { id, node, props: resolvedProps, meta, events, helpers } = props;
  const resolved = resolvedProps as Record<string, unknown>;

  const openBinding = resolved.open as CommandPaletteOpenBinding | undefined;
  const controlled = Boolean(
    openBinding && typeof openBinding === 'object' && openBinding.kind === OPEN_BINDING_KIND,
  );
  const openPath =
    controlled && typeof openBinding?.path === 'string' && openBinding.path.length > 0
      ? openBinding.path
      : undefined;
  const controlledOpen = controlled ? Boolean(openBinding?.value) : undefined;

  const defaultOpen = Boolean(resolvedProps.defaultOpen ?? false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const [userClosed, setUserClosed] = React.useState(false);
  const effectiveOpen = Boolean((controlled ? controlledOpen : uncontrolledOpen) && !userClosed);

  // Props resolve asynchronously (the first render sees an empty prop bag), so
  // the useState latch above can initialize false even when defaultOpen is
  // declared. Sync like the dialog surface does (use-surface-renderer).
  const defaultOpenRef = React.useRef(defaultOpen);
  React.useEffect(() => {
    if (controlled || defaultOpenRef.current === defaultOpen) {
      return;
    }
    defaultOpenRef.current = defaultOpen;
    setUncontrolledOpen(defaultOpen);
  }, [controlled, defaultOpen]);

  const placeholder =
    typeof resolvedProps.placeholder === 'string' && resolvedProps.placeholder.length > 0
      ? resolvedProps.placeholder
      : t('flux.common.search');
  const emptyText =
    typeof resolvedProps.emptyText === 'string' && resolvedProps.emptyText.length > 0
      ? resolvedProps.emptyText
      : t('flux.common.noResults');
  const shouldFilter = resolvedProps.shouldFilter !== false;
  const closeOnEsc = resolvedProps.closeOnEsc !== false;
  const closeOnOutsideClick = resolvedProps.closeOnOutsideClick !== false;
  const showMask = resolvedProps.showMask !== false;

  const stateRef = React.useRef({ controlled, open: effectiveOpen });
  React.useEffect(() => {
    stateRef.current = { controlled, open: effectiveOpen };
  });

  function setOpenState(nextOpen: boolean) {
    if (controlled) {
      if (!nextOpen) {
        setUserClosed(true);
        if (openPath) {
          node.scope.update(openPath, false);
        }
      }
      return;
    }
    setUncontrolledOpen(nextOpen);
  }

  function publishOpenChange(nextOpen: boolean) {
    setOpenState(nextOpen);
    const payload = { surfaceId: id, kind: PALETTE_KIND, open: nextOpen };
    const dispatchCtx = {
      event: { ...payload, type: 'custom' },
      evaluationBindings: payload,
      scope: node.scope,
    };
    void (nextOpen ? events.onOpen?.(payload, dispatchCtx) : events.onClose?.(payload, dispatchCtx));
  }

  function executeCommand(entry: CommandEntry) {
    publishOpenChange(false);
    const payload = { id: entry.key, item: entry.item, groupId: entry.groupId };
    // 23-01 fix: prefer the raw-schema action so `${id}`-style templates in a
    // static item's args resolve at dispatch time against the command payload
    // (prop-kind compilation pre-bakes them against the render scope otherwise).
    const action = (entry.rawAction ?? entry.item.action) as
      | ActionSchema
      | ActionSchema[]
      | undefined;
    if (action && (!Array.isArray(action) || action.length > 0)) {
      void helpers.dispatch(action, {
        event: createNormalizedActionEvent(payload),
        evaluationBindings: payload,
        scope: node.scope,
        nodeInstance: node,
      });
    }
    void events.onCommand?.(payload, {
      event: { ...payload, type: 'custom' },
      evaluationBindings: payload,
      scope: node.scope,
    });
  }

  // Dialog plan-459 parity: a false→true flip of the controlled expression
  // clears the user-closed latch so idempotent setValue(openPath, true) can
  // reopen after a user close (which wrote the path back to false).
  const prevControlledOpenRef = React.useRef(controlledOpen);
  React.useEffect(() => {
    const prev = prevControlledOpenRef.current;
    prevControlledOpenRef.current = controlledOpen;
    if (controlled && Boolean(controlledOpen) && !prev) {
      setUserClosed(false);
    }
  }, [controlled, controlledOpen]);

  useCommandPaletteHandle({
    id,
    cid: meta.cid,
    stateRef,
    setOpen: publishOpenChange,
  });

  const hotkeyRaw = typeof resolved.hotkey === 'string' ? resolved.hotkey : undefined;
  const publishOpenChangeRef = React.useRef(publishOpenChange);
  React.useEffect(() => {
    publishOpenChangeRef.current = publishOpenChange;
  });
  React.useEffect(() => {
    if (!hotkeyRaw) {
      return;
    }
    if (hotkeyRaw.trim().length === 0) {
      return;
    }
    if (stateRef.current.controlled) {
      console.warn(
        `[command-palette] hotkey "${hotkeyRaw}" is ignored on the controlled palette "${id}" — the open channel belongs to the \`open\` expression.`,
      );
      return;
    }
    const binding = parseModifierHotkey(hotkeyRaw);
    if (!binding) {
      console.warn(
        `[command-palette] invalid hotkey "${hotkeyRaw}" on palette "${id}" — expected a single key with optional mod/ctrl/shift/alt modifiers (e.g. "mod+k").`,
      );
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (stateRef.current.open) {
        return;
      }
      if (!comboMatchesKey(binding, event)) {
        return;
      }
      event.preventDefault();
      publishOpenChangeRef.current(true);
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [hotkeyRaw, id]);

  const statusPath = typeof resolvedProps.statusPath === 'string' ? resolvedProps.statusPath : undefined;
  useStatusPathPublication(node.scope, statusPath, {
    id,
    kind: PALETTE_KIND,
    open: effectiveOpen,
  });

  const page = useCurrentPage();
  const componentRegistry = useCurrentComponentRegistry();
  const containerId =
    typeof resolvedProps.container === 'string' ? resolvedProps.container : page?.modalContainer;
  const containerElement = resolveContainerElement(containerId, componentRegistry);

  const handleDialogOpenChange = (nextOpen: boolean, eventDetails?: unknown) => {
    if (nextOpen) {
      return;
    }
    const reason = (eventDetails as { reason?: string } | null)?.reason;
    if (reason === 'escape-key' && closeOnEsc === false) {
      return;
    }
    if (reason === 'outside-press' && closeOnOutsideClick === false) {
      return;
    }
    publishOpenChange(false);
  };

  const sections = buildSections(
    resolved,
    props.templateNode?.schema as Record<string, unknown> | undefined,
  );

  return (
    <CommandDialog
      open={effectiveOpen}
      onOpenChange={handleDialogOpenChange}
      containerElement={containerElement}
      noOverlay={!showMask}
      closeOnOutsideClick={closeOnOutsideClick}
    >
      <Command
        data-testid={meta.testid || undefined}
        data-cid={meta.cid ?? undefined}
        className={cn('nop-command-palette', meta.className)}
        shouldFilter={shouldFilter}
      >
        <CommandInput placeholder={placeholder} />
        <CommandList>
          {sections.map((section) => {
          const items = section.items.map((entry) => {
            const label = resolveItemLabel(entry.item);
            const iconName = typeof entry.item.icon === 'string' ? entry.item.icon : undefined;
            const Icon = iconName ? (resolveLucideIcon(iconName) as React.ComponentType<Record<string, unknown>> | undefined) : undefined;
            const description =
              typeof entry.item.description === 'string' ? entry.item.description : undefined;
            const shortcut =
              typeof entry.item.shortcut === 'string' ? entry.item.shortcut : undefined;
            return (
              <CommandItem
                key={entry.key}
                value={label}
                disabled={isItemDisabled(entry.item)}
                onSelect={() => executeCommand(entry)}
              >
                {Icon ? <Icon aria-hidden="true" focusable="false" /> : null}
                <span className="flex-1 truncate">{label}</span>
                {description ? (
                  <span className="truncate text-xs text-muted-foreground">{description}</span>
                ) : null}
                {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
              </CommandItem>
            );
          });
          return section.heading ? (
            <CommandGroup key={section.key} heading={section.heading}>
              {items}
            </CommandGroup>
          ) : (
            <React.Fragment key={section.key}>{items}</React.Fragment>
          );
        })}
        <CommandEmpty>{emptyText}</CommandEmpty>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
