export type { BoardData, BoardItem, KanbanSchema, KanbanColumnConfig, KanbanCardConfig, KanbanEvents } from './kanban.types.js';

export { moveCard, moveColumn, addCard, removeCard, changeCard, addColumn, removeColumn } from './kanban-helpers.js';

export { KanbanBoard } from './kanban-board.js';
export { KanbanColumn } from './kanban-column.js';
export { KanbanCard } from './kanban-card.js';
export { KanbanColumnHeader } from './kanban-column-header.js';

export { useKanbanDnd } from './hooks/use-kanban-dnd.js';
export type { DragState, DropState, UseKanbanDndOptions } from './hooks/use-kanban-dnd.js';
export { useColumnDnd } from './hooks/use-column-dnd.js';
export type { UseColumnDndOptions } from './hooks/use-column-dnd.js';
export { useKanbanFilter } from './hooks/use-kanban-filter.js';
export type { UseKanbanFilterOptions } from './hooks/use-kanban-filter.js';
/** @deprecated Use board-level addCard/handleCardAdd callback instead. */
export { useKanbanAdder } from './hooks/use-kanban-adder.js';
/** @deprecated Collaboration feature not yet integrated. Will be re-enabled in a future release. */
export { useKanbanCollab } from './hooks/use-kanban-collab.js';

export { useKanbanColumnResize } from './hooks/use-kanban-column-resize.js';
export type { ColumnWidthMap, UseKanbanColumnResizeOptions } from './hooks/use-kanban-column-resize.js';
export { useKanbanVirtualizer } from './hooks/use-kanban-virtualizer.js';
export type { UseKanbanVirtualizerOptions } from './hooks/use-kanban-virtualizer.js';

export { KanbanCardTags } from './components/kanban-card-tags.js';
export type { KanbanTag, KanbanMember, KanbanCardTagsProps } from './components/kanban-card-tags.js';
export { KanbanTagFilter } from './components/kanban-tag-filter.js';
export type { KanbanFilterTag, KanbanTagFilterProps } from './components/kanban-tag-filter.js';
export { KanbanActivityLog } from './components/kanban-activity-log.js';
export type { KanbanAction, KanbanActivityLogProps } from './components/kanban-activity-log.js';
export { createUndoStack, pushCommand, undo, redo, canUndo, canRedo, shouldMerge } from './utils/kanban-undo-stack.js';
export type { UndoCommand, UndoCommandType, UndoStack } from './utils/kanban-undo-stack.js';
export { boardDataToJson, boardDataFromJson, exportBoardToPng, downloadBlob } from './utils/kanban-export.js';

