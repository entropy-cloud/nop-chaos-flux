import React, { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useOwnScopeSelector } from '@nop-chaos/flux-react';
import { Badge, Button, Switch, cn } from '@nop-chaos/ui';
import type { ReportToolbarSchema } from './schemas.js';
import { DEFAULT_TOOLBAR_ITEMS } from './report-designer-toolbar-defaults.js';
import {
  evalBooleanExpr,
  evalTextTemplate,
  mergeToolbarItems,
  toCommand,
} from './report-designer-toolbar-helpers.js';
import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

export function ReportToolbarRenderer(props: RendererComponentProps<ReportToolbarSchema>) {
  const itemsOverride = props.props.itemsOverride as ToolbarItem[] | undefined;
  const snapshot = useOwnScopeSelector(
    (data: Record<string, unknown>) => ({
      documentName: data.documentName,
      dirty: data.dirty,
      canUndo: data.canUndo,
      canRedo: data.canRedo,
      selectionTarget: data.selectionTarget,
      runtime: data.runtime,
      reportStatus: data.reportStatus,
    }),
    (a, b) =>
      a.documentName === b.documentName &&
      a.dirty === b.dirty &&
      a.canUndo === b.canUndo &&
      a.canRedo === b.canRedo &&
      a.selectionTarget === b.selectionTarget &&
      a.runtime === b.runtime &&
      a.reportStatus === b.reportStatus,
  ) as Record<string, unknown>;
  const items = useMemo(
    () => mergeToolbarItems(DEFAULT_TOOLBAR_ITEMS, itemsOverride),
    [itemsOverride],
  );

  function handleButtonClick(item: ToolbarItem) {
    const command = toCommand(item.action);
    if (!command) return;
    void props.helpers.dispatch(command);
  }

  return (
    <div
      className={cn(
        'nop-report-toolbar min-h-[44px] px-3 py-2 flex flex-wrap items-center gap-2 border border-border rounded-lg bg-background shadow-sm',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
    >
      {items.map((item, index) => {
        const visible = item.visible === undefined ? true : evalBooleanExpr(item.visible, snapshot);
        if (!visible) {
          return null;
        }
        switch (item.type) {
          case 'divider':
            return <span key={item.id ?? `divider-${index}`} className="w-px h-[18px] bg-border" />;
          case 'spacer':
            return <span key={item.id ?? `spacer-${index}`} className="flex-1" />;
          case 'title': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return (
              <div key={item.id ?? `title-${index}`} className="font-semibold">
                {text}
              </div>
            );
          }
          case 'badge': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return (
              <Badge
                key={item.id ?? `badge-${index}`}
                variant={item.level === 'secondary' ? 'secondary' : 'default'}
              >
                {text}
              </Badge>
            );
          }
          case 'text': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return (
              <span key={item.id ?? `text-${index}`} className="text-muted-foreground">
                {text}
              </span>
            );
          }
          case 'button': {
            const disabled = evalBooleanExpr(item.disabled, snapshot);
            const active = evalBooleanExpr(item.active, snapshot);
            return (
              <Button
                key={item.id ?? `button-${index}`}
                type="button"
                variant={
                  item.variant === 'primary'
                    ? 'default'
                    : item.variant === 'danger'
                      ? 'destructive'
                      : 'outline'
                }
                size="sm"
                disabled={disabled}
                data-active={active || undefined}
                onClick={() => handleButtonClick(item)}
              >
                {item.label}
              </Button>
            );
          }
          case 'switch': {
            const checked = evalBooleanExpr(item.active, snapshot);
            const disabled = evalBooleanExpr(item.disabled, snapshot);
            const switchId = `report-toolbar-switch-${item.id ?? index}`;
            return (
              <span key={item.id ?? `switch-${index}`} className="flex items-center gap-1.5">
                {item.label ? (
                  <span className="text-sm text-muted-foreground" id={switchId}>
                    {item.label}
                  </span>
                ) : null}
                <Switch
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => handleButtonClick(item)}
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
