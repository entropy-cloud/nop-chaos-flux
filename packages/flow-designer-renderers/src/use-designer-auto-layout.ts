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
  const [layoutFailure, setLayoutFailure] = useState<Error | null>(null);
  const layoutRequestRef = useRef(0);
  const initialTreeAutolayoutDoneRef = useRef(false);
  const elkOwnerRef = useRef<ReturnType<typeof createElkLayoutOwner> | null>(null);

  const getElkOwner = useCallback(() => {
    const currentOwner = elkOwnerRef.current;
    if (currentOwner) {
      return currentOwner;
    }

    const nextOwner = createElkLayoutOwner();
    elkOwnerRef.current = nextOwner;
    return nextOwner;
  }, []);

  const handleAutoLayout = useCallback(async () => {
    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);
    setLayoutError(null);
    setLayoutFailure(null);
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
          getElkOwner(),
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
        getElkOwner(),
      );
      if (layoutRequestRef.current !== requestId || core.getDocument() !== doc) {
        return;
      }
      core.layoutNodes(positions);
    } catch (error) {
      if (layoutRequestRef.current === requestId) {
        const normalizedError =
          error instanceof Error ? error : new Error('Auto-layout failed', { cause: error });
        setLayoutError(normalizedError.message);
        setLayoutFailure(normalizedError);
      }
      throw error;
    } finally {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
    }
  }, [config.documentMode, core, getElkOwner]);

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
    setLayoutFailure(null);

    void layoutTreeWithElk(
      doc.nodes,
      doc.edges,
      treeConfig,
      normalizedCfg.nodeTypes,
      getElkOwner(),
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
        const normalizedError =
          error instanceof Error ? error : new Error('Auto-layout failed', { cause: error });
        setLayoutError(normalizedError.message);
        setLayoutFailure(normalizedError);
      })
      .finally(() => {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      });
  }, [config.documentMode, core, getElkOwner]);

  useEffect(() => {
    return () => {
      elkOwnerRef.current?.invalidate();
      elkOwnerRef.current = null;
    };
  }, []);

  return {
    layoutBusy,
    layoutError,
    layoutFailure,
    handleAutoLayout,
  };
}
