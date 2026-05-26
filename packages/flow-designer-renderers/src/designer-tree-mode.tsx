import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DesignerConfig, GraphDocument, TreeDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import type { DesignerPageSchema } from './schemas.js';
import { computeTreeModeDocument } from './designer-page-helpers.js';
import { DesignerPageInner } from './designer-page-inner.js';

function toComparableTreeGraphDocument(document: GraphDocument) {
  return {
    id: document.id,
    kind: document.kind,
    name: document.name,
    version: document.version,
    meta: document.meta,
    nodes: document.nodes,
    edges: document.edges,
  };
}

function areRecordsEqual(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return left === right;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return Array.isArray(leftValue) && Array.isArray(rightValue) && areArraysEqual(leftValue, rightValue);
    }
    if (leftValue && rightValue && typeof leftValue === 'object' && typeof rightValue === 'object') {
      return areRecordsEqual(
        leftValue as Record<string, unknown>,
        rightValue as Record<string, unknown>,
      );
    }
    return Object.is(leftValue, rightValue);
  });
}

function areArraysEqual(left: unknown[], right: unknown[]): boolean {
  if (left === right) {
    return true;
  }
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => {
    const other = right[index];
    if (Array.isArray(value) || Array.isArray(other)) {
      return Array.isArray(value) && Array.isArray(other) && areArraysEqual(value, other);
    }
    if (value && other && typeof value === 'object' && typeof other === 'object') {
      return areRecordsEqual(value as Record<string, unknown>, other as Record<string, unknown>);
    }
    return Object.is(value, other);
  });
}

function areTreeGraphDocumentsEqual(left: GraphDocument, right: GraphDocument): boolean {
  const comparableLeft = toComparableTreeGraphDocument(left);
  const comparableRight = toComparableTreeGraphDocument(right);
  return (
    comparableLeft.id === comparableRight.id &&
    comparableLeft.kind === comparableRight.kind &&
    comparableLeft.name === comparableRight.name &&
    comparableLeft.version === comparableRight.version &&
    areRecordsEqual(comparableLeft.meta, comparableRight.meta) &&
    areArraysEqual(comparableLeft.nodes, comparableRight.nodes) &&
    areArraysEqual(comparableLeft.edges, comparableRight.edges)
  );
}

function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}

export function TreeModeLayoutWrapper(
  props: RendererComponentProps<DesignerPageSchema> & { config: DesignerConfig },
) {
  const { config } = props;
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const projectedTreeDocument = useMemo(
    () =>
      inputTreeDocument
        ? computeTreeModeDocument(inputTreeDocument, config)
        : { id: '', kind: '', name: '', version: '', nodes: [], edges: [] },
    [config, inputTreeDocument],
  );
  const [core] = useState(() =>
    createDesignerCore(
      projectedTreeDocument,
      config,
    ),
  );
  const acceptedHostDocumentRef = useRef<GraphDocument>(projectedTreeDocument);
  const treeOwner = useMemo(
    () =>
      inputTreeDocument
        ? {
            getTreeDocument: () => inputTreeDocument,
            setTreeDocument: () => {
              // Live tree mode is host-owned. Local edits flow through the owning prop/update path.
            },
            config,
          }
        : undefined,
    [config, inputTreeDocument],
  );

  useEffect(() => {
    if (!inputTreeDocument) {
      return;
    }

    const acceptedHostDocument = acceptedHostDocumentRef.current;
    if (areTreeGraphDocumentsEqual(projectedTreeDocument, acceptedHostDocument)) {
      return;
    }

    const localDocument = core.getDocument();
    if (!areTreeGraphDocumentsEqual(localDocument, acceptedHostDocument)) {
      return;
    }

    core.replaceDocument(projectedTreeDocument, inputTreeDocument);
    acceptedHostDocumentRef.current = projectedTreeDocument;
  }, [core, inputTreeDocument, projectedTreeDocument]);

  if (!inputTreeDocument) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  return (
    <DesignerPageInner
      rendererProps={props}
      config={config}
      core={core}
      treeDocument={inputTreeDocument}
      treeOwner={treeOwner}
    />
  );
}
