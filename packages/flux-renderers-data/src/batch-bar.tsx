import { useEffect, useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, cn } from '@nop-chaos/ui';
import { useCurrentComponentRegistry, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import type { BatchBarSchema } from './schemas.js';
import { toStringArray } from './table-renderer/table-data.js';
import { isDevRuntime } from './table-renderer/use-table-tree.js';

function areStringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

export function BatchBarRenderer(props: RendererComponentProps<BatchBarSchema>) {
  const slotProps = props.props as BatchBarSchema;
  const helpers = props.helpers;
  const registry = useCurrentComponentRegistry();

  const selectionPath =
    typeof slotProps.selectionPath === 'string' ? slotProps.selectionPath : '';
  const clearTarget =
    typeof slotProps.clearTarget === 'string' && slotProps.clearTarget.length > 0
      ? slotProps.clearTarget
      : undefined;
  const clearLabel =
    typeof slotProps.clearLabel === 'string' && slotProps.clearLabel.length > 0
      ? slotProps.clearLabel
      : undefined;

  const targetWarnedRef = useRef(false);
  const countWarnedRef = useRef(false);
  const pathWarnedRef = useRef(false);
  const renderScope = useRenderScope();

  const selection = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, selectionPath)),
    areStringArraysEqual,
    // 05-02: the disabled branch (no selectionPath) must resolve to `[]` so the
    // "never throws" promise in the comment below actually holds.
    { enabled: selectionPath.length > 0, fallback: [] },
  );

  // 22-02: one-shot dev diagnostic for "bar wired to a scope path that is never
  // written" — under the table default selectionOwnership:'local' the bound
  // selectionStatePath renders nothing, indistinguishable from "nothing
  // selected". Indirect ownership inference: the bar has no channel to read
  // the table's `selectionOwnership`, but a written key is visible in the
  // scope snapshot (crud hosts project `$crud.selectedRowKeys`; scope-owned
  // tables write `selectionStatePath` on every selection gesture), while the
  // default 'local' ownership never touches the path.
  // The check is deferred past the mount settle (macrotask timer): page `data`
  // init patches and crud `$crud` status publication flush in React effects,
  // so a first-render snapshot would misread an about-to-be-initialized path
  // as "never written". Dev-only: zero timers and zero noise in production.
  useEffect(() => {
    if (!isDevRuntime() || selectionPath.length === 0 || pathWarnedRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      if (pathWarnedRef.current) {
        return;
      }
      const snapshot = (renderScope.store?.getSnapshot() ??
        renderScope.readVisible()) as Record<string, unknown>;
      if (getIn(snapshot, selectionPath) !== undefined) {
        return;
      }
      pathWarnedRef.current = true;
      console.warn(
        `[flux:batch-bar] batch-bar-selection-path-unwritten: selectionPath "${selectionPath}" was never written in this scope, so the bar renders nothing — indistinguishable from an empty selection. Table host: the default selectionOwnership:'local' never writes this path; binding it requires selectionOwnership:'scope'. A written empty array is the normal hidden state and does not warn.`,
      );
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [selectionPath, renderScope]);

  // Built-in non-empty gate (batch-bar-empty): empty selection / missing path /
  // failed evaluation all resolve to an empty array — the envelope renders
  // nothing and never throws. Schema-level `visible` is enforced by the node
  // meta pipeline (wrapper short-circuit), so the effective visibility is the
  // AND of both gates.
  if (selection.length === 0) {
    return null;
  }

  const count = selection.length;

  let countText: string;
  const countTemplateProgram = props.templateNode.structuralFields?.countTemplate as
    | import('@nop-chaos/flux-core').CompiledRuntimeValue<unknown>
    | undefined;
  if (countTemplateProgram) {
    const templateScope = helpers.createScope({ count, selectedRowKeys: selection });
    try {
      const evaluated = helpers.evaluateCompiled<unknown>(countTemplateProgram, templateScope);
      countText = typeof evaluated === 'string' ? evaluated : String(evaluated);
    } catch (error) {
      countText = String(count);
      if (isDevRuntime() && !countWarnedRef.current) {
        countWarnedRef.current = true;
        console.warn(
          '[flux:batch-bar] batch-bar-count-expr: countTemplate evaluation failed; rendering the raw count instead.',
          error,
        );
      }
    } finally {
      helpers.disposeScope(templateScope.id);
    }
  } else {
    countText = t('flux.batchBar.selectedCount', { count });
  }

  const handleClear = () => {
    const handle = registry?.resolve({ componentId: clearTarget ?? '' });
    if (!handle) {
      if (isDevRuntime() && !targetWarnedRef.current) {
        targetWarnedRef.current = true;
        console.warn(
          `[flux:batch-bar] batch-bar-target-invalid: clearTarget "${clearTarget}" did not resolve to a component handle; clear is a no-op.`,
        );
      }
      return;
    }

    const hasClearSelection = handle.capabilities.hasMethod?.('clearSelection') ?? false;
    const hasSetSelection = handle.capabilities.hasMethod?.('setSelection') ?? false;

    if (hasClearSelection) {
      void handle.capabilities.invoke('clearSelection', undefined, {});
      return;
    }

    if (hasSetSelection) {
      void handle.capabilities.invoke('setSelection', { selectedRowKeys: [] }, {});
      return;
    }

    if (isDevRuntime() && !targetWarnedRef.current) {
      targetWarnedRef.current = true;
      console.warn(
        `[flux:batch-bar] batch-bar-target-invalid: clearTarget "${clearTarget}" exposes neither clearSelection nor setSelection; clear is a no-op.`,
      );
    }
  };

  const actionsContent = props.regions.actions?.render();

  return (
    <div
      className={cn(
        'nop-batch-bar flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm',
        props.meta.className,
      )}
      // 20-03: the bar is its own live region — mount/unmount (the empty-gate
      // flip) and count changes are announced politely to assistive tech.
      role="status"
      aria-live="polite"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="batch-bar"
      data-count={String(count)}
    >
      <span className="text-sm text-muted-foreground" data-slot="batch-bar-count">
        {countText}
      </span>
      {actionsContent != null && actionsContent !== false ? (
        <div className="flex flex-wrap items-center gap-2" data-slot="batch-bar-actions">
          {actionsContent as React.ReactNode}
        </div>
      ) : null}
      {clearTarget ? (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          data-testid={props.meta.testid ? `${props.meta.testid}-clear` : undefined}
          data-slot="batch-bar-clear"
          onClick={handleClear}
        >
          {clearLabel ?? t('flux.batchBar.clearSelection')}
        </Button>
      ) : null}
    </div>
  );
}
