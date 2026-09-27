/**
 * 大纲树（S1 §11.2 左栏两 tab 之一的「结构树」位；S1 §10.1 opaque-leaf 行为收敛：
 * 不展开其子树，唯一结构操作是整体替换与删除）。
 *
 * 树 = working 文档投影（无第二存储）；行点击 → `onSelect`（宿主 setSelection）。
 */

import { useMemo } from 'react';
import { isSchema } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import {
  classifyNode,
  getChildContainerKeys,
  getRegionChildren,
  getSessionId,
} from '@nop-chaos/page-designer-core';

export interface StructureTreeProps {
  document: SchemaInput;
  registry: RendererRegistry;
  selection: readonly SessionNodeId[];
  onSelect(nodeId: SessionNodeId): void;
}

interface TreeRow {
  sid: SessionNodeId;
  label: string;
  type: string;
  depth: number;
  selectable: boolean;
}

function labelFor(node: BaseSchema, registry: RendererRegistry): string {
  const record = node as unknown as Record<string, unknown>;
  const definition = registry.get(record.type as string);
  const display =
    typeof record.label === 'string' && record.label.length > 0
      ? record.label
      : typeof record.name === 'string' && record.name.length > 0
        ? record.name
        : typeof record.text === 'string' && record.text.length > 0
          ? record.text
          : undefined;
  return display ?? definition?.displayName ?? (record.type as string);
}

function collectRows(
  node: unknown,
  registry: RendererRegistry,
  depth: number,
  out: TreeRow[],
): void {
  if (!isSchema(node)) return;
  const record = node as unknown as Record<string, unknown>;
  const sid = getSessionId(node);
  if (!sid) return;
  const definition = registry.get(record.type as string);
  const opaque = definition ? classifyNode(definition) === 'opaque-leaf' : false;
  out.push({ sid, type: record.type as string, label: labelFor(node, registry), depth, selectable: true });
  if (opaque) return;
  const { keys } = getChildContainerKeys(node, registry);
  for (const key of keys) {
    getRegionChildren(node, key).forEach((child) => collectRows(child, registry, depth + 1, out));
  }
}

export function StructureTree(props: StructureTreeProps) {
  const rows = useMemo(() => {
    const out: TreeRow[] = [];
    if (Array.isArray(props.document)) {
      props.document.forEach((item) => collectRows(item, props.registry, 0, out));
    } else {
      collectRows(props.document, props.registry, 0, out);
    }
    return out;
  }, [props.document, props.registry]);

  return (
    <div className="h-full min-h-0 overflow-y-auto" data-testid="page-designer-structure-tree">
      {rows.map((row) => (
        <button
          key={row.sid}
          type="button"
          data-testid={`page-designer-tree-node-${row.sid}`}
          data-tree-node-type={row.type}
          className={`block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-[var(--nop-nav-hover-border,#f3f4f6)] ${
            props.selection.includes(row.sid)
              ? 'bg-[var(--nop-accent-muted,#eef2ff)] text-[var(--nop-accent,#6366f1)]'
              : ''
          }`}
          style={{ paddingLeft: `${8 + row.depth * 14}px` }}
          onClick={() => props.onSelect(row.sid)}
        >
          <span className="mr-1.5 font-mono text-[10px] uppercase text-[var(--nop-eyebrow,#9ca3af)]">
            {row.type}
          </span>
          {row.label}
        </button>
      ))}
    </div>
  );
}
