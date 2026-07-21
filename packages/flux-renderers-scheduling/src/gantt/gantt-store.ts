import type {
  GanttId,
  GanttTask,
  GanttTaskData,
  GanttLink,
  GanttLinkData,
  GanttLinkType,
  GanttResource,
  GanttAssignment,
  GanttZoomLevel,
} from './gantt.types.js';
import { computeTaskLayout, computeLinkPolylines, pixelToDate, dateToPixel } from './utils/layout.js';
import { CalendarManager, type WorkCalendar } from './utils/worktime.js';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

interface CalendarEntry {
  id: string;
  calendar: WorkCalendar;
}

export interface GanttStoreConfig {
  cellWidth?: number;
  zoomLevels?: GanttZoomLevel[];
  defaultZoom?: string;
  taskBarHeight?: number;
  rowHeight?: number;
  scrollLeft?: number;
  containerWidth?: number;
  globalCalendarId?: string;
}

interface GanttStoreState {
  tasks: Map<GanttId, GanttTask>;
  links: Map<GanttId, GanttLink>;
  resources: Map<GanttId, GanttResource>;
  assignments: Map<GanttId, GanttAssignment>;
  scaleRange: { start: Date; end: Date };
  cellWidth: number;
  currentZoom: string;
  zoomLevels: Map<string, GanttZoomLevel>;
  taskBarHeight: number;
  rowHeight: number;
  containerWidth: number;
  revision: number;
  taskRevision: number;
  linkRevision: number;
  treeRevision: number;
  layoutRevision: number;
  dataRevision: number;
  expandedSet: Set<GanttId>;
}

export class GanttStore {
  private store: StoreApi<GanttStoreState>;
  private parentIndex: Map<GanttId | null, GanttId[]> = new Map();
  _scrollLeft: number;
  calendarManager: CalendarManager;

  constructor(config?: GanttStoreConfig) {
    this._scrollLeft = config?.scrollLeft ?? 0;
    this.calendarManager = new CalendarManager(config?.globalCalendarId);

    this.store = createStore<GanttStoreState>(() => ({
      tasks: new Map(),
      links: new Map(),
      resources: new Map(),
      assignments: new Map(),
      scaleRange: { start: new Date(), end: new Date() },
      cellWidth: config?.cellWidth ?? 40,
      currentZoom: config?.defaultZoom ?? 'week',
      zoomLevels: new Map(config?.zoomLevels?.map((zl) => [zl.key, zl]) ?? []),
      taskBarHeight: config?.taskBarHeight ?? 28,
      rowHeight: config?.rowHeight ?? 40,
      containerWidth: config?.containerWidth ?? 800,
      revision: 0,
      taskRevision: 0,
      linkRevision: 0,
      treeRevision: 0,
      layoutRevision: 0,
      dataRevision: 0,
      expandedSet: new Set(),
    }));
  }

  subscribe = (listener: () => void): (() => void) => this.store.subscribe(listener);

  get tasks(): Map<GanttId, GanttTask> { return this.store.getState().tasks; }
  get links(): Map<GanttId, GanttLink> { return this.store.getState().links; }
  get resources(): Map<GanttId, GanttResource> { return this.store.getState().resources; }
  get assignments(): Map<GanttId, GanttAssignment> { return this.store.getState().assignments; }
  get scaleRange(): { start: Date; end: Date } { return this.store.getState().scaleRange; }
  get cellWidth(): number { return this.store.getState().cellWidth; }
  set cellWidth(v: number) { this.store.setState({ cellWidth: v }); }
  get currentZoom(): string { return this.store.getState().currentZoom; }
  set currentZoom(v: string) { this.store.setState({ currentZoom: v }); }
  get zoomLevels(): Map<string, GanttZoomLevel> { return this.store.getState().zoomLevels; }
  get taskBarHeight(): number { return this.store.getState().taskBarHeight; }
  get rowHeight(): number { return this.store.getState().rowHeight; }
  get containerWidth(): number { return this.store.getState().containerWidth; }
  set containerWidth(v: number) { this.store.setState({ containerWidth: v }); }
  get revision(): number { return this.store.getState().revision; }
  get taskRevision(): number { return this.store.getState().taskRevision; }
  get linkRevision(): number { return this.store.getState().linkRevision; }
  get treeRevision(): number { return this.store.getState().treeRevision; }
  get layoutRevision(): number { return this.store.getState().layoutRevision; }
  get dataRevision(): number { return this.store.getState().dataRevision; }
  get scrollLeft(): number { return this._scrollLeft; }
  set scrollLeft(v: number) { this._scrollLeft = v; }

