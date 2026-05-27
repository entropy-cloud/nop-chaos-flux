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

function normalizeTemplateSource(template: string | undefined) {
  if (!template) {
    return '';
  }
  return template.replace(/\{\{([^}]+)\}\}/g, '${$1}');
}

export function DesignerToolbarContent(props: {
  onExportToggle?: () => void;
  exportActive?: boolean;
  onAutoLayout?: () => void;
  autoLayoutBusy?: boolean;
}) {
  const { config, designerScope } = useDesignerContext();
  useDesignerSnapshotSelector<ToolbarSnapshot>((state) => ({
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
  const renderScope = useRenderScope();
  const scope = designerScope ?? renderScope;
  const env = runtime.env;

  const resolveToolbarValue = useCallback(
    <T,>(value: T): T => {
      if (typeof value === 'string') {
        return runtime.evaluate(normalizeTemplateSource(value), scope) as T;
      }
      return value;
    },
    [runtime, scope],
  );

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
    return (config.toolbar?.items ?? []).map((item, index) => {
      const key = `${item.type}:${index}`;
      if (item.type === 'title') {
        return { key, item: { ...item, body: String(resolveToolbarValue(item.body) ?? '') } };
      }
      if (item.type === 'text') {
        return { key, item: { ...item, text: String(resolveToolbarValue(item.text) ?? '') } };
      }
      if (item.type === 'badge') {
        return {
          key,
          item: {
            ...item,
            text: String(resolveToolbarValue(item.text) ?? ''),
            level: String(resolveToolbarValue(item.level) ?? ''),
          },
        };
      }
      if (item.type === 'button') {
        return {
          key,
          item: {
            ...item,
            disabled: resolveToolbarValue(item.disabled) === true,
            active: resolveToolbarValue(item.active) === true,
          },
        };
      }
      if (item.type === 'switch') {
        return {
          key,
          item: {
            ...item,
            disabled: resolveToolbarValue(item.disabled) === true,
            active: resolveToolbarValue(item.active) === true,
          },
        };
      }
      return { key, item };
    });
  }, [config.toolbar?.items, resolveToolbarValue]);

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
                  {item.body}
                </div>
              </div>
            </div>
          );
        }

        if (item.type === 'badge') {
          const level = item.level;
          return (
            <Badge
              key={key}
              variant={
                level === 'success' ? 'success' : level === 'warning' ? 'warning' : 'secondary'
              }
            >
              {item.text}
            </Badge>
          );
        }

        if (item.type === 'text') {
          return (
            <span key={key} className="text-sm text-muted-foreground whitespace-nowrap">
              {item.text}
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
