import React, { useEffect, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { publishOwnerStatus } from '@nop-chaos/flux-runtime';
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger, cn } from '@nop-chaos/ui';
import { ChevronRightIcon, DotIcon } from 'lucide-react';
import type { TreeSchema } from './schemas';

interface TreeNodeRecord {
  [key: string]: unknown;
}

const DEFAULT_CHILDREN_KEY = 'children';
const DEFAULT_LABEL_FIELD = 'label';
const DEFAULT_KEY_FIELD = 'id';

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
}) {
  const { owner, node, index, depth, parentNode, childrenKey, labelField, keyField, expandOnClickNode, initiallyExpanded } = props;
  const nodeKey = toNodeKey(node, keyField, index);
  const childNodes = toTreeNodes(getIn(node, childrenKey));
  const hasChildren = childNodes.length > 0;
  const [open, setOpen] = useState(() => hasChildren && shouldExpandInitially(initiallyExpanded, depth));
  const label = getIn(node, labelField);
  const nodeContent = owner.regions.node
    ? owner.regions.node.render({
        bindings: { node, index, depth, key: nodeKey, parentNode }
      })
    : null;

  return (
    <div data-slot="tree-node" data-depth={depth} data-node-key={nodeKey}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-2" style={{ paddingInlineStart: `${depth * 16}px` }}>
          {hasChildren ? (
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={open ? 'Collapse node' : 'Expand node'}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen((previous) => !previous);
                  }}
                >
                  <ChevronRightIcon className={cn('size-3.5 transition-transform', open ? 'rotate-90' : '')} />
                </Button>
              }
            />
          ) : (
            <span className="inline-flex size-6 items-center justify-center text-muted-foreground" aria-hidden="true">
              <DotIcon className="size-3.5" />
            </span>
          )}

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            onClick={() => {
              if (hasChildren && expandOnClickNode) {
                setOpen((previous) => !previous);
              }
            }}
          >
            {hasRendererSlotContent(nodeContent) ? nodeContent : <span>{String(label ?? nodeKey)}</span>}
          </button>
        </div>

        {hasChildren ? (
          <CollapsibleContent>
            <div data-slot="tree-children">
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
  const data = toTreeNodes(schemaProps.data);
  const childrenKey = typeof schemaProps.childrenKey === 'string' && schemaProps.childrenKey ? schemaProps.childrenKey : DEFAULT_CHILDREN_KEY;
  const labelField = typeof schemaProps.labelField === 'string' && schemaProps.labelField ? schemaProps.labelField : DEFAULT_LABEL_FIELD;
  const keyField = typeof schemaProps.keyField === 'string' && schemaProps.keyField ? schemaProps.keyField : DEFAULT_KEY_FIELD;
  const expandOnClickNode = schemaProps.expandOnClickNode === true;
  const emptyContent = resolveRendererSlotContent(props, 'empty', { fallback: 'No tree nodes' });
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;

  useEffect(() => {
    if (!statusPath) {
      return;
    }

    publishOwnerStatus(props.node.scope.parent ?? props.node.scope, statusPath, {
      kind: 'tree',
      nodeCount: data.length,
      childrenKey,
      keyField,
      labelField
    });
  }, [props.node.scope, statusPath, data.length, childrenKey, keyField, labelField]);

  if (data.length === 0) {
    return (
      <div className={cn('nop-tree', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {hasRendererSlotContent(emptyContent) ? <div data-slot="tree-empty">{emptyContent}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn('nop-tree', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
      {data.map((node, index) => (
        <TreeNodeRenderer
          key={toNodeKey(node, keyField, index)}
          owner={props}
          node={node}
          index={index}
          depth={0}
          childrenKey={childrenKey}
          labelField={labelField}
          keyField={keyField}
          expandOnClickNode={expandOnClickNode}
          initiallyExpanded={schemaProps.initiallyExpanded as boolean | number | undefined}
        />
      ))}
    </div>
  );
}