  parse(
    tasks: GanttTaskData[],
    links: GanttLinkData[],
    resources?: GanttResource[],
    assignments?: GanttAssignment[],
    calendars?: CalendarEntry[],
  ): void {
    if (calendars) {
      for (const entry of calendars) {
        this.calendarManager.registerCalendar(entry.id, entry.calendar);
      }
    }

    const newTasks = new Map<GanttId, GanttTask>();
    for (const t of this.flattenTasks(tasks, null)) {
      newTasks.set(t.id, {
        ...t,
        $x: 0,
        $y: 0,
        $w: 0,
        $h: 0,
        $level: 0,
        $source: [],
        $target: [],
      });
    }

    const newLinks = new Map<GanttId, GanttLink>();
    if (links) {
      for (const l of links) {
        newLinks.set(l.id, { ...l, $p: '' });
      }
    }

    const newResources = new Map<GanttId, GanttResource>();
    if (resources) {
      for (const r of resources) {
        newResources.set(r.id, { ...r });
      }
    }

    const newAssignments = new Map<GanttId, GanttAssignment>();
    if (assignments) {
      for (const a of assignments) {
        newAssignments.set(a.id, { ...a });
      }
    }

    this.store.setState({
      tasks: newTasks,
      links: newLinks,
      resources: newResources,
      assignments: newAssignments,
      expandedSet: new Set(),
    });

    this.computeComputedPropertiesInternal(true);

    const stateAfter = this.store.getState();
    this.store.setState({
      revision: stateAfter.revision + 1,
      taskRevision: stateAfter.taskRevision + 1,
    });
  }

  private *flattenTasks(tasks: GanttTaskData[], parent: GanttId | null): Generator<GanttTaskData> {
    for (const task of tasks) {
      const flat: GanttTaskData = { ...task, parent, children: undefined };
      yield flat;
      if (task.children && task.children.length > 0) {
        yield* this.flattenTasks(task.children, task.id);
      }
    }
  }

  private computeComputedPropertiesInternal(seedExpand = false): void {
    this.buildParentIndex();
    this.computeLevels();
    this.computeSourceTarget();
    if (seedExpand) {
      this.seedExpandedSet();
    }
    this.computeScaleRange();
    this.computeCoordinates();
    this.computeLinkPolylines();
  }

  private seedExpandedSet(): void {
    const state = this.store.getState();
    const newExpanded = new Set(state.expandedSet);
    for (const task of state.tasks.values()) {
      if (task.open ?? true) {
        newExpanded.add(task.id);
      }
    }
    this.store.setState({ expandedSet: newExpanded });
  }

  private buildParentIndex(): void {
    this.parentIndex.clear();
    const state = this.store.getState();
    for (const task of state.tasks.values()) {
      const p: GanttId | null = task.parent ?? null;
      if (!this.parentIndex.has(p)) {
        this.parentIndex.set(p, []);
      }
      this.parentIndex.get(p)!.push(task.id);
    }
  }

  private computeLevels(): void {
    const state = this.store.getState();
    const newTasks = new Map(state.tasks);
    const queue: Array<{ parent: GanttId | null; level: number }> = [{ parent: null, level: 0 }];
    while (queue.length > 0) {
      const { parent, level } = queue.shift()!;
      const children = this.parentIndex.get(parent);
      if (children) {
        for (const childId of children) {
          const task = newTasks.get(childId);
          if (task) {
            newTasks.set(childId, { ...task, $level: level });
            queue.push({ parent: childId, level: level + 1 });
          }
        }
      }
    }
    this.store.setState({ tasks: newTasks });
  }

  private computeSourceTarget(): void {
    const state = this.store.getState();
    const newTasks = new Map(state.tasks);
    for (const [id, task] of newTasks) {
      newTasks.set(id, { ...task, $source: [], $target: [] });
    }
    for (const link of state.links.values()) {
      const sourceTask = newTasks.get(link.source);
      const targetTask = newTasks.get(link.target);
      if (sourceTask) {
        newTasks.set(link.source, { ...sourceTask, $source: [...sourceTask.$source, link.target] });
      }
      if (targetTask) {
        newTasks.set(link.target, { ...targetTask, $target: [...targetTask.$target, link.source] });
      }
    }
    this.store.setState({ tasks: newTasks });
  }

