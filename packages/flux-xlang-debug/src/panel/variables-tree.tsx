import { useStore } from 'zustand/react';
import { useEffect, useState } from 'react';
import type { DebugClient } from '../client/debug-client.js';
import type { DebugStore } from '../state/debug-store.js';
import { t } from '@nop-chaos/flux-i18n';

interface VarRow {
  name: string;
  value?: string;
}

interface TreeNode {
  name: string;
  expr: string;
  children?: TreeNode[];
}

function buildChildrenExpr(parentExpr: string, name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? `${parentExpr}.${name}` : `${parentExpr}[${JSON.stringify(name)}]`;
}

export interface VariablesTreeProps {
  store: DebugStore;
  client: DebugClient;
  threadId: number;
  frameIndex: number;
}

/**
 * 变量树（plan 620 F1 修订）：getFrameVariables(threadId, frameIndex) 主列表随
 * frame 切换刷新；懒展开子节点经 expandExprValue（keys ≤50）；>1000 条截断提示
 * （F6）。数据不进 store——按 threadId 直查（D5 §3.4）。
 */
export function VariablesTree({ store, client, threadId, frameIndex }: VariablesTreeProps) {
  const suspended = useStore(store, (s) => s.suspended);
  const [roots, setRoots] = useState<VarRow[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, TreeNode[]>>({});
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = client
      .query<{ vars: VarRow[] | null; truncated?: boolean }>('debugger.getFrameVariables', { threadId, frameIndex })
      .then((result) => {
        if (cancelled) return;
        setRoots(result?.vars ?? []);
        setTruncated(result?.truncated === true);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
      void load;
    };
  }, [client, threadId, frameIndex]);

  if (loadFailed) {
    return <div className="xlang-debug-error" data-testid="xlang-debug-vars-error">{t('flux.xlangDebug.loadFailed')}</div>;
  }
  if (suspended.length === 0) {
    return <div data-testid="xlang-debug-not-suspended">{t('flux.xlangDebug.noSuspendedThread')}</div>;
  }

  const toggle = async (node: TreeNode) => {
    const key = node.expr;
    if (expanded[key]) {
      setExpanded((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    const result = await client
      .query<{ vars: Array<{ name?: string }> | null; truncated?: boolean }>(
        'debugger.expandExprValue',
        { threadId, frameIndex, expr: node.expr, keys: [{ name: node.name }] },
      )
      .catch(() => null);
    const children: TreeNode[] = (result?.vars ?? []).map((child) => {
      const childName = String(child.name ?? '');
      return { name: childName, expr: buildChildrenExpr(node.expr, childName) };
    });
    if (result?.truncated) {
      setTruncated(true); // F6：子节点超限截断提示
    }
    setExpanded((prev) => ({ ...prev, [key]: children }));
  };

  const renderNode = (node: TreeNode, depth: number) => (
    <div key={node.expr}>
      <button
        type="button"
        className="xlang-debug-var-node"
        style={{ paddingLeft: `${depth * 12}px` }}
        onClick={() => void toggle(node)}
      >
        <span className="xlang-debug-var-name">{node.name}</span>
      </button>
      {expanded[node.expr]?.map((child) => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="xlang-debug-vars" data-testid="xlang-debug-vars">
      {(roots ?? []).map((row) => renderNode({ name: row.name ?? '', expr: row.name ?? '' }, 0))}
      {truncated && <div className="xlang-debug-truncated" data-testid="xlang-debug-truncated">{t('flux.xlangDebug.truncated')}</div>}
      {(roots ?? []).length === 0 && <div>{t('flux.xlangDebug.emptyVariables')}</div>}
    </div>
  );
}
