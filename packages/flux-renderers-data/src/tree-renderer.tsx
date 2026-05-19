import React, { useRef, useState } from 'react';
import type { InstanceFrame, RendererComponentProps } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@nop-chaos/ui';
import { ChevronRightIcon } from 'lucide-react';
import type { TreeSchema } from './schemas.js';

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

interface TreeNodeRecord {
  [key: string]: unknown;
}

const DEFAULT_CHILDREN_KEY = 'children';
const DEFAULT_LABEL_FIELD = 'label';
const DEFAULT_KEY_FIELD = 'id';
type TreeNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

function createTreeNodeRepeatedTemplateId(ownerId: string): string {
  return `tree-node:${ownerId}`;
}

function isTreeNodeRecord(value: unknown): value is TreeNodeRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTreeNodes(value: unknown): TreeNodeRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isTreeNodeRecord);
}

function toNodeKey(node: TreeNodeRecord, keyField: string, index: number): string {
  const explicitKey = getIn(node, keyField);

  if (explicitKey !== undefined && explicitKey !== null && explicitKey !== '') {
    return String(explicitKey);
  }

  return `node:${index}`;
}

function shouldExpandInitially(initiallyExpanded: unknown, depth: number): boolean {
  if (typeof initiallyExpanded === 'number') {
    return depth < initiallyExpanded;
  }

  return initiallyExpanded === true;
}

function createTreeNodeId(parentTreeNodeId: string | undefined, nodeKey: string): string {
  return parentTreeNodeId ? `${parentTreeNodeId}/${nodeKey}` : nodeKey;
}

function getVisibleTreeItems(root: HTMLDivElement | null): HTMLDivElement[] {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll<HTMLDivElement>('[role="treeitem"]'));
}

function getTreeItemDepth(element: HTMLDivElement | undefined): number {
  if (!element) {
    return 0;
  }

  const depth = Number(element.dataset.depth);
  return Number.isFinite(depth) ? depth : 0;
}

function getTreeItemNodeId(element: HTMLDivElement | undefined): string | undefined {
  return element?.dataset.treeNodeId;
}

function collectTreeNodeIds(
  nodes: readonly TreeNodeRecord[],
  childrenKey: string,
  keyField: string,
  parentTreeNodeId?: string,
): Set<string> {
  const nodeIds = new Set<string>();

  nodes.forEach((node, index) => {
    const nodeKey = toNodeKey(node, keyField, index);
    const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
    nodeIds.add(treeNodeId);

    collectTreeNodeIds(toTreeNodes(getIn(node, childrenKey)), childrenKey, keyField, treeNodeId).forEach(
      (childTreeNodeId) => {
        nodeIds.add(childTreeNodeId);
      },
    );
  });

  return nodeIds;
}

