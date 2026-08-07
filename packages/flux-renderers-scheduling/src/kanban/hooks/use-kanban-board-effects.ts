import { useEffect, useRef } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import type { BoardData } from '../kanban.types.js';

interface ColumnInfo {
  id: string;
  title?: string;
  children: string[];
}

interface UseKanbanBoardEffectsOptions {
  boardRef: React.RefObject<HTMLDivElement | null>;
  draggable: boolean;
  boardDataRef: React.MutableRefObject<BoardData>;
  columns: ColumnInfo[];
  moveCardKeyboard: (board: BoardData, cardId: string, fromColId: string, toColId: string, fromIndex: number, toIndex: number) => void;
  keyboardMoveCard: { cardId: string; columnId: string } | null;
  setKeyboardMoveCard: React.Dispatch<React.SetStateAction<{ cardId: string; columnId: string } | null>>;
  setDndAnnouncement: React.Dispatch<React.SetStateAction<string>>;
  dragState: { isDragging: boolean; draggingCardId: string | null };
  dropState: { targetColumnId: string | null; targetCardIndex: number | null; closestEdge: string | null };
  boardData: BoardData;
  handleUndo: () => void;
  handleRedo: () => void;
}

export function useKanbanBoardEffects({
  boardRef,
  draggable,
  boardDataRef,
  columns,
  moveCardKeyboard,
  keyboardMoveCard,
  setKeyboardMoveCard,
  setDndAnnouncement,
  dragState,
  dropState,
  boardData,
  handleUndo,
  handleRedo,
}: UseKanbanBoardEffectsOptions) {
  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [handleRedo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const undo = handleUndoRef.current;
      const redo = handleRedoRef.current;
      const el = boardRef.current;
      if (!el) return;
      if (!el.contains(document.activeElement)) return;
      const target = e.target as HTMLElement | null;
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isEditable) return;
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [boardRef]);

  const columnsRef = useRef(columns);
  useEffect(() => { columnsRef.current = columns; }, [columns]);
  const moveCardKeyboardRef = useRef(moveCardKeyboard);
  useEffect(() => { moveCardKeyboardRef.current = moveCardKeyboard; }, [moveCardKeyboard]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || !draggable) return;
    const handler = (e: KeyboardEvent) => {
      const cardEl = (e.target as HTMLElement).closest('[data-dnd-card]') as HTMLElement | null;
      if (!cardEl) return;
      const cardId = cardEl.getAttribute('data-card-id');
      const colId = cardEl.getAttribute('data-column-id');
      const cardIdx = parseInt(cardEl.getAttribute('data-card-index') || '0', 10);
      if (!cardId || !colId) return;

      if (!keyboardMoveCard) {
        if (e.key === ' ' || e.key === 'Space') {
          e.preventDefault();
          setKeyboardMoveCard({ cardId, columnId: colId });
          cardEl.setAttribute('data-keyboard-dragging', 'true');
          cardEl.setAttribute('aria-grabbed', 'true');
          const cardTitle = cardEl.getAttribute('aria-label') || boardDataRef.current[cardId]?.data?.title || cardId;
          setDndAnnouncement(t('scheduling.kanban.pickedUpCard', { title: cardTitle }));
        }
        return;
      }
      if (keyboardMoveCard.cardId !== cardId) return;

      const dirActions: Record<string, () => void> = {
        ArrowLeft: () => {
          const curIdx = columnsRef.current.findIndex(c => c.id === keyboardMoveCard.columnId);
          if (curIdx > 0) {
            const targetColId = columnsRef.current[curIdx - 1].id;
            moveCardKeyboardRef.current(boardDataRef.current, cardId, keyboardMoveCard.columnId, targetColId, cardIdx, 0);
            setKeyboardMoveCard({ cardId, columnId: targetColId });
            setDndAnnouncement(t('scheduling.kanban.cardMovedTo', { title: columnsRef.current[curIdx - 1]?.title || targetColId }));
          }
        },
        ArrowRight: () => {
          const curIdx = columnsRef.current.findIndex(c => c.id === keyboardMoveCard.columnId);
          if (curIdx < columnsRef.current.length - 1) {
            const targetColId = columnsRef.current[curIdx + 1].id;
            moveCardKeyboardRef.current(boardDataRef.current, cardId, keyboardMoveCard.columnId, targetColId, cardIdx, 0);
            setKeyboardMoveCard({ cardId, columnId: targetColId });
            setDndAnnouncement(t('scheduling.kanban.cardMovedTo', { title: columnsRef.current[curIdx + 1]?.title || targetColId }));
          }
        },
        Escape: () => {
          cardEl.removeAttribute('data-keyboard-dragging');
          cardEl.removeAttribute('aria-grabbed');
          setKeyboardMoveCard(null);
          setDndAnnouncement(t('scheduling.kanban.cardDragCancelled'));
        },
      };
      const action = dirActions[e.key];
      if (action) { e.preventDefault(); action(); }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [draggable, keyboardMoveCard, boardRef, boardDataRef, setKeyboardMoveCard, setDndAnnouncement]);

  useEffect(() => {
    if (!boardRef.current) return;
    const tc = dropState.targetColumnId;
    boardRef.current.querySelectorAll('[data-dnd-column]').forEach((el) => {
      if (el.getAttribute('data-column-id') === tc && tc) el.setAttribute('data-drop-target', 'true');
      else el.removeAttribute('data-drop-target');
    });
  }, [dropState.targetColumnId, boardRef]);

  useEffect(() => {
    if (!boardRef.current) return;
    boardRef.current.querySelectorAll('[data-dnd-card]').forEach((el) => { el.removeAttribute('data-dragging'); el.removeAttribute('aria-grabbed'); });
    if (dragState.isDragging && dragState.draggingCardId) {
      const cardEl = boardRef.current.querySelector(`[data-card-id="${dragState.draggingCardId}"]`);
      if (cardEl) { cardEl.setAttribute('data-dragging', 'true'); cardEl.setAttribute('aria-grabbed', 'true'); }
      setDndAnnouncement(t('scheduling.kanban.draggingCard', { title: boardData[dragState.draggingCardId]?.data?.title || dragState.draggingCardId }));
    } else if (!dragState.isDragging) { setDndAnnouncement(''); }
  }, [dragState.isDragging, dragState.draggingCardId, boardData, boardRef, setDndAnnouncement]);
}
