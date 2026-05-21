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

function areTreeGraphDocumentsEqual(left: GraphDocument, right: GraphDocument): boolean {
  return JSON.stringify(toComparableTreeGraphDocument(left)) === JSON.stringify(toComparableTreeGraphDocument(right));
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