  recalcLayout(): void {
    this.computeScaleRange();
    this.computeCoordinates();
    this.computeLinkPolylines();
    const state = this.store.getState();
    this.store.setState({
      revision: state.revision + 1,
      layoutRevision: state.layoutRevision + 1,
    });
  }

  private computeScaleRange(): void {
    const state = this.store.getState();
    if (state.tasks.size === 0) {
      const now = new Date();
      this.store.setState({
        scaleRange: {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      });
      return;
    }

    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const task of state.tasks.values()) {
      const s = new Date(task.start).getTime();
      const e = new Date(task.end).getTime();
      if (s < minMs) minMs = s;
      if (e > maxMs) maxMs = e;
    }

    if (minMs >= maxMs) {
      maxMs = minMs + 86400000;
    }

    const pad = Math.max((maxMs - minMs) * 0.1, 86400000);
    this.store.setState({
      scaleRange: {
        start: new Date(minMs - pad),
        end: new Date(maxMs + pad),
      },
    });
  }

  private computeCoordinates(): void {
    const state = this.store.getState();
    const visibleTasks = this.getVisibleTasks();
    const visibleIds = visibleTasks.map((t) => t.id);
    computeTaskLayout(visibleTasks, visibleIds, state.scaleRange, state.cellWidth, state.taskBarHeight, state.rowHeight);
    const newTasks = new Map(state.tasks);
    for (const task of visibleTasks) {
      newTasks.set(task.id, task);
    }
    this.store.setState({ tasks: newTasks });
  }

  private computeLinkPolylines(): void {
    const state = this.store.getState();
    computeLinkPolylines(state.tasks, state.links);
    const newLinks = new Map(state.links);
    for (const [id, link] of state.links) {
      newLinks.set(id, link);
    }
    this.store.setState({ links: newLinks });
  }

  updateTask(id: GanttId, partial: Partial<GanttTaskData>): void {
    const state = this.store.getState();
    const task = state.tasks.get(id);
    if (!task) return;
    const { children: _c, ...rest } = partial;
    void _c;
    let updated = { ...task, ...rest } as GanttTask;

    const calendar = this.calendarManager.resolveCalendar(updated.calendar);
    if (calendar && (partial.start || partial.end || partial.duration !== undefined)) {
      if (updated.duration !== undefined && updated.start) {
        const from = new Date(updated.start);
        updated = { ...updated, end: calendar.addWorkDays(from, updated.duration).toISOString().slice(0, 10) };
      }
    }

    const newTasks = new Map(state.tasks);
    newTasks.set(id, updated);
    this.store.setState({
      tasks: newTasks,
      revision: state.revision + 1,
      taskRevision: state.taskRevision + 1,
    });

    this.computeComputedPropertiesInternal();
  }

  updateLink(id: GanttId, partial: Partial<GanttLink>): void {
    const state = this.store.getState();
    const link = state.links.get(id);
    if (!link) return;
    const newLinks = new Map(state.links);
    newLinks.set(id, { ...link, ...partial });
    this.store.setState({
      links: newLinks,
      revision: state.revision + 1,
      linkRevision: state.linkRevision + 1,
    });
    this.computeLinkPolylines();
  }

  getVisibleTasks(): GanttTask[] {
    const result: GanttTask[] = [];
    this.collectVisible(null, result);
    return result;
  }

  private collectVisible(parent: GanttId | null, result: GanttTask[]): void {
    const children = this.parentIndex.get(parent);
    if (!children) return;
    const state = this.store.getState();
    for (const childId of children) {
      const task = state.tasks.get(childId);
      if (!task) continue;
      result.push(task);
      const hasChildren = this.parentIndex.has(childId);
      if (hasChildren && state.expandedSet.has(childId)) {
        this.collectVisible(childId, result);
      }
    }
  }

  isOpen(taskId: GanttId): boolean {
    return this.store.getState().expandedSet.has(taskId);
  }

