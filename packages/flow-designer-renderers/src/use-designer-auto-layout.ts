import { useCallback, useEffect, useRef, useState } from 'react';
import { layoutTreeWithElk, layoutWithElk } from '@nop-chaos/flow-designer-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import type { createDesignerCore } from '@nop-chaos/flow-designer-core';

type DesignerCoreLike = ReturnType<typeof createDesignerCore>;

export function useDesignerAutoLayout(core: DesignerCoreLike, config: DesignerConfig) {
  const [layoutBusy, setLayoutBusy] = useState(false);
  const layoutRequestRef = useRef(0);
  const initialTreeAutolayoutDoneRef = useRef(false);

  const handleAutoLayout = useCallback(async () => {
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);
    const doc = core.getDocument();
    if (doc.nodes.length === 0) {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
      return;
    }

    try {
      if (config.documentMode === 'tree') {
        const normalizedCfg = core.getConfig();
        const treeConfig = normalizedCfg.treeConfig;
        if (!treeConfig) {
          return;
        }
        const layoutedNodes = await layoutTreeWithElk(doc.nodes, doc.edges, treeConfig, normalizedCfg.nodeTypes);
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }
        const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]));
        core.layoutNodes(positions);
        return;
      }

      const positions = await layoutWithElk(doc.nodes, doc.edges, core.getConfig().nodeTypes);
      if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
        return;
      }
      core.layoutNodes(positions);
    } finally {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
    }
  }, [config.documentMode, core]);

  useEffect(() => {
    if (config.documentMode !== 'tree') {
      return;
    }

    const normalizedCfg = core.getConfig();
    const treeConfig = normalizedCfg.treeConfig;
    if (!treeConfig || treeConfig.autoLayout === false || initialTreeAutolayoutDoneRef.current) {
      return;
    }

    const doc = core.getDocument();
    if (doc.nodes.length === 0) {
      initialTreeAutolayoutDoneRef.current = true;
      return;
    }

    initialTreeAutolayoutDoneRef.current = true;
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);

    void layoutTreeWithElk(doc.nodes, doc.edges, treeConfig, normalizedCfg.nodeTypes)
      .then((layoutedNodes) => {
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }

        const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]));
        core.layoutNodes(positions);
      })
      .finally(() => {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      });
  }, [config.documentMode, core]);

  return {
    layoutBusy,
    handleAutoLayout,
  };
}
