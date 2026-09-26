import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c9KanbanDialogSchema, registerC9Probe } from './data-c9-host';

const keyboardOnlyBoard = {
  type: 'kanban',
  testid: 'kanban-keyboard-only',
  draggable: false,
  keyboardReorder: { enabled: true },
  columnWidth: 280,
  data: {
    root: {
      id: 'root',
      type: 'root',
      children: ['col-todo', 'col-done'],
      data: {},
      meta: {},
    },
    'col-todo': {
      id: 'col-todo',
      type: 'column',
      parentId: 'root',
      children: ['card-1', 'card-2'],
      data: { title: 'To Do' },
      meta: {},
    },
    'col-done': {
      id: 'col-done',
      type: 'column',
      parentId: 'root',
      children: [],
      data: { title: 'Done' },
      meta: {},
    },
    'card-1': {
      id: 'card-1',
      type: 'card',
      parentId: 'col-todo',
      children: [],
      data: { title: 'Keyboard card 1', description: 'Reorder with Space + arrows' },
      meta: {},
    },
    'card-2': {
      id: 'card-2',
      type: 'card',
      parentId: 'col-todo',
      children: [],
      data: { title: 'Keyboard card 2' },
      meta: {},
    },
  },
};

const cardTemplateBoard = {
  type: 'kanban',
  testid: 'kanban-card-template',
  draggable: false,
  columnWidth: 280,
  cardTemplate: {
    type: 'text',
    text: 'FACE ${$slot.card.data.title} · idx ${$slot.index}',
  },
  data: {
    root: {
      id: 'root',
      type: 'root',
      children: ['col-a'],
      data: {},
      meta: {},
    },
    'col-a': {
      id: 'col-a',
      type: 'column',
      parentId: 'root',
      children: ['tpl-card-1', 'tpl-card-2'],
      data: { title: 'Template Column' },
      meta: {},
    },
    'tpl-card-1': {
      id: 'tpl-card-1',
      type: 'card',
      parentId: 'col-a',
      children: [],
      data: { title: 'Alpha' },
      meta: {},
    },
    'tpl-card-2': {
      id: 'tpl-card-2',
      type: 'card',
      parentId: 'col-a',
      children: [],
      data: { title: 'Beta' },
      meta: {},
    },
  },
};

export function KanbanLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Kanban renderer: column/card board with DnD + keyboard drag; schema events dispatch the { event, evaluationBindings, scope } ctx so action args read payload keys."
      scenarios={[
        {
          title: 'Host kanban in dialog + onCardClick/onCardMove payload (C9 bug 73 pattern)',
          description:
            'C9 Phase 3 host-kanban-drag: kanban inside an openDialog surface — clicking a card dispatches onCardClick with ${cardId}|${index}, a cross-column drag dispatches onCardMove.',
          schema: c9KanbanDialogSchema,
          onActionScopeChange: registerC9Probe,
        },
        {
          title: 'Keyboard-only reorder (L4.5 keyboardReorder)',
          description:
            'draggable:false with keyboardReorder {enabled:true}: pointer drag is off, but Space picks a card up and Arrow keys move it across columns (Escape cancels).',
          schema: keyboardOnlyBoard,
        },
        {
          title: 'cardTemplate per-card bindings (L4.8)',
          description:
            'cardTemplate region receives {card, column, index} via the bindings channel — templates read ${$slot.card.data.title} and ${$slot.index}.',
          schema: cardTemplateBoard,
        },
      ]}
    />
  );
}
