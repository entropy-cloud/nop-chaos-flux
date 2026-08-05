import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createElkLayoutOwner,
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
  const initialTreeRelayoutDoneRef = useRef(false);
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

  const handleAutoLayout = useCallback(() => {
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

    if (config.documentMode === 'tree') {
      try {
        const result = core.relayoutTree();
        if (layoutRequestRef.current !== requestId) {
          return;
        }
        if (!result.ok) {
          const message =
            result.error instanceof Error ? result.error.message : 'Tree relayout failed';
          setLayoutError(message);
          setLayoutFailure(result.error instanceof Error ? result.error : new Error(message));
        }
      } catch (error) {
        if (layoutRequestRef.current === requestId) {
          const normalizedError =
            error instanceof Error ? error : new Error('Tree relayout failed', { cause: error });
          setLayoutError(normalizedError.message);
          setLayoutFailure(normalizedError);
        }
      } finally {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      }
      return;
    }

    void (async () => {
      try {
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
      } finally {
        if (layoutRequestRef.current === requestId) {
          setLayoutBusy(false);
        }
      }
    })();
  }, [config.documentMode, core, getElkOwner]);

  useEffect(() => {
    if (config.documentMode !== 'tree') {
      return;
    }

    if (initialTreeRelayoutDoneRef.current) {
      return;
    }
    initialTreeRelayoutDoneRef.current = true;

    const doc = core.getDocument();
    if (doc.nodes.length === 0) {
      return;
    }

    const requestId = layoutRequestRef.current + 1;
    layoutRequestRef.current = requestId;
    setLayoutBusy(true);
    setLayoutError(null);
    setLayoutFailure(null);

    try {
      const result = core.relayoutTree();
      if (layoutRequestRef.current !== requestId) {
        return;
      }
      if (!result.ok) {
        const message =
          result.error instanceof Error ? result.error.message : 'Tree relayout failed';
        setLayoutError(message);
        setLayoutFailure(result.error instanceof Error ? result.error : new Error(message));
      }
    } catch (error: unknown) {
      if (layoutRequestRef.current === requestId) {
        const normalizedError =
          error instanceof Error ? error : new Error('Tree relayout failed', { cause: error });
        setLayoutError(normalizedError.message);
        setLayoutFailure(normalizedError);
      }
    } finally {
      if (layoutRequestRef.current === requestId) {
        setLayoutBusy(false);
      }
    }
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
