import { useEffect, useRef } from 'react';
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { OrgNode } from '../../schemas-org.js';
import type { OrgDataState } from './use-org-data.js';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;

function WheelColumn(input: {
  nodes: OrgNode[];
  selectedId?: string;
  loading: boolean;
  interactive: boolean;
  label: string;
  onPick: (node: OrgNode) => void;
}) {
  const { nodes, selectedId, loading, interactive, label, onPick } = input;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<number | null>(null);
  // Clicks and programmatic scrolls momentarily move the list; settle-picking
  // during that window would override the explicit selection.
  const suppressUntilRef = useRef(0);
  const suppress = () => {
    suppressUntilRef.current = Date.now() + 600;
  };

  useEffect(() => {
    const index = nodes.findIndex((node) => node.id === selectedId);
    const el = scrollRef.current;
    if (index < 0 || !el) {
      return;
    }
    suppress();
    el.scrollTo({ top: index * ITEM_HEIGHT });
  }, [nodes, selectedId]);

  const pickNearest = () => {
    const el = scrollRef.current;
    if (!el || !interactive || Date.now() < suppressUntilRef.current) {
      return;
    }
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const node = nodes[Math.min(Math.max(index, 0), nodes.length - 1)];
    if (node && node.id !== selectedId) {
      onPick(node);
    }
  };

  return (
    <div className="flex-1" data-slot="region-wheel-column" data-wheel-label={label}>
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={label}
        className="snap-y snap-mandatory overflow-y-auto"
        style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}
        onScroll={() => {
          if (settleTimer.current != null) {
            window.clearTimeout(settleTimer.current);
          }
          settleTimer.current = window.setTimeout(pickNearest, 120);
        }}
      >
        <div style={{ height: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2 }} />
        {nodes.map((node) => (
          <div
            key={node.id}
            role="option"
            tabIndex={0}
            aria-selected={selectedId === node.id}
            data-node-id={node.id}
            data-selected={selectedId === node.id ? true : undefined}
            className="flex snap-center items-center justify-center text-sm data-selected:font-medium"
            style={{ height: ITEM_HEIGHT }}
            onClick={() => {
              suppress();
              onPick(node);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                suppress();
                onPick(node);
              }
            }}
          >
            {node.name}
          </div>
        ))}
        <div style={{ height: (ITEM_HEIGHT * (VISIBLE_ITEMS - 1)) / 2 }} />
      </div>
      {loading ? <div className="py-1 text-center text-xs text-muted-foreground">…</div> : null}
    </div>
  );
}

/**
 * Mobile wheel branch for input-city (plan 506): three scroll-snap columns in
 * a bottom Sheet (tree-select mobile precedent). Picking a province resets
 * the deeper columns and lazy-loads the next level; the deepest selection
 * commits via the confirm button.
 */
export function RegionWheel(input: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: OrgDataState;
  staticOptions: OrgNode[];
  path: OrgNode[];
  interactive: boolean;
  title: string;
  onPathChange: (path: OrgNode[]) => void;
  onCommit: (node: OrgNode, path: OrgNode[]) => void;
}) {
  const { open, onOpenChange, data, staticOptions, path, interactive, title, onPathChange, onCommit } = input;

  const level = (depth: number): OrgNode[] => {
    if (depth === 0) {
      return staticOptions.length > 0 ? staticOptions : data.children.rootState.nodes;
    }
    const parent = path[depth - 1];
    if (parent.children && parent.children.length > 0) {
      return parent.children;
    }
    return data.children.nodeStates[parent.id]?.nodes ?? [];
  };

  const pick = (depth: number, node: OrgNode) => {
    if (!interactive || node.id === path[depth]?.id) {
      return;
    }
    const next = [...path.slice(0, depth), node];
    if (depth < 2 && node.leaf !== true) {
      data.children.loadNode(node, depth + 1);
    }
    onPathChange(next);
  };

  const deepest = path[path.length - 1];

  return (
    <Sheet open={open} onOpenChange={(next) => interactive && onOpenChange(next)}>
      <SheetContent side="bottom" className="p-3" data-slot="region-wheel-sheet">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex gap-1" data-slot="region-wheel">
          {[0, 1, 2].map((depth) => (
            <WheelColumn
              key={depth}
              nodes={depth === 0 || path[depth - 1] ? level(depth) : []}
              selectedId={path[depth]?.id}
              loading={depth === 0 ? data.children.rootState.status === 'loading' : data.children.nodeStates[path[depth - 1]?.id]?.status === 'loading'}
              interactive={interactive && (depth === 0 || Boolean(path[depth - 1]))}
              label={depth === 0 ? t('flux.form.regionLevelProvince') : depth === 1 ? t('flux.form.regionLevelCity') : t('flux.form.regionLevelDistrict')}
              onPick={(node) => pick(depth, node)}
            />
          ))}
        </div>
        <Button
          type="button"
          className="mt-2 w-full"
          data-slot="region-wheel-confirm"
          disabled={!interactive || !deepest}
          onClick={() => deepest && onCommit(deepest, path)}
        >
          {t('flux.common.confirm')}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
