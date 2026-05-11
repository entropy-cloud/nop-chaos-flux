import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createElkLayoutOwner,
  layoutTreeWithElk,
  layoutWithElk,
} from '@nop-chaos/flow-designer-core';
import type { DesignerConfig } from '@nop-chaos/flow-designer-core';
import type { createDesignerCore } from '@nop-chaos/flow-designer-core';

type DesignerCoreLike = ReturnType<typeof createDesignerCore>;

export function useDesignerAutoLayout(core: DesignerCoreLike, config: DesignerConfig) {
  const [layoutBusy, setLayoutBusy] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const layoutRequestRef = useRef(0);
  const initialTreeAutolayoutDoneRef = useRef(false);
  const elkOwnerRef = useRef(createElkLayoutOwner());

  const handleAutoLayout = useCallback(async () => {
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);
    setLayoutError(null);
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
        const layoutedNodes = await layoutTreeWithElk(
          doc.nodes,
          doc.edges,
          treeConfig,
          normalizedCfg.nodeTypes,
          elkOwnerRef.current,
        );
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }
        const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]));
        core.layoutNodes(positions);
        return;
      }

      const positions = await layoutWithElk(
        doc.nodes,
        doc.edges,
        core.getConfig().nodeTypes,
        undefined,
        elkOwnerRef.current,
      );
      if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
        return;
      }
      core.layoutNodes(positions);
    } catch (error) {
      if (layoutRequestRef.current === requestId) {
        setLayoutError(error instanceof Error ? error.message : 'Auto-layout failed');
      }
      throw error;
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
    setLayoutError(null);

    void layoutTreeWithElk(
      doc.nodes,
      doc.edges,
      treeConfig,
      normalizedCfg.nodeTypes,
      elkOwnerRef.current,
    )
      .then((layoutedNodes) => {
        if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
          return;
        }

        const positions = new Map(layoutedNodes.map((node) => [node.id, node.position]));
        core.layoutNodes(positions);
      })
      .catch((error: unknown) => {
        if (layoutRequestRef.current !== requestId) {
          return;
        }
        const layoutError =
          error instanceof Error ? error : new Error('Auto-layout failed');
        setLayoutError(layoutError.message);
      })
      .finally(() => {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      });
  }, [config.documentMode, core]);

  useEffect(() => {
    const elkOwner = elkOwnerRef.current;

    return () => {
      elkOwner.invalidate();
    };
  }, []);

  return {
    layoutBusy,
    layoutError,
    handleAutoLayout,
  };
}
