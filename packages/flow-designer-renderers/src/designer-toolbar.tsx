import React, { useCallback, useMemo } from 'react';
import { reportRuntimeHostIssue, shallowEqual } from '@nop-chaos/flux-core';
import type { DesignerSnapshot } from '@nop-chaos/flow-designer-core';
import { useDesignerContext, useDesignerSnapshotSelector } from './designer-context.js';
import { DesignerIcon } from './designer-icon.js';
import { useCurrentActionScope, useRendererRuntime, useRenderScope } from '@nop-chaos/flux-react';
import { Badge, Button, Label, Switch, cn } from '@nop-chaos/ui';
import { notifyCommandFailure } from './designer-context.js';

type ToolbarSnapshot = Pick<
  DesignerSnapshot,
  | 'canUndo'
  | 'canRedo'
  | 'isDirty'
  | 'gridEnabled'
  | 'paletteCollapsed'
  | 'inspectorCollapsed'
  | 'doc'
>;

function readState(name: string, snapshot: ToolbarSnapshot) {
  switch (name) {
    case 'canUndo':
      return snapshot.canUndo;
    case 'canRedo':
      return snapshot.canRedo;
    case 'isDirty':
      return snapshot.isDirty;
    case 'gridEnabled':
      return snapshot.gridEnabled;
    case 'paletteCollapsed':
      return snapshot.paletteCollapsed;
    case 'inspectorCollapsed':
      return snapshot.inspectorCollapsed;
    default:
      return undefined;
  }
}

function evalTextTemplate(template: string | undefined, snapshot: ToolbarSnapshot) {
  if (!template) return '';

  const normalized = template.replace(/\{\{([^}]+)\}\}/g, '${$1}');
  const trimmed = normalized.trim();
  if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
    const expr = trimmed.slice(2, -1).trim();
    const ternaryMatch = expr.match(/^([A-Za-z0-9_.]+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'$/);
    if (ternaryMatch) {
      const [, cond, left, right] = ternaryMatch;
      return readState(cond, snapshot) === true ? left : right;
    }
  }

  return normalized.replace(/\$\{([^}]+)\}/g, (_full, exprSource: string) => {
    const expr = exprSource.trim();
    if (expr === 'doc.name') return snapshot.doc.name;
    if (expr === 'doc.nodes.length') return String(snapshot.doc.nodes.length);
    if (expr === 'doc.edges.length') return String(snapshot.doc.edges.length);
    if (expr === 'isDirty') return String(snapshot.isDirty);
    if (expr === 'canUndo') return String(snapshot.canUndo);
    if (expr === 'canRedo') return String(snapshot.canRedo);
    if (expr === 'gridEnabled') return String(snapshot.gridEnabled);
    if (expr === 'paletteCollapsed') return String(snapshot.paletteCollapsed);
    if (expr === 'inspectorCollapsed') return String(snapshot.inspectorCollapsed);
    return '';
  });
}