  toggleOpen(taskId: GanttId): void {
    const state = this.store.getState();
    const task = state.tasks.get(taskId);
    if (!task) return;
    const newExpanded = new Set(state.expandedSet);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    this.store.setState({
      expandedSet: newExpanded,
      revision: state.revision + 1,
      treeRevision: state.treeRevision + 1,
    });
  }

  expandAll(): void {
    const state = this.store.getState();
    const newExpanded = new Set(state.expandedSet);
    for (const task of state.tasks.values()) {
      if (this.parentIndex.has(task.id)) {
        newExpanded.add(task.id);
      }
    }
    this.store.setState({
      expandedSet: newExpanded,
      revision: state.revision + 1,
      treeRevision: state.treeRevision + 1,
    });
  }

  collapseAll(): void {
    const state = this.store.getState();
    this.store.setState({
      expandedSet: new Set(),
      revision: state.revision + 1,
      treeRevision: state.treeRevision + 1,
    });
  }

  getVisibleDescendantCount(taskId: GanttId): number {
    let count = 0;
    const children = this.parentIndex.get(taskId);
    if (!children) return 0;
    for (const childId of children) {
      count += 1 + this.getVisibleDescendantCount(childId);
    }
    return count;
  }

  deleteTask(id: GanttId): void {
    const state = this.store.getState();
    const task = state.tasks.get(id);
    if (!task) return;

    const childIds: GanttId[] = [];
    this.collectDescendantIds(id, childIds);
    const allIds = [id, ...childIds];

    const newTasks = new Map(state.tasks);
    const newLinks = new Map(state.links);

    for (const deleteId of allIds) {
      for (const [linkId, link] of newLinks) {
        if (link.source === deleteId || link.target === deleteId) {
          newLinks.delete(linkId);
        }
      }
      newTasks.delete(deleteId);
    }

    this.store.setState({
      tasks: newTasks,
      links: newLinks,
      revision: state.revision + 1,
      taskRevision: state.taskRevision + 1,
    });

    this.computeComputedPropertiesInternal();
  }

  private collectDescendantIds(parentId: GanttId, result: GanttId[]): void {
    const children = this.parentIndex.get(parentId);
    if (!children) return;
    for (const childId of children) {
      result.push(childId);
      this.collectDescendantIds(childId, result);
    }
  }

  addLink(source: GanttId, target: GanttId, type: GanttLinkType): GanttLink {
    const state = this.store.getState();
    const id = `link_${String(source)}_${String(target)}_${Date.now()}`;
    const link: GanttLink = { id, source, target, type, $p: '' };
    const newLinks = new Map(state.links);
    newLinks.set(id, link);
    this.store.setState({
      links: newLinks,
      revision: state.revision + 1,
      linkRevision: state.linkRevision + 1,
    });
    this.computeSourceTarget();
    this.computeLinkPolylines();
    return link;
  }

  removeLink(id: GanttId): void {
    const state = this.store.getState();
    const newLinks = new Map(state.links);
    newLinks.delete(id);
    this.store.setState({
      links: newLinks,
      revision: state.revision + 1,
      linkRevision: state.linkRevision + 1,
    });
    this.computeSourceTarget();
  }

  setZoom(zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number): void {
    const state = this.store.getState();
    if (!state.zoomLevels.has(zoomKey)) return;

    const oldCellWidth = state.cellWidth;
    const zoom = state.zoomLevels.get(zoomKey)!;
    const newCellWidth = zoom.minCellWidth ?? oldCellWidth;

    this.store.setState({
      currentZoom: zoomKey,
      cellWidth: newCellWidth,
    });

    const sl = anchorScrollLeft ?? this._scrollLeft;
    const cw = anchorContainerWidth ?? state.containerWidth;

    if (sl > 0 && cw > 0) {
      const centerDate = pixelToDate(sl + cw / 2, state.scaleRange, oldCellWidth);
      this.recalcLayout();
      const newCenterX = dateToPixel(centerDate, this.store.getState().scaleRange, this.store.getState().cellWidth);
      this._scrollLeft = Math.max(0, newCenterX - cw / 2);
    } else {
      this.recalcLayout();
    }
  }

  getAvailableZooms(): GanttZoomLevel[] {
    return Array.from(this.store.getState().zoomLevels.values());
  }
}
