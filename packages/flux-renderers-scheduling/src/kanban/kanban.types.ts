import type { BaseSchema, SchemaInput, SchemaObject, ActionSchema } from '@nop-chaos/flux-core';
import type { KanbanColumnAggregateConfig } from './kanban-aggregate.js';

export interface BoardItem extends SchemaObject {
  id: string;
  type: 'root' | 'column' | 'card' | 'divider';
  parentId?: string;
  children: string[];
  data: Record<string, any>;
  meta: Record<string, any>;
  title?: string;
  content?: string;
}

export interface BoardData {
  [id: string]: BoardItem;
}

export interface KanbanColumnConfig {
  id: string;
  title?: string;
  cardLimit?: number;
  wipStrict?: boolean;
  collapsed?: boolean;
  width?: number | string;
}

export interface KanbanCardConfig {
  render: SchemaInput;
  isDraggable?: boolean;
  className?: string;
}

export interface KanbanEvents {
  onCardMove?: ActionSchema;
  onCardClick?: ActionSchema;
  onColumnReorder?: ActionSchema;
  onColumnClick?: ActionSchema;
  onCardAdd?: ActionSchema;
  onCardRemove?: ActionSchema;
  onColumnAdd?: ActionSchema;
}

export interface KanbanSchema extends BaseSchema {
  type: 'kanban';
  data?: any;
  configMap?: Record<string, any>;
  columnsConfig?: Record<string, any>;
  columnHeader?: SchemaInput;
  columnHeaderToolbar?: SchemaInput;
  cardTemplate?: SchemaInput;
  columnFooter?: SchemaInput;
  empty?: SchemaInput;
  loading?: SchemaInput;
  /**
   * Board-level per-column header aggregate (G-C): one declaration, each
   * column aggregates its own filtered card set into the default header
   * (`data-slot="kanban-column-aggregate"`). A `columnHeader` region override
   * takes the whole header and suppresses the aggregate.
   */
  columnAggregate?: KanbanColumnAggregateConfig;
  filterText?: string;
  filterCard?: string;
  filterTags?: string[];
  wipStrict?: boolean;
  columnWidth?: number | 'auto' | 'equal';
  columnDraggable?: boolean;
  draggable?: boolean;
  collapsedStatePath?: string;
  collapsedOwnership?: 'local' | 'controlled' | 'scope';
  columnHeaderClassName?: string;
  cardClassName?: string;
  columnFooterClassName?: string;
  kanbanOwnership?: string;
  kanbanStatePath?: string;
  statusPath?: string;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  onCardMove?: ActionSchema;
  onCardClick?: ActionSchema;
  onColumnReorder?: ActionSchema;
  onColumnClick?: ActionSchema;
  onCardAdd?: ActionSchema;
  onCardRemove?: ActionSchema;
  onColumnAdd?: ActionSchema;
}
