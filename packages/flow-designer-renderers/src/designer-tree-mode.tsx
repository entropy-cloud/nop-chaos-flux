import React, { useEffect, useRef, useState } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DesignerConfig, TreeDocument } from '@nop-chaos/flow-designer-core';
import { createDesignerCore } from '@nop-chaos/flow-designer-core';
import { t } from '@nop-chaos/flux-i18n';
import type { DesignerPageSchema } from './schemas.js';
import { computeTreeModeDocument } from './designer-page-helpers.js';
import { DesignerPageInner } from './designer-page-inner.js';

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
  const [initialTreeDocument] = useState(() => inputTreeDocument);
  const [treeDocument, setTreeDocument] = useState<TreeDocument | undefined>(
    inputTreeDocument,
  );

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);

  const [core] = useState(() =>
    createDesignerCore(
      initialTreeDocument
        ? computeTreeModeDocument(initialTreeDocument, config)
        : { id: '', kind: '', name: '', version: '', nodes: [], edges: [] },
      config,
    ),
  );
  const lastSyncedInputRef = useRef<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    if (inputTreeDocument === lastSyncedInputRef.current) {
      return;
    }
    lastSyncedInputRef.current = inputTreeDocument;
    if (inputTreeDocument) {
      core.replaceDocument(computeTreeModeDocument(inputTreeDocument, config), inputTreeDocument);
    }
  }, [config, core, inputTreeDocument]);

  if (!treeDocument) {
    return <div>{t('flux.flowDesigner.treeDocumentRequired')}</div>;
  }

  return (
    <DesignerPageInner
      rendererProps={props}
      config={config}
      core={core}
      treeDocument={treeDocument}
      setTreeDocument={setTreeDocument}
    />
  );
}