export function DesignerToolbarContent(props: {
  onExportToggle?: () => void;
  exportActive?: boolean;
  onAutoLayout?: () => void;
  autoLayoutBusy?: boolean;
}) {
  const { config } = useDesignerContext();
  const snapshot = useDesignerSnapshotSelector<ToolbarSnapshot>((state) => ({
    canUndo: state.canUndo,
    canRedo: state.canRedo,
    isDirty: state.isDirty,
    gridEnabled: state.gridEnabled,
    paletteCollapsed: state.paletteCollapsed,
    inspectorCollapsed: state.inspectorCollapsed,
    doc: state.doc,
  }), shallowEqual);
  const actionScope = useCurrentActionScope();
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const env = runtime.env;

  const invokeAction = useCallback(
    async (action: string) => {
      const resolved = actionScope?.resolve(action);
      if (!resolved) {
        return undefined;
      }
      return resolved.provider.invoke(resolved.method, undefined, {
        runtime,
        scope,
        actionScope,
      });
    },
    [actionScope, runtime, scope],
  );

  const handleActionFailure = useCallback(
    (action: string, error: unknown) => {
      notifyCommandFailure({
        notify: env.notify,
        error: error instanceof Error ? error.message : undefined,
      });
      reportRuntimeHostIssue({
        env,
        error,
        phase: 'action',
        details: {
          reason: 'designer-toolbar-action-failed',
          action,
        },
      });
    },
    [env],
  );

  const items = useMemo(() => {
    return (config.toolbar?.items ?? []).map((item, index) => ({
      key: `${item.type}:${index}`,
      item,
    }));
  }, [config.toolbar?.items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'nop-designer-toolbar min-h-[52px] px-3 py-2 flex flex-wrap items-center gap-2 border border-border rounded-xl shadow-sm',
      )}
      data-testid="designer-toolbar"
    >
      {items.map(({ key, item }) => {
        if (item.type === 'divider') {
          return <span key={key} className="w-px h-[18px] bg-border" aria-hidden="true" />;
        }

        if (item.type === 'spacer') {
          return <span key={key} className="flex-1 max-[980px]:hidden" aria-hidden="true" />;
        }

        if (item.type === 'title') {
          return (
            <div key={key} className="mr-auto flex items-center gap-2 min-w-0">
              <div>
                <div className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                  {evalTextTemplate(item.body, snapshot)}
                </div>
              </div>
            </div>
          );
        }

        if (item.type === 'badge') {
          const level = evalTextTemplate(item.level, snapshot);
          return (
            <Badge
              key={key}
              variant={
                level === 'success' ? 'success' : level === 'warning' ? 'warning' : 'secondary'
              }
            >
              {evalTextTemplate(item.text, snapshot)}
            </Badge>
          );
        }

        if (item.type === 'text') {
          return (
            <span key={key} className="text-sm text-muted-foreground whitespace-nowrap">
              {evalTextTemplate(item.text, snapshot)}
            </span>
          );
        }

        if (item.type === 'back') {
          return (
            <Button
              key={key}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={item.label ?? 'Back'}
              className="shrink-0"
              onClick={() => {
                const action = item.action ?? 'designer:navigate-back';
                void invokeAction(action)
                  .then((result) => {
                    if (result && !result.ok) {
                      handleActionFailure(action, result.error ?? new Error('Action failed'));
                    }
                  })
                  .catch((error) => handleActionFailure(action, error));
              }}
            >
              <DesignerIcon icon="arrow-left" />
            </Button>
          );
        }

        if (item.type === 'button') {
          const disabled =
            item.disabled === true ||
            (item.action === 'designer:autoLayout' && props.autoLayoutBusy === true);
          const active =
            item.active === true ||
            (item.action === 'designer:export' && props.exportActive === true);
          const variant =
            item.intent === 'danger'
              ? 'destructive'
              : active || item.intent === 'primary'
                ? 'default'
                : 'outline';
          return (
            <Button
              key={key}
              type="button"
              variant={variant}
              size="sm"
              disabled={disabled}
              onClick={() => {
                if (item.action === 'designer:autoLayout') {
                  props.onAutoLayout?.();
                  return;
                }
                if (item.action === 'designer:export' && props.onExportToggle) {
                  props.onExportToggle();
                  return;
                }
                const action = item.action;
                if (!action) {
                  return;
                }
                void invokeAction(action)
                  .then((result) => {
                    if (result && !result.ok) {
                      handleActionFailure(action, result.error ?? new Error('Action failed'));
                    }
                  })
                  .catch((error) => handleActionFailure(action, error));
              }}
            >
              {item.icon ? <DesignerIcon icon={item.icon} /> : null}
              {item.label ? <span>{item.label}</span> : null}
            </Button>
          );
        }

        if (item.type === 'switch') {
          const disabled = item.disabled === true;
          const checked = item.active === true;
          return (
            <Label
              key={key}
              className="inline-flex items-center gap-1.5 cursor-pointer select-none"
            >
              {item.label ? (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
              ) : null}
              <Switch
                data-size="sm"
                checked={checked}
                disabled={disabled}
                onCheckedChange={() => {
                  const action = item.action;
                  if (!action) {
                    return;
                  }
                  void invokeAction(action)
                    .then((result) => {
                      if (result && !result.ok) {
                        handleActionFailure(action, result.error ?? new Error('Action failed'));
                      }
                    })
                    .catch((error) => handleActionFailure(action, error));
                }}
              />
            </Label>
          );
        }

        return null;
      })}
    </div>
  );
}
