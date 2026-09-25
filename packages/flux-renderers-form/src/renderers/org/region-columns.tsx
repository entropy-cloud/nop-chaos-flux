import { Spinner } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { OrgNode } from '../../schemas-org.js';
import type { OrgDataState } from './use-org-data.js';

function Column(input: {
  nodes: OrgNode[];
  selectedId?: string;
  loading: boolean;
  interactive: boolean;
  error?: string;
  onSelectNode: (node: OrgNode) => void;
  onExpandNode: (node: OrgNode) => void;
  onRetry: () => void;
}) {
  const { nodes, selectedId, loading, interactive, error, onSelectNode, onExpandNode, onRetry } = input;
  return (
    <div className="flex w-44 flex-col overflow-y-auto border-r last:border-r-0" data-slot="region-column">
      {error ? (
        <div className="p-2 text-center text-xs text-destructive" data-slot="region-error">
          {error}
          <button
            type="button"
            data-slot="region-retry"
            className="ml-1 underline hover:text-foreground"
            onClick={onRetry}
          >
            {t('flux.form.orgRetry')}
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-4" data-slot="region-loading">
          <Spinner className="size-4" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="p-2 text-center text-xs text-muted-foreground" data-slot="region-empty">
          {t('flux.form.orgEmpty')}
        </div>
      ) : (
        nodes.map((node) => (
          <div
            key={node.id}
            data-slot="region-node"
            data-node-id={node.id}
            data-node-type={node.type ?? ''}
            data-selected={selectedId === node.id ? true : undefined}
            data-disabled={node.disabled === true || !interactive ? true : undefined}
            className="flex items-center gap-0.5 rounded-sm px-1 py-0.5 hover:bg-accent data-selected:bg-accent"
          >
            <button
              type="button"
              data-slot="region-node-name"
              className="flex-1 truncate text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={node.disabled === true || !interactive}
              title={node.disabledTip}
              onClick={() => onSelectNode(node)}
            >
              {node.name}
            </button>
            {node.leaf !== true ? (
              <button
                type="button"
                data-slot="region-node-expand"
                className="rounded-sm px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={node.name}
                disabled={!interactive}
                onClick={() => onExpandNode(node)}
              >
                ›
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Desktop cascader columns for input-city (plan 506): province → city →
 * district. Clicking a name commits that level; the chevron drills down
 * (lazy-loads the next level via the shared org data surface). Selecting a
 * higher-level column node truncates the path back to that depth.
 */
export function RegionColumns(input: {
  data: OrgDataState;
  staticOptions: OrgNode[];
  path: OrgNode[];
  interactive: boolean;
  onCommit: (node: OrgNode, path: OrgNode[]) => void;
  onPathChange: (path: OrgNode[]) => void;
}) {
  const { data, staticOptions, path, interactive, onCommit, onPathChange } = input;

  const level = (depth: number): { nodes: OrgNode[]; loading: boolean; error?: string } => {
    if (depth === 0) {
      const state = data.children.rootState;
      return {
        nodes: staticOptions.length > 0 ? staticOptions : state.nodes,
        loading: state.status === 'loading',
        error: state.error,
      };
    }
    const parent = path[depth - 1];
    const state = data.children.nodeStates[parent.id];
    if (parent.children && parent.children.length > 0) {
      return { nodes: parent.children, loading: false };
    }
    return { nodes: state?.nodes ?? [], loading: state?.status === 'loading', error: state?.error };
  };

  const columnCount = Math.min(path.length + 1, 3);
  const columns = Array.from({ length: columnCount }, (_, depth) => level(depth));

  return (
    <div className="flex" data-slot="region-columns">
      {columns.map((column, depth) => (
        <Column
          key={path[depth - 1]?.id ?? 'root'}
          nodes={column.nodes}
          selectedId={path[depth]?.id}
          loading={column.loading}
          interactive={interactive}
          error={column.error}
          onSelectNode={(node) => onCommit(node, [...path.slice(0, depth), node])}
          onExpandNode={(node) => {
            data.children.loadNode(node, depth + 1);
            onPathChange([...path.slice(0, depth), node]);
          }}
          onRetry={() =>
            depth === 0 ? data.children.retryRoot() : data.children.retryNode(path[depth - 1], depth)
          }
        />
      ))}
    </div>
  );
}