function TreeNodeRenderer(props: {
  owner: RendererComponentProps<TreeSchema>;
  node: TreeNodeRecord;
  index: number;
  depth: number;
  parentNode?: TreeNodeRecord;
  childrenKey: string;
  labelField: string;
  keyField: string;
  expandOnClickNode: boolean;
  initiallyExpanded?: boolean | number;
  parentInstancePath?: readonly InstanceFrame[];
  parentTreeNodeId?: string;
  repeatedTemplateId: string;
  activeNodeId?: string;
  setActiveNodeId: (nodeId: string) => void;
  focusNode: (nodeId: string) => void;
  moveFocus: (nodeId: string, key: TreeNavigationKey) => void;
  focusFirstChild: (nodeId: string, depth: number) => void;
  focusParent: (nodeId: string, depth: number) => void;
}) {
  const {
    owner,
    node,
    index,
    depth,
    parentNode,
    childrenKey,
    labelField,
    keyField,
    expandOnClickNode,
    initiallyExpanded,
    parentInstancePath,
    parentTreeNodeId,
    repeatedTemplateId,
    activeNodeId,
    setActiveNodeId,
    focusNode,
    moveFocus,
    focusFirstChild,
    focusParent,
  } = props;
  const nodeKey = toNodeKey(node, keyField, index);
  const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
  const instancePath = [...(parentInstancePath ?? []), { repeatedTemplateId, instanceKey: nodeKey }];
  const childNodes = toTreeNodes(getIn(node, childrenKey));
  const hasChildren = childNodes.length > 0;
  const [open, setOpen] = useState(
    () => hasChildren && shouldExpandInitially(initiallyExpanded, depth),
  );
  const label = getIn(node, labelField);
  const nodeContent = owner.regions.node
    ? owner.regions.node.render({
        bindings: { node, index, depth, key: nodeKey, parentNode },
        instancePath,
      })
    : null;
  const interactiveNode = hasChildren && expandOnClickNode;
  const isTabbable = (activeNodeId ?? treeNodeId) === treeNodeId;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && activeNodeId?.startsWith(`${treeNodeId}/`)) {
      setActiveNodeId(treeNodeId);
    }

    setOpen(nextOpen);
  };

  const toggleFromTreeItem = () => {
    if (!interactiveNode) {
      return;
    }

    handleOpenChange(!open);
  };

  return (
    <div data-slot="tree-node" data-depth={depth} data-node-key={nodeKey} data-tree-node-id={treeNodeId}>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div className="flex items-center gap-2" style={{ paddingInlineStart: `${depth * 16 + 8}px` }}>
          {hasChildren && !interactiveNode ? (
            <CollapsibleTrigger
              aria-label={open ? t('flux.common.collapse') : t('flux.common.expand')}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent"
              tabIndex={-1}
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                focusNode(treeNodeId);
              }}
            >
              <ChevronRightIcon
                className={cn('size-3.5 transition-transform', open ? 'rotate-90' : '')}
              />
            </CollapsibleTrigger>
          ) : hasChildren ? (
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <ChevronRightIcon
                className={cn('size-3.5 transition-transform', open ? 'rotate-90' : '')}
              />
            </span>
          ) : (
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            />
          )}

          <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            role="treeitem"
            aria-expanded={hasChildren ? open : undefined}
            aria-level={depth + 1}
            data-depth={depth}
            data-tree-node-id={treeNodeId}
            tabIndex={isTabbable ? 0 : -1}
            onFocus={() => {
              setActiveNodeId(treeNodeId);
            }}
            onClick={() => {
              setActiveNodeId(treeNodeId);
              toggleFromTreeItem();
            }}
            onKeyDown={(e) => {
              if (
                e.key === 'ArrowDown' ||
                e.key === 'ArrowUp' ||
                e.key === 'Home' ||
                e.key === 'End'
              ) {
                e.preventDefault();
                moveFocus(treeNodeId, e.key);
                return;
              }

              if (e.key === 'ArrowRight') {
                if (!hasChildren) {
                  return;
                }

                e.preventDefault();

                if (!open) {
                  handleOpenChange(true);
                  return;
                }

                focusFirstChild(treeNodeId, depth);
                return;
              }

              if (e.key === 'ArrowLeft') {
                if (hasChildren && open) {
                  e.preventDefault();
                  handleOpenChange(false);
                  return;
                }

                if (depth > 0) {
                  e.preventDefault();
                  focusParent(treeNodeId, depth);
                }

                return;
              }

              if ((e.key === 'Enter' || e.key === ' ') && hasChildren) {
                e.preventDefault();

                if (interactiveNode) {
                  handleOpenChange(!open);
                  return;
                }

                handleOpenChange(!open);
              }
            }}
          >
            {hasRendererSlotContent(asReactNode(nodeContent)) ? (
              asReactNode(nodeContent)
            ) : (
              <span>{String(label ?? nodeKey)}</span>
            )}
          </div>
        </div>

        {hasChildren ? (
          <CollapsibleContent>
            <div data-slot="tree-children" role="group">
              {childNodes.map((childNode, childIndex) => (
                <TreeNodeRenderer
                  key={`${nodeKey}:${toNodeKey(childNode, keyField, childIndex)}`}
                  owner={owner}
                  node={childNode}
                  index={childIndex}
                  depth={depth + 1}
                  parentNode={node}
                  childrenKey={childrenKey}
                  labelField={labelField}
                  keyField={keyField}
                   expandOnClickNode={expandOnClickNode}
                   initiallyExpanded={initiallyExpanded}
                   parentInstancePath={instancePath}
                   parentTreeNodeId={treeNodeId}
                   repeatedTemplateId={repeatedTemplateId}
                   activeNodeId={activeNodeId}
                   setActiveNodeId={setActiveNodeId}
                   focusNode={focusNode}
                   moveFocus={moveFocus}
                   focusFirstChild={focusFirstChild}
                   focusParent={focusParent}
                 />
               ))}
             </div>
           </CollapsibleContent>
        ) : null}
      </Collapsible>
    </div>
  );
}

