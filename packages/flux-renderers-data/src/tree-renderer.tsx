import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { InstanceFrame, RendererComponentProps } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import {
  hasRendererSlotContent,
  resolveRendererSlotContent,
  useStatusPathPublication,
} from '@nop-chaos/flux-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  cn,
  resolveLucideIcon,
} from '@nop-chaos/ui';
import { ChevronRightIcon } from 'lucide-react';
import type { TreeSchema } from './schemas.js';
import {
  createTreeNodeId,
  createTreeNodeRepeatedTemplateId,
  shouldExpandInitially,
  toNodeKey,
  toTreeNodes,
  type TreeNodeRecord,
  DEFAULT_CHILDREN_KEY,
  DEFAULT_KEY_FIELD,
  DEFAULT_LABEL_FIELD,
} from './tree-node-helpers.js';
import type { TreeNavigationKey } from './tree-focus-nav.js';
import {
  getTreeItemDepth,
  getTreeItemNodeId,
  getVisibleTreeItems,
} from './tree-focus-nav.js';
import {
  collectTreeNodeIds,
  computeTreeSearch,
  EMPTY_TREE_SEARCH,
  renderHighlightedLabel,
  type TreeSearchState,
} from './tree-search.js';

const TREE_EXPANDED_CHILD_BATCH_SIZE = 50;
const TREE_INDENT_PX = 16;
const TREE_BASE_PADDING_PX = 8;

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function renderNodeIcon(node: TreeNodeRecord, iconField: string): React.ReactNode {
  const rawIcon = getIn(node, iconField);
  if (rawIcon === undefined || rawIcon === null || rawIcon === '') {
    return null;
  }

  const Icon = resolveLucideIcon(String(rawIcon));
  return (
    <Icon
      data-slot="tree-node-icon"
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground"
    />
  );
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
  searchState: TreeSearchState;
  showIcon: boolean;
  iconField: string | undefined;
  showGuideLine: boolean;
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
    searchState,
    showIcon,
    iconField,
    showGuideLine,
  } = props;
  const nodeKey = toNodeKey(node, keyField, index);
  const treeNodeId = createTreeNodeId(parentTreeNodeId, nodeKey);
  const instancePath = [...(parentInstancePath ?? []), { repeatedTemplateId, instanceKey: nodeKey }];
  const childNodes = toTreeNodes(getIn(node, childrenKey));
  const hasChildren = childNodes.length > 0;
  const initiallyOpen = hasChildren && shouldExpandInitially(initiallyExpanded, depth);
  const [open, setOpen] = useState(() => initiallyOpen);
  const searchActive = searchState.active;
  const searchForcedOpen = searchActive && searchState.forcedOpenNodeIds.has(treeNodeId);
  const effectiveOpen = searchActive ? searchForcedOpen : open;
  const [renderedChildCount, setRenderedChildCount] = useState(() => {
    if (!initiallyOpen) {
      return 0;
    }

    if (childNodes.length <= TREE_EXPANDED_CHILD_BATCH_SIZE) {
      return childNodes.length;
    }

    return TREE_EXPANDED_CHILD_BATCH_SIZE;
  });
  const label = getIn(node, labelField);
  const nodeContent = owner.regions.node
    ? owner.regions.node.render({
        bindings: { node, index, depth, key: nodeKey, parentNode },
        instancePath,
      })
    : null;
  const interactiveNode = hasChildren && expandOnClickNode;
  const isTabbable = (activeNodeId ?? treeNodeId) === treeNodeId;

  React.useEffect(() => {
    if (searchActive) {
      return;
    }

    if (!open) {
      setRenderedChildCount(0);
      return;
    }

    if (childNodes.length <= TREE_EXPANDED_CHILD_BATCH_SIZE) {
      setRenderedChildCount(childNodes.length);
      return;
    }

    // H17: incremental chunking. The first batch renders synchronously; each
    // subsequent batch is scheduled via a 0ms timer that only appends one batch
    // (`prev + BATCH`) and re-arms (via the renderedChildCount dep) until it
    // catches up to childNodes.length. Previously a single 0ms timer jumped
    // straight to the full length, locking the main thread for 5k–50k children.
    if (renderedChildCount >= childNodes.length) {
      return;
    }

    if (renderedChildCount < TREE_EXPANDED_CHILD_BATCH_SIZE) {
      setRenderedChildCount(TREE_EXPANDED_CHILD_BATCH_SIZE);
      return;
    }

    const timer = window.setTimeout(() => {
      setRenderedChildCount((previous) =>
        Math.min(previous + TREE_EXPANDED_CHILD_BATCH_SIZE, childNodes.length),
      );
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [childNodes.length, open, searchActive, renderedChildCount]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (searchActive) {
      return;
    }

    if (!nextOpen && activeNodeId?.startsWith(`${treeNodeId}/`)) {
      setActiveNodeId(treeNodeId);
    }

    setOpen(nextOpen);
  };

  const toggleFromTreeItem = () => {
    if (!interactiveNode) {
      return;
    }

    handleOpenChange(effectiveOpen ? false : true);
  };

  if (searchActive && !searchState.visibleNodeIds.has(treeNodeId)) {
    return null;
  }

  const childRenderCount = searchActive ? childNodes.length : renderedChildCount;
  const rowPaddingInlineStart = showGuideLine
    ? TREE_BASE_PADDING_PX
    : depth * TREE_INDENT_PX + TREE_BASE_PADDING_PX;
  const labelString = String(label ?? nodeKey);
  const hasCustomNodeContent = hasRendererSlotContent(asReactNode(nodeContent));

  return (
    <div data-slot="tree-node" data-depth={depth} data-node-key={nodeKey} data-tree-node-id={treeNodeId}>
      <Collapsible open={effectiveOpen} onOpenChange={handleOpenChange}>
        <div
          data-slot="tree-node-row"
          data-tree-node-id={treeNodeId}
          className="flex items-center gap-2"
          style={{ paddingInlineStart: `${rowPaddingInlineStart}px` }}
        >
          {showGuideLine && depth > 0
            ? Array.from({ length: depth }, (_, guideIndex) => (
                <span
                  key={`tree-guide-${guideIndex}`}
                  data-slot="tree-guide-line"
                  aria-hidden="true"
                  className="inline-block w-4 shrink-0 self-stretch border-l border-border"
                />
              ))
            : null}
          {hasChildren && !interactiveNode ? (
            <CollapsibleTrigger
              aria-label={effectiveOpen ? t('flux.common.collapse') : t('flux.common.expand')}
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
                className={cn('size-3.5 transition-transform', effectiveOpen ? 'rotate-90' : '')}
              />
            </CollapsibleTrigger>
          ) : hasChildren ? (
            <span
              className="inline-flex size-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <ChevronRightIcon
                className={cn('size-3.5 transition-transform', effectiveOpen ? 'rotate-90' : '')}
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
            aria-expanded={hasChildren ? effectiveOpen : undefined}
            aria-level={depth + 1}
            aria-selected={isTabbable}
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

                if (!effectiveOpen) {
                  handleOpenChange(true);
                  return;
                }

                focusFirstChild(treeNodeId, depth);
                return;
              }

              if (e.key === 'ArrowLeft') {
                if (hasChildren && effectiveOpen) {
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
                handleOpenChange(effectiveOpen ? false : true);
              }
            }}
          >
            {hasCustomNodeContent ? (
              asReactNode(nodeContent)
            ) : (
              <>
                {showIcon && iconField ? renderNodeIcon(node, iconField) : null}
                {searchActive
                  ? renderHighlightedLabel(labelString, searchState.query)
                  : <span>{labelString}</span>}
              </>
            )}
          </div>
        </div>

        {hasChildren ? (
          <CollapsibleContent>
            <div data-slot="tree-children" role="group">
              {childNodes.slice(0, childRenderCount).map((childNode, childIndex) => (
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
                  searchState={searchState}
                  showIcon={showIcon}
                  iconField={iconField}
                  showGuideLine={showGuideLine}
                />
              ))}
              {effectiveOpen && childRenderCount < childNodes.length ? (
                <div data-slot="tree-children-more" hidden aria-hidden="true" />
              ) : null}
              </div>
            </CollapsibleContent>
          ) : null}
      </Collapsible>
    </div>
  );
}

export function TreeRenderer(props: RendererComponentProps<TreeSchema>) {
  const schemaProps = props.props as TreeSchema;
  // `toTreeNodes` returns a fresh array every call, which would defeat the React
  // Compiler's auto-memoization of the O(N) tree walks below. Memoize the parsed
  // nodes on the raw data so `collectTreeNodeIds` / `computeTreeSearch` are stable.
  const data = useMemo(() => toTreeNodes(schemaProps.data), [schemaProps.data]);
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
  const searchable = schemaProps.searchable === true;
  const showIcon = schemaProps.showIcon === true;
  const iconField =
    typeof schemaProps.iconField === 'string' && schemaProps.iconField
      ? schemaProps.iconField
      : undefined;
  const showGuideLine = schemaProps.showGuideLine === true;
  const emptyContent = resolveRendererSlotContent(props, 'empty', {
    fallback: t('flux.common.noData'),
  });
  const treeLabel = String(schemaProps.label || schemaProps.title || props.id || 'Tree');
  const multiple = schemaProps.multiple === true;
  const statusPath =
    typeof schemaProps.statusPath === 'string' ? schemaProps.statusPath : undefined;
  const repeatedTemplateId = createTreeNodeRepeatedTemplateId(props.id);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const firstRootNodeId = data[0] ? createTreeNodeId(undefined, toNodeKey(data[0], keyField, 0)) : undefined;
  const knownNodeIds = collectTreeNodeIds(data, childrenKey, keyField);
  const [activeNodeId, setActiveNodeId] = useState<string | undefined>(() => {
    return firstRootNodeId;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const searchState = searchable
    ? computeTreeSearch(data, searchQuery, childrenKey, labelField, keyField)
    : EMPTY_TREE_SEARCH;
  const searchActive = searchState.active;
  const searchHasMatch = searchState.visibleNodeIds.size > 0;
  const resolvedActiveNodeId =
    activeNodeId && knownNodeIds.has(activeNodeId) ? activeNodeId : firstRootNodeId;

  // G17: when the active node disappears (e.g. a data refresh removed it), DOM
  // focus would otherwise fall back to <body>, stranding keyboard users outside
  // the tree. If focus was lost to <body>, move it back onto the resolved active
  // landing node so roving-tabIndex and real focus stay aligned.
  useEffect(() => {
    if (activeNodeId && knownNodeIds.has(activeNodeId)) {
      return;
    }
    if (typeof document === 'undefined' || document.activeElement !== document.body) {
      return;
    }
    const target = resolvedActiveNodeId;
    if (!target) {
      return;
    }
    const targetItem = getVisibleTreeItems(rootRef.current).find(
      (item) => getTreeItemNodeId(item) === target,
    );
    targetItem?.focus({ preventScroll: true });
  }, [activeNodeId, knownNodeIds, resolvedActiveNodeId]);

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
        aria-multiselectable={multiple || undefined}
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
      aria-multiselectable={multiple || undefined}
    >
      {searchable ? (
        <div data-slot="tree-search" className="px-1 pb-2">
          <Input
            data-slot="tree-search-input"
            type="search"
            size="sm"
            placeholder={t('flux.common.search')}
            value={searchQuery}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setSearchQuery(event.target.value);
            }}
          />
        </div>
      ) : null}
      {searchActive && !searchHasMatch
        ? hasRendererSlotContent(emptyContent)
          ? <div data-slot="tree-empty">{emptyContent}</div>
          : <div data-slot="tree-empty" className="px-2 py-1.5 text-sm text-muted-foreground">{t('flux.common.noData')}</div>
        : data.map((node, index) => (
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
          searchState={searchState}
          showIcon={showIcon}
          iconField={iconField}
          showGuideLine={showGuideLine}
        />
      ))}
    </div>
  );
}
