import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shallowEqual } from '@nop-chaos/flux-core';
import { useOwnershipScopeValue, useRenderScope } from '@nop-chaos/flux-react';
import type { BoardData, KanbanCardConfig } from '../kanban.types.js';
import { getColumns } from '../kanban-helpers.js';
import { createUndoStack, pushCommand as pushUndoCommand, undo as undoStackOp, redo as redoStackOp } from '../utils/kanban-undo-stack.js';
import type { UndoStack, UndoCommandType } from '../utils/kanban-undo-stack.js';

const EMPTY_BOARD = { root: { id: 'root', type: 'root', children: [], data: {}, meta: {} } } as BoardData;

/**
 * Board/collapse ownership state machine + undo history + activity actions
 * (cq-6 Phase 7): extracted verbatim from KanbanBoard. Ownership semantics —
 * including the 22-03 re-seed-during-render contract and the 1-5
 * deterministic undo read — are unchanged.
 */
export function useKanbanBoardState(options: {
  boardOwnership: string;
  boardStatePath: string | undefined;
  collapsedOwnership: string;
  collapsedStatePath: string | undefined;
  rawData: BoardData | undefined;
  columnsConfig: Record<string, KanbanCardConfig> | undefined;
}) {
  const rootScope = useRenderScope();
  const {
    boardOwnership,
    boardStatePath,
    collapsedOwnership,
    collapsedStatePath,
    rawData,
    columnsConfig,
  } = options;
  const fallbackBoard = EMPTY_BOARD;

  const isControlled = boardOwnership === 'controlled';


  // 05-01: 订阅门控——非 scope ownership 不订阅 scope（原语 useOwnershipScopeValue
  // 走 UNUSED sentinel，零订阅渲染），scope 模式收窄到 state path。
  const scopeBoardData = useOwnershipScopeValue<BoardData | undefined>(
    boardOwnership === 'scope' && boardStatePath ? 'scope' : 'local',
    boardStatePath,
    { equality: shallowEqual as (a: BoardData | undefined, b: BoardData | undefined) => boolean },
  );

  const scopeCollapsedValue = useOwnershipScopeValue<Record<string, boolean> | undefined>(
    collapsedOwnership === 'scope' && collapsedStatePath ? 'scope' : 'local',
    collapsedStatePath,
  );

  const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  const [localCollapsedData, setLocalCollapsedData] = useState<Record<string, boolean>>({});

  const boardData = (boardOwnership === 'controlled')
    ? (rawData ?? fallbackBoard)
    : (boardOwnership === 'scope' && scopeBoardData ? scopeBoardData : localBoardData);

  const boardDataRef = useRef(boardData);
  useEffect(() => { boardDataRef.current = boardData; }, [boardData]);

  // 22-03: re-seed local board state when the schema data prop changes at
  // runtime (async data-source arrive, scope-driven refresh). New data wins
  // over local edits — same semantics as the gantt re-seed precedent. The
  // first render is skipped (state equals the initial value); every later
  // reference change, including the first undefined→data arrival, re-seeds.
  // React's adjust-state-during-render pattern: an effect+setState here would
  // cascade (react-hooks/set-state-in-effect).
  const [lastRawData, setLastRawData] = useState(rawData);
  if (boardOwnership === 'local' && lastRawData !== rawData) {
    setLastRawData(rawData);
    setLocalBoardData(rawData ?? EMPTY_BOARD);
  }

  const collapsedMap = (() => {
    if (collapsedOwnership === 'controlled') {
      const map: Record<string, boolean> = {};
      if (columnsConfig) {
        for (const [id, cfg] of Object.entries(columnsConfig)) {
          if (typeof cfg === 'object' && cfg !== null && 'collapsed' in cfg) {
            map[id] = !!((cfg as { collapsed?: unknown }).collapsed);
          }
        }
      }
      return map;
    }
    if (collapsedOwnership === 'scope' && scopeCollapsedValue) return scopeCollapsedValue;
    return localCollapsedData;
  })();

  const setCollapsedMap = useCallback((updater: React.SetStateAction<Record<string, boolean>>) => {
    if (collapsedOwnership === 'controlled') return;
    const current = typeof updater === 'function'
      ? updater(collapsedOwnership === 'scope' && collapsedStatePath ? (scopeCollapsedValue ?? {}) : localCollapsedData)
      : updater;
    if (collapsedOwnership === 'scope' && collapsedStatePath) {
      rootScope.update(collapsedStatePath, current);
      return;
    }
    setLocalCollapsedData(current);
  }, [collapsedOwnership, collapsedStatePath, rootScope, scopeCollapsedValue, localCollapsedData]);

  const setBoardData = useCallback((newBoard: BoardData) => {
    if (boardOwnership === 'controlled') return;
    if (boardOwnership === 'scope' && boardStatePath) {
      rootScope.update(boardStatePath, newBoard);
      return;
    }
    setLocalBoardData(newBoard);
  }, [boardOwnership, boardStatePath, rootScope, setLocalBoardData]);

  const setBoardDataRef = useRef(setBoardData);
  useEffect(() => { setBoardDataRef.current = setBoardData; }, [setBoardData]);

  const columns = useMemo(() => getColumns(boardData), [boardData]);

  const [undoStackState, setUndoStackState] = useState<UndoStack>(() => createUndoStack(1000));
  const lastCommandTypeRef = useRef<UndoCommandType>('moveCard');

  const handleSetBoardData = useCallback((newBoard: BoardData, commandType?: UndoCommandType, extraParams?: Record<string, any>) => {
    if (boardOwnership === 'controlled') return;
    const ct = commandType ?? lastCommandTypeRef.current;
    lastCommandTypeRef.current = 'moveCard';
    setBoardData(newBoard);
    setUndoStackState((s) => pushUndoCommand(s, {
      type: ct,
      timestamp: Date.now(),
      params: extraParams ?? {},
    }));
  }, [boardOwnership, setBoardData]);

  const handleUndo = useCallback(() => {
    // 1-5: undo 确定性执行——旧实现经 setUndoStackState updater 副作用捕获
    // restoredBoard（React 19 updater 仅在渲染期调用，是否急切执行依赖时序，
    // 静默 no-op 导致 undo 偶发失效）；改为直接读当前栈并同步落位。
    const result = undoStackOp(undoStackState, boardDataRef.current);
    if (!result) return;
    setUndoStackState(result.stack);
    setBoardData(result.board);
  }, [undoStackState, setBoardData]);

  const handleRedo = useCallback(() => {
    const result = redoStackOp(undoStackState, boardDataRef.current);
    if (!result) return;
    setUndoStackState(result.stack);
    setBoardData(result.board);
  }, [undoStackState, setBoardData]);

  return {
    isControlled,
    boardData,
    columns,
    collapsedMap,
    setCollapsedMap,
    setBoardData,
    setBoardDataRef,
    boardDataRef,
    undoStackState,
    setUndoStackState,
    handleSetBoardData,
    handleUndo,
    handleRedo,
    rootScope,
  };
}
