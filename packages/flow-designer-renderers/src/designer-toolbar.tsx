import React, { useMemo } from 'react';
import { useDesignerContext } from './designer-context';
import { DesignerIcon } from './designer-icon';

type ToolbarItemLike = {
  type?: string;
  label?: string;
  text?: string;
  body?: string;
  level?: string;
  action?: string;
  icon?: string;
  disabled?: boolean | string;
  active?: boolean | string;
  variant?: 'default' | 'primary' | 'danger';
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function readState(name: string, snapshot: ReturnType<typeof useDesignerContext>['snapshot']) {
  switch (name) {
    case 'canUndo':
      return snapshot.canUndo;
    case 'canRedo':
      return snapshot.canRedo;
    case 'isDirty':
      return snapshot.isDirty;
    case 'gridEnabled':
      return snapshot.gridEnabled;
    default:
      return undefined;
  }
}

function evalBooleanExpr(value: boolean | string | undefined, snapshot: ReturnType<typeof useDesignerContext>['snapshot']) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  const expr = trimmed.startsWith('${') && trimmed.endsWith('}') ? trimmed.slice(2, -1).trim() : trimmed;
  if (expr.startsWith('!')) {
    return !readState(expr.slice(1).trim(), snapshot);
  }
  return readState(expr, snapshot) === true;
}

function evalTextTemplate(template: string | undefined, snapshot: ReturnType<typeof useDesignerContext>['snapshot']) {
  if (!template) return '';

  const trimmed = template.trim();
  if (trimmed.startsWith('${') && trimmed.endsWith('}')) {
    const expr = trimmed.slice(2, -1).trim();
    const ternaryMatch = expr.match(/^([A-Za-z0-9_.]+)\s*\?\s*'([^']*)'\s*:\s*'([^']*)'$/);
    if (ternaryMatch) {
      const [, cond, left, right] = ternaryMatch;
      return readState(cond, snapshot) === true ? left : right;
    }
  }

  return template.replace(/\$\{([^}]+)\}/g, (_full, exprSource: string) => {
    const expr = exprSource.trim();
    if (expr === 'doc.name') return snapshot.doc.name;
    if (expr === 'doc.nodes.length') return String(snapshot.doc.nodes.length);
    if (expr === 'doc.edges.length') return String(snapshot.doc.edges.length);
    if (expr === 'isDirty') return String(snapshot.isDirty);
    if (expr === 'canUndo') return String(snapshot.canUndo);
    if (expr === 'canRedo') return String(snapshot.canRedo);
    if (expr === 'gridEnabled') return String(snapshot.gridEnabled);
    return '';
  });
}

function toCommand(action: string | undefined): import('./designer-command-adapter').DesignerCommand | null {
  switch (action) {
    case 'designer:undo':
      return { type: 'undo' };
    case 'designer:redo':
      return { type: 'redo' };
    case 'designer:toggle-grid':
      return { type: 'toggleGrid' };
    case 'designer:restore':
      return { type: 'restore' };
    case 'designer:save':
      return { type: 'save' };
    case 'designer:export':
      return { type: 'export' };
    default:
      return null;
  }
}

export function DesignerToolbarContent() {
  const { config, snapshot, dispatch } = useDesignerContext();

  const items = useMemo(() => {
    return ((config.toolbar?.items ?? []) as unknown as ToolbarItemLike[]).map((item, index) => ({
      key: `${item.type ?? 'item'}:${index}`,
      item
    }));
  }, [config.toolbar?.items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fd-toolbar" data-testid="designer-toolbar">
      {items.map(({ key, item }) => {
        if (item.type === 'divider') {
          return <span key={key} className="fd-toolbar__divider" aria-hidden="true" />;
        }

        if (item.type === 'spacer') {
          return <span key={key} className="fd-toolbar__spacer" aria-hidden="true" />;
        }

        if (item.type === 'title') {
          return <h2 key={key} className="fd-toolbar__title">{evalTextTemplate(item.body ?? item.text, snapshot)}</h2>;
        }

        if (item.type === 'badge') {
          const level = evalTextTemplate(item.level, snapshot);
          return (
            <span key={key} className={classNames('fd-type-badge', level && `fd-type-badge--${level}`)}>
              {evalTextTemplate(item.text ?? item.body, snapshot)}
            </span>
          );
        }

        if (item.type === 'text') {
          return <span key={key} className="fd-toolbar__meta">{evalTextTemplate(item.body ?? item.text, snapshot)}</span>;
        }

        if (item.type === 'back') {
          return (
            <button key={key} type="button" className="fd-toolbar__button" aria-label="Back">
              <DesignerIcon icon="arrow-left" className="nop-icon nop-icon--arrow-left" />
            </button>
          );
        }

        if (item.type === 'button') {
          const command = toCommand(item.action);
          const disabled = evalBooleanExpr(item.disabled, snapshot);
          const active = evalBooleanExpr(item.active, snapshot);
          return (
            <button
              key={key}
              type="button"
              className={classNames(
                'fd-toolbar__button',
                item.variant === 'primary' && 'fd-toolbar__button--primary',
                item.variant === 'danger' && 'fd-toolbar__button--danger',
                active && 'fd-toolbar__button--active'
              )}
              disabled={disabled}
              onClick={() => {
                if (command) {
                  dispatch(command);
                }
              }}
            >
              {item.icon ? <DesignerIcon icon={item.icon} className={`nop-icon nop-icon--${item.icon}`} /> : null}
              {item.label ? <span>{item.label}</span> : null}
            </button>
          );
        }

        return null;
      })}
    </div>
  );
}
