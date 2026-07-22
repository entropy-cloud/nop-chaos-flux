import type { GanttId, GanttTask, GanttTaskData, GanttLink, GanttLinkData, GanttLinkType, GanttResource, GanttAssignment, GanttZoomLevel, GanttStoreApi } from './gantt.types.js';
import { computeTaskLayout, computeLinkPolylines, pixelToDate, dateToPixel } from './utils/layout.js';
import { computeScaleRange } from './utils/scale.js';
import { CalendarManager, type WorkCalendar } from './utils/worktime.js';
import { createStore } from 'zustand/vanilla';
import { flattenTasks, buildParentIndex, seedExpandedSet, getVisibleTasks, getVisibleDescendantCount, computeLevels, computeSourceTarget, collectDescendantIds } from './gantt-tree-utils.js';

interface CalendarEntry { id: string; calendar: WorkCalendar; }

export interface GanttStoreConfig {
  cellWidth?: number; zoomLevels?: GanttZoomLevel[]; defaultZoom?: string;
  taskBarHeight?: number; rowHeight?: number; scrollLeft?: number;
  containerWidth?: number; globalCalendarId?: string;
}

export interface GanttStoreState {
  tasks: Map<GanttId, GanttTask>; links: Map<GanttId, GanttLink>;
  resources: Map<GanttId, GanttResource>; assignments: Map<GanttId, GanttAssignment>;
  scaleRange: { start: Date; end: Date }; cellWidth: number; currentZoom: string;
  zoomLevels: Map<string, GanttZoomLevel>; taskBarHeight: number; rowHeight: number;
  containerWidth: number; revision: number; taskRevision: number; linkRevision: number;
  treeRevision: number; layoutRevision: number;
  expandedSet: Set<GanttId>;
  selectedTaskId: GanttId | null; editingTaskId: GanttId | null;
}

const LINK_SHORT_TO_LONG: Record<string, GanttLinkType> = {
  FS: 'finish_to_start',
  SS: 'start_to_start',
  FF: 'finish_to_finish',
  SF: 'start_to_finish',
};
const LINK_LONG_TO_SHORT: Record<string, string> = {
  finish_to_start: 'FS',
  start_to_start: 'SS',
  finish_to_finish: 'FF',
  start_to_finish: 'SF',
};

function normalizeLinkType(type: string): GanttLinkType {
  return LINK_SHORT_TO_LONG[type] ?? (LINK_LONG_TO_SHORT[type] ? (type as GanttLinkType) : 'finish_to_start');
}