export function TreeRenderer(props: RendererComponentProps<TreeSchema>) {
  const schemaProps = props.props as TreeSchema;
  const authoredSchema = props.templateNode.schema as TreeSchema | undefined;
  const data = toTreeNodes(schemaProps.data);
  const childrenKey =
    typeof schemaProps.childrenKey === 'string' && schemaProps.childrenKey
      ? schemaProps.childrenKey
      : DEFAULT_CHILDREN_KEY;
  const labelField =
    typeof schemaProps.labelField === 'string' && schemaProps.labelField
      ? schemaProps.labelField
      : DEFAULT_LABEL_FIELD;
  const keyField =
    typeof schemaProps.keyField === 'string' && schemaProps.keyField
      ? schemaProps.keyField
      : DEFAULT_KEY_FIELD;
  const expandOnClickNode = schemaProps.expandOnClickNode === true;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const treeLabel = String(
    (schemaProps.label ?? authoredSchema?.label ?? authoredSchema?.title ?? props.id ?? 'Tree') ||
      'Tree',
  );
  const statusPath =
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined;
  const repeatedTemplateId = createTreeNodeRepeatedTemplateId(props.id);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstRootNodeId = data[0] ? createTreeNodeId(undefined, toNodeKey(data[0], keyField, 0)) : undefined;
  const knownNodeIds = collectTreeNodeIds(data, childrenKey, keyField);
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(() => {
    return firstRootNodeId;
  });
  const resolvedActiveNodeId =
    activeNodeId && knownNodeIds.has(activeNodeId) ? activeNodeId : firstRootNodeId;

  const focusNode = (nodeId: string) => {
    const visibleTreeItems = getVisibleTreeItems(rootRef.current);
    const nextTreeItem = visibleTreeItems.find((item) => getTreeItemNodeId(item) === nodeId);

    if (!nextTreeItem) {
      return;
    }

    setActiveNodeId(nodeId);
    nextTreeItem.focus();
  };

  const moveFocus = (nodeId: string, key: TreeNavigationKey) => {
    const visibleTreeItems = getVisibleTreeItems(rootRef.current);
    if (visibleTreeItems.length === 0) {
      return;
    }

    const currentIndex = visibleTreeItems.findIndex((item) => getTreeItemNodeId(item) === nodeId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex =
      key === 'Home'
        ? 0
        : key === 'End'
          ? visibleTreeItems.length - 1
          : key === 'ArrowDown'
            ? Math.min(currentIndex + 1, visibleTreeItems.length - 1)
            : Math.max(currentIndex - 1, 0);

    const nextNodeId = getTreeItemNodeId(visibleTreeItems[nextIndex]);
    if (nextNodeId) {
      focusNode(nextNodeId);
    }
  };

  const focusFirstChild = (nodeId: string, depth: number) => {
    const visibleTreeItems = getVisibleTreeItems(rootRef.current);
    const currentIndex = visibleTreeItems.findIndex((item) => getTreeItemNodeId(item) === nodeId);
    if (currentIndex === -1) {
      return;
    }

    const nextItem = visibleTreeItems[currentIndex + 1];
    if (getTreeItemDepth(nextItem) !== depth + 1) {
      return;
    }

    const nextNodeId = getTreeItemNodeId(nextItem);
    if (nextNodeId) {
      focusNode(nextNodeId);
    }
  };

  const focusParent = (nodeId: string, depth: number) => {
    const visibleTreeItems = getVisibleTreeItems(rootRef.current);
    const currentIndex = visibleTreeItems.findIndex((item) => getTreeItemNodeId(item) === nodeId);
    if (currentIndex === -1) {
      return;
    }

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const candidate = visibleTreeItems[index];
      if (getTreeItemDepth(candidate) >= depth) {
        continue;
      }

      const candidateNodeId = getTreeItemNodeId(candidate);
      if (candidateNodeId) {
        focusNode(candidateNodeId);
      }
      return;
    }
  };

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, {
    kind: 'tree',
    nodeCount: data.length,
    childrenKey,
    keyField,
    labelField,
  });

  if (data.length === 0) {
    return (
      <div
        className={cn('nop-tree', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        role="tree"
        aria-label={treeLabel}
      >
        {hasRendererSlotContent(emptyContent) ? (
          <div data-slot="tree-empty">{emptyContent}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn('nop-tree', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      role="tree"
      aria-label={treeLabel}
    >
      {data.map((node, index) => (
        <TreeNodeRenderer
          key={toNodeKey(node, keyField, index)}
          owner={props}
          node={node}
          index={index}
          depth={0}
          parentInstancePath={props.node.instancePath}
          childrenKey={childrenKey}
          labelField={labelField}
          keyField={keyField}
          expandOnClickNode={expandOnClickNode}
          initiallyExpanded={schemaProps.initiallyExpanded as boolean | number | undefined}
          repeatedTemplateId={repeatedTemplateId}
          activeNodeId={resolvedActiveNodeId}
          setActiveNodeId={setActiveNodeId}
          focusNode={focusNode}
          moveFocus={moveFocus}
          focusFirstChild={focusFirstChild}
          focusParent={focusParent}
        />
      ))}
    </div>
  );
}
