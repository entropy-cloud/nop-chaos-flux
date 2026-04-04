import React, { useMemo } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useOwnScopeSelector } from '@nop-chaos/flux-react';
import { Badge, Button, Switch } from '@nop-chaos/ui';
import type { ReportToolbarSchema } from './schemas.js';
import { DEFAULT_TOOLBAR_ITEMS } from './report-designer-toolbar-defaults.js';
import { evalBooleanExpr, evalTextTemplate, mergeToolbarItems, toCommand } from './report-designer-toolbar-helpers.js';
import type { ToolbarItem } from './report-designer-toolbar-helpers.js';

export function ReportToolbarRenderer(props: RendererComponentProps<ReportToolbarSchema>) {
  const itemsOverride = props.props.itemsOverride as ToolbarItem[] | undefined;
  const snapshot = useOwnScopeSelector((data: Record<string, unknown>) => data) as Record<string, unknown>;
  const items = useMemo(
    () => mergeToolbarItems(DEFAULT_TOOLBAR_ITEMS, itemsOverride),
    [itemsOverride],
  );

  function handleButtonClick(item: ToolbarItem) {
    const command = toCommand(item.action);
    if (!command) return;
    void props.helpers.dispatch({
      action: 'report-designer:' + (command.type as string),
      ...command,
    });
  }

  return (
    <div
      className="nop-report-toolbar min-h-[44px] px-3 py-2 flex flex-wrap items-center gap-2 border border-border rounded-lg bg-background shadow-sm"
      data-testid="report-toolbar"
    >
      {items.map((item, index) => {
        switch (item.type) {
          case 'divider':
            return <span key={item.id ?? `divider-${index}`} className="w-px h-[18px] bg-border" />;
          case 'spacer':
            return <span key={item.id ?? `spacer-${index}`} className="flex-1" />;
          case 'title': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return <div key={item.id ?? `title-${index}`} className="font-semibold">{text}</div>;
          }
          case 'badge': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return (
              <Badge key={item.id ?? `badge-${index}`} variant={item.level === 'secondary' ? 'secondary' : 'default'}>
                {text}
              </Badge>
            );
          }
          case 'text': {
            const text = evalTextTemplate(item.text ?? item.body, snapshot);
            return <span key={item.id ?? `text-${index}`} className="text-muted-foreground">{text}</span>;
          }
          case 'button': {
            const disabled = evalBooleanExpr(item.disabled, snapshot);
            const active = evalBooleanExpr(item.active, snapshot);
            return (
              <Button
                key={item.id ?? `button-${index}`}
                type="button"
                variant={item.variant === 'primary' ? 'default' : item.variant === 'danger' ? 'destructive' : 'outline'}
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
            return (
              <span key={item.id ?? `switch-${index}`} className="flex items-center gap-1.5">
                {item.label ? <span className="text-sm text-muted-foreground">{item.label}</span> : null}
                <Switch checked={checked} disabled={disabled} onCheckedChange={() => handleButtonClick(item)} />
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