export function createGanttStore(config?: GanttStoreConfig): GanttStoreApi {
  let parentIndex = new Map<GanttId | null, GanttId[]>();
  let _cachedVisibleTasks: GanttTask[] = [];
  let _visibleTasksCacheDirty = true;
  let _scrollLeft = config?.scrollLeft ?? 0;
  const calendarManager = new CalendarManager(config?.globalCalendarId);

  const store = createStore<GanttStoreState>(() => ({
    tasks: new Map(), links: new Map(), resources: new Map(), assignments: new Map(),
    scaleRange: { start: new Date(), end: new Date() },
    cellWidth: config?.cellWidth ?? 40, currentZoom: config?.defaultZoom ?? 'week',
    zoomLevels: new Map(config?.zoomLevels?.map((zl) => [zl.key, zl]) ?? []),
    taskBarHeight: config?.taskBarHeight ?? 28, rowHeight: config?.rowHeight ?? 40,
    containerWidth: config?.containerWidth ?? 800,
    revision: 0, taskRevision: 0, linkRevision: 0, treeRevision: 0, layoutRevision: 0,
    expandedSet: new Set(),
    selectedTaskId: null, editingTaskId: null,
  }));

  const gs = (): GanttStoreState => store.getState();

  function recomputeVisualLayout(): void {
    computeScaleRangeInternal();
    computeCoordinates();
    computeLinkPolylinesInternal();
  }

  function computeComputedPropertiesInternal(seedExpand = false): void {
    parentIndex = buildParentIndex(gs().tasks);
    _visibleTasksCacheDirty = true;
    const tasksAfterLevels = computeLevels(gs().tasks, parentIndex);
    store.setState({ tasks: tasksAfterLevels });
    const tasksAfterSourceTarget = computeSourceTarget(gs().tasks, gs().links);
    store.setState({ tasks: tasksAfterSourceTarget });
    if (seedExpand) {
      const state = gs();
      store.setState({ expandedSet: seedExpandedSet(state.tasks, state.expandedSet) });
    }
    recomputeVisualLayout();
  }

  function computeScaleRangeInternal(): void {
    const state = gs();
    const tasks = Array.from(state.tasks.values());
    const range = computeScaleRange(tasks);
    store.setState({ scaleRange: range });
  }

  function computeCoordinates(): void {
    const state = gs();
    const visibleTasks = getVisibleTasks(state.tasks, parentIndex, state.expandedSet);
    const visibleIds = visibleTasks.map((t) => t.id);
    computeTaskLayout(visibleTasks, visibleIds, state.scaleRange, state.cellWidth, state.taskBarHeight, state.rowHeight);
    const newTasks = new Map(state.tasks);
    for (const task of visibleTasks) newTasks.set(task.id, task);
    store.setState({ tasks: newTasks });
  }

  function computeLinkPolylinesInternal(): void {
    const state = gs();
    computeLinkPolylines(state.tasks, state.links);
    const newLinks = new Map(state.links);
    for (const [id, link] of state.links) newLinks.set(id, link);
    store.setState({ links: newLinks });
  }

  const api: GanttStoreApi = {
    subscribe: (l) => store.subscribe(l),
    getSnapshot: () => store.getState(),

    get tasks() { return gs().tasks; },
    get links() { return gs().links; },
    get resources() { return gs().resources; },
    get assignments() { return gs().assignments; },
    get scaleRange() { return gs().scaleRange; },
    get cellWidth(): number { return gs().cellWidth; },
    set cellWidth(v: number) { store.setState({ cellWidth: v }); },
    get currentZoom(): string { return gs().currentZoom; },
    set currentZoom(v: string) { store.setState({ currentZoom: v }); },
    get zoomLevels() { return gs().zoomLevels; },
    get taskBarHeight(): number { return gs().taskBarHeight; },
    get rowHeight(): number { return gs().rowHeight; },
    get containerWidth(): number { return gs().containerWidth; },
    set containerWidth(v: number) { store.setState({ containerWidth: v }); },
    get revision(): number { return gs().revision; },
    get taskRevision(): number { return gs().taskRevision; },
    get linkRevision(): number { return gs().linkRevision; },
    get treeRevision(): number { return gs().treeRevision; },
    get layoutRevision(): number { return gs().layoutRevision; },
    get scrollLeft(): number { return _scrollLeft; },
    set scrollLeft(v: number) { _scrollLeft = v; },

    get selectedTaskId(): GanttId | null { return gs().selectedTaskId; },
    selectTask(v: GanttId | null): void { store.setState({ selectedTaskId: v }); },

    get editingTaskId(): GanttId | null { return gs().editingTaskId; },
    editTask(v: GanttId | null): void { store.setState({ editingTaskId: v }); },

    calendarManager,

    revertTask(id: GanttId, previousData: Partial<GanttTaskData>): void {
      const state = gs();
      const task = state.tasks.get(id);
      if (!task) return;
      const reverted = { ...task, ...previousData } as GanttTask;
      const newTasks = new Map(state.tasks);
      newTasks.set(id, reverted);
      store.setState({ tasks: newTasks, revision: state.revision + 1, taskRevision: state.taskRevision + 1 });
      computeComputedPropertiesInternal();
    },

    parse(tasks: GanttTaskData[], links: GanttLinkData[], resources?: GanttResource[], assignments?: GanttAssignment[], calendars?: CalendarEntry[]): void {
      if (calendars) for (const e of calendars) calendarManager.registerCalendar(e.id, e.calendar);
      const newTasks = new Map<GanttId, GanttTask>();
      for (const t of flattenTasks(tasks, null)) newTasks.set(t.id, { ...t, $x: 0, $y: 0, $w: 0, $h: 0, $level: 0, $source: [], $target: [] });
      const newLinks = new Map<GanttId, GanttLink>();
      if (links) for (const l of links) newLinks.set(l.id, { ...l, type: normalizeLinkType(l.type), $p: '' });
      const newResources = new Map<GanttId, GanttResource>();
      if (resources) for (const r of resources) newResources.set(r.id, { ...r });
      const newAssignments = new Map<GanttId, GanttAssignment>();
      if (assignments) for (const a of assignments) newAssignments.set(a.id, { ...a });
      store.setState({ tasks: newTasks, links: newLinks, resources: newResources, assignments: newAssignments, expandedSet: new Set() });
      computeComputedPropertiesInternal(true);
      const s = gs();
      store.setState({ revision: s.revision + 1, taskRevision: s.taskRevision + 1 });
    },

    recalcLayout(): void {
      recomputeVisualLayout();
      const s = gs();
      store.setState({ revision: s.revision + 1, layoutRevision: s.layoutRevision + 1 });
    },

    updateTask(id: GanttId, partial: Partial<GanttTaskData>): void {
      const state = gs();
      const task = state.tasks.get(id);
      if (!task) return;
      const { children: _c, ...rest } = partial; void _c;
      let updated = { ...task, ...rest } as GanttTask;
      const calendar = calendarManager.resolveCalendar(updated.calendar);
      if (calendar && (partial.start || partial.end || partial.duration !== undefined) && updated.duration !== undefined && updated.start) {
        const from = new Date(updated.start);
        updated = { ...updated, end: calendar.addWorkDays(from, updated.duration).toISOString().slice(0, 10) };
      }
      const newTasks = new Map(state.tasks); newTasks.set(id, updated);
      store.setState({ tasks: newTasks, revision: state.revision + 1, taskRevision: state.taskRevision + 1 });
      computeComputedPropertiesInternal();
      const s2 = gs();
      store.setState({ layoutRevision: s2.layoutRevision + 1 });
    },

    updateLink(id: GanttId, partial: Partial<GanttLink>): void {
      const state = gs();
      const link = state.links.get(id); if (!link) return;
      const newLinks = new Map(state.links); newLinks.set(id, { ...link, ...partial });
      store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
      computeLinkPolylinesInternal();
    },

    getVisibleTasks(): GanttTask[] {
      if (_visibleTasksCacheDirty) {
        const state = gs();
        _cachedVisibleTasks = getVisibleTasks(state.tasks, parentIndex, state.expandedSet);
        _visibleTasksCacheDirty = false;
      }
      return _cachedVisibleTasks;
    },

    getVisibleTaskWindow(scrollTop: number, viewportHeight: number, overscan = 5): { tasks: GanttTask[]; totalHeight: number } {
      const tasks = api.getVisibleTasks();
      const rowHeight = gs().rowHeight;
      const buffer = overscan * rowHeight;
      const viewBottom = scrollTop + viewportHeight;
      const windowed = tasks.filter((t) => {
        const tEnd = t.$y + t.$h;
        return tEnd >= scrollTop - buffer && t.$y <= viewBottom + buffer;
      });
      const totalHeight = tasks.length > 0
        ? tasks.reduce((max, t) => Math.max(max, t.$y + t.$h), 0)
        : tasks.length * rowHeight;
      return { tasks: windowed, totalHeight };
    },

    isOpen(taskId: GanttId): boolean { return gs().expandedSet.has(taskId); },

    toggleOpen(taskId: GanttId): void {
      const state = gs();
      if (!state.tasks.get(taskId)) return;
      const newExpanded = new Set(state.expandedSet);
      if (newExpanded.has(taskId)) newExpanded.delete(taskId); else newExpanded.add(taskId);
      _visibleTasksCacheDirty = true;
      store.setState({ expandedSet: newExpanded, revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
      computeCoordinates();
      computeLinkPolylinesInternal();
      const s2 = gs();
      store.setState({ layoutRevision: s2.layoutRevision + 1 });
    },

    expandAll(): void {
      const state = gs();
      const newExpanded = new Set(state.expandedSet);
      for (const task of state.tasks.values()) { if (parentIndex.has(task.id)) newExpanded.add(task.id); }
      _visibleTasksCacheDirty = true;
      store.setState({ expandedSet: newExpanded, revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
    },

    collapseAll(): void {
      const state = gs();
      _visibleTasksCacheDirty = true;
      store.setState({ expandedSet: new Set(), revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
    },

    getVisibleDescendantCount(taskId: GanttId): number { return getVisibleDescendantCount(taskId, parentIndex); },

    deleteTask(id: GanttId): void {
      const state = gs();
      if (!state.tasks.get(id)) return;
      const childIds: GanttId[] = [];
      collectDescendantIds(id, parentIndex, childIds);
      const allIds = [id, ...childIds];
      const newTasks = new Map(state.tasks); const newLinks = new Map(state.links);
      for (const deleteId of allIds) {
        for (const [linkId, link] of newLinks) { if (link.source === deleteId || link.target === deleteId) newLinks.delete(linkId); }
        newTasks.delete(deleteId);
      }
      store.setState({ tasks: newTasks, links: newLinks, revision: state.revision + 1, taskRevision: state.taskRevision + 1 });
      computeComputedPropertiesInternal();
    },

    addLink(source: GanttId, target: GanttId, type: GanttLinkType): GanttLink {
      const state = gs();
      const id = `link_${String(source)}_${String(target)}_${Date.now()}`;
      const link: GanttLink = { id, source, target, type, $p: '' };
      const newLinks = new Map(state.links); newLinks.set(id, link);
      store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
      const tasksAfterSourceTarget = computeSourceTarget(gs().tasks, gs().links);
      store.setState({ tasks: tasksAfterSourceTarget });
      computeLinkPolylinesInternal();
      return link;
    },

    removeLink(id: GanttId): void {
      const state = gs();
      const newLinks = new Map(state.links); newLinks.delete(id);
      store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
      const tasksAfterSourceTarget = computeSourceTarget(gs().tasks, gs().links);
      store.setState({ tasks: tasksAfterSourceTarget });
    },

    setZoom(zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number): void {
      const state = gs();
      if (!state.zoomLevels.has(zoomKey)) return;
      const oldCellWidth = state.cellWidth;
      const zoom = state.zoomLevels.get(zoomKey)!;
      const newCellWidth = zoom.minCellWidth ?? oldCellWidth;
      store.setState({ currentZoom: zoomKey, cellWidth: newCellWidth });
      const sl = anchorScrollLeft ?? _scrollLeft;
      const cw = anchorContainerWidth ?? state.containerWidth;
      if (sl > 0 && cw > 0) {
        const centerDate = pixelToDate(sl + cw / 2, state.scaleRange, oldCellWidth);
        api.recalcLayout();
        const newCenterX = dateToPixel(centerDate, gs().scaleRange, gs().cellWidth);
        _scrollLeft = Math.max(0, newCenterX - cw / 2);
      } else { api.recalcLayout(); }
    },

    getAvailableZooms(): GanttZoomLevel[] { return Array.from(gs().zoomLevels.values()); },

    destroy(): void {
      parentIndex.clear();
      store.setState({ tasks: new Map(), links: new Map(), resources: new Map(), assignments: new Map(), expandedSet: new Set() });
    },
  };

  return api;
}

export type GanttStore = GanttStoreApi;
export const GanttStore: new (config?: GanttStoreConfig) => GanttStoreApi = createGanttStore as unknown as new (config?: GanttStoreConfig) => GanttStoreApi;
