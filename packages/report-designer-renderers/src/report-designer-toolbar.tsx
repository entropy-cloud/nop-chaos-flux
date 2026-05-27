import React, { useMemo } from 'react';
import { reportRuntimeHostIssue, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useOwnScopeSelector, useRendererRuntime } from '@nop-chaos/flux-react';
import { Badge, Button, Switch, cn } from '@nop-chaos/ui';
import type { ReportToolbarSchema } from './schemas.js';
import { DEFAULT_TOOLBAR_ITEMS } from './report-designer-toolbar-defaults.js';
import {
  evalBooleanLike,
  evalTextTemplate,
  mergeToolbarItems,
  toCommand,
} from './report-designer-toolbar-helpers.js';
import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

export function ReportToolbarRenderer(props: RendererComponentProps<ReportToolbarSchema>) {
  const runtime = useRendererRuntime();
  const scopeSnapshot = useOwnScopeSelector((data: Record<string, unknown>) => data, Object.is);
  const itemsOverride = props.props.itemsOverride as ToolbarItem[] | undefined;
  const items = useMemo(
    () => mergeToolbarItems(DEFAULT_TOOLBAR_ITEMS, itemsOverride),
    [itemsOverride],
  );
  const runtimeSnapshot = useMemo(
    () => ({ ...scopeSnapshot, ...props.props }),
    [scopeSnapshot, props.props],
  );

  async function handleButtonClick(item: ToolbarItem) {
    const command = toCommand(item.action);
    if (!command) return;

    try {
      const result = await props.helpers.dispatch(command);
      if (result.ok) {
        return;
      }

      reportRuntimeHostIssue({
        env: runtime.env,
        level: 'warning',
        message:
          result.error instanceof Error && result.error.message
            ? result.error.message
            : 'Report toolbar action failed',
        error: result.error,
        phase: 'action',
        path: props.path,
        details: {
          operation: 'report-toolbar-command',
          itemId: item.id,
          action: item.action,
        },
      });
    } catch (error: unknown) {
      reportRuntimeHostIssue({
        env: runtime.env,
        level: 'warning',
        message: error instanceof Error && error.message ? error.message : 'Report toolbar action failed',
        error,
        phase: 'action',
        path: props.path,
        details: {
          operation: 'report-toolbar-command',
          itemId: item.id,
          action: item.action,
        },
      });
    }
  }

  return (
    <div
      className={cn(
        'nop-report-toolbar min-h-[44px] overflow-x-auto overflow-y-hidden px-3 py-2 flex flex-nowrap items-center gap-2 border border-border rounded-lg bg-background shadow-sm',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      {items.map((item, index) => {
        const visible = evalBooleanLike(item.visible, runtimeSnapshot);
        if (visible === false) {
          return null;
        }
        switch (item.type) {
          case 'divider':
            return (
              <span
                key={item.id ?? `divider-${index}`}
                className="h-[18px] w-px shrink-0 bg-border"
              />
            );
          case 'spacer':
            return <span key={item.id ?? `spacer-${index}`} className="flex-1" />;
          case 'title': {
            const text = evalTextTemplate(item.text ?? item.body, runtimeSnapshot);
            return (
              <div key={item.id ?? `title-${index}`} className="shrink-0 whitespace-nowrap font-semibold">
                {text}
              </div>
            );
          }
          case 'badge': {
            const text = evalTextTemplate(item.text ?? item.body, runtimeSnapshot);
            return (
              <Badge
                key={item.id ?? `badge-${index}`}
                className="shrink-0"
                variant={item.level === 'secondary' ? 'secondary' : 'default'}
              >
                {text}
              </Badge>
            );
          }
          case 'text': {
            const text = evalTextTemplate(item.text ?? item.body, runtimeSnapshot);
            return (
              <span
                key={item.id ?? `text-${index}`}
                className="shrink-0 whitespace-nowrap text-muted-foreground"
              >
                {text}
              </span>
            );
          }
          case 'button': {
            const disabled = evalBooleanLike(item.disabled, runtimeSnapshot) === true;
            const active = evalBooleanLike(item.active, runtimeSnapshot) === true;
            return (
              <Button
                key={item.id ?? `button-${index}`}
                type="button"
                variant={item.intent === 'danger' ? 'destructive' : item.intent === 'primary' ? 'default' : 'outline'}
                size="sm"
                disabled={disabled}
                className="shrink-0"
                data-active={active || undefined}
                  onClick={() => {
                    void handleButtonClick(item);
                  }}
              >
                {item.label}
              </Button>
            );
          }
          case 'switch': {
            const checked = evalBooleanLike(item.active, runtimeSnapshot) === true;
            const disabled = evalBooleanLike(item.disabled, runtimeSnapshot) === true;
            const switchId = `report-toolbar-switch-${item.id ?? index}`;
            return (
              <span
                key={item.id ?? `switch-${index}`}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
              >
                {item.label ? (
                  <span className="text-sm text-muted-foreground" id={switchId}>
                    {item.label}
                  </span>
                ) : null}
                <Switch
                  checked={checked}
                  disabled={disabled}
                   onCheckedChange={() => {
                     void handleButtonClick(item);
                   }}
                  aria-label={item.label ?? item.id ?? `switch-${index}`}
                  aria-labelledby={item.label ? switchId : undefined}
                />
              </span>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
