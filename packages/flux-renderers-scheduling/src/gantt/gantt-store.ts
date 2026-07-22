import type { GanttId, GanttTask, GanttTaskData, GanttLink, GanttLinkData, GanttLinkType, GanttResource, GanttAssignment, GanttZoomLevel } from './gantt.types.js';
import { computeTaskLayout, computeLinkPolylines, pixelToDate, dateToPixel } from './utils/layout.js';
import { CalendarManager, type WorkCalendar } from './utils/worktime.js';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';
import { flattenTasks, buildParentIndex, seedExpandedSet, getVisibleTasks, getVisibleDescendantCount } from './gantt-tree-utils.js';

interface CalendarEntry { id: string; calendar: WorkCalendar; }

export interface GanttStoreConfig {
  cellWidth?: number; zoomLevels?: GanttZoomLevel[]; defaultZoom?: string;
  taskBarHeight?: number; rowHeight?: number; scrollLeft?: number;
  containerWidth?: number; globalCalendarId?: string;
}

interface GanttStoreState {
  tasks: Map<GanttId, GanttTask>; links: Map<GanttId, GanttLink>;
  resources: Map<GanttId, GanttResource>; assignments: Map<GanttId, GanttAssignment>;
  scaleRange: { start: Date; end: Date }; cellWidth: number; currentZoom: string;
  zoomLevels: Map<string, GanttZoomLevel>; taskBarHeight: number; rowHeight: number;
  containerWidth: number; revision: number; taskRevision: number; linkRevision: number;
  treeRevision: number; layoutRevision: number;
  expandedSet: Set<GanttId>;
}

export class GanttStore {
  private store: StoreApi<GanttStoreState>;
  private parentIndex: Map<GanttId | null, GanttId[]> = new Map();
  _scrollLeft: number; calendarManager: CalendarManager; _dirty = false;

  constructor(config?: GanttStoreConfig) {
    this._scrollLeft = config?.scrollLeft ?? 0;
    this.calendarManager = new CalendarManager(config?.globalCalendarId);
    this.store = createStore<GanttStoreState>(() => ({
      tasks: new Map(), links: new Map(), resources: new Map(), assignments: new Map(),
      scaleRange: { start: new Date(), end: new Date() },
      cellWidth: config?.cellWidth ?? 40, currentZoom: config?.defaultZoom ?? 'week',
      zoomLevels: new Map(config?.zoomLevels?.map((zl) => [zl.key, zl]) ?? []),
      taskBarHeight: config?.taskBarHeight ?? 28, rowHeight: config?.rowHeight ?? 40,
      containerWidth: config?.containerWidth ?? 800,
      revision: 0, taskRevision: 0, linkRevision: 0, treeRevision: 0, layoutRevision: 0,
      expandedSet: new Set(),
    }));
  }

  subscribe = (l: () => void): (() => void) => this.store.subscribe(l);
  private gs() { return this.store.getState(); }

  get tasks() { return this.gs().tasks; }
  get links() { return this.gs().links; }
  get resources() { return this.gs().resources; }
  get assignments() { return this.gs().assignments; }
  get scaleRange() { return this.gs().scaleRange; }
  get cellWidth(): number { return this.gs().cellWidth; }
  set cellWidth(v: number) { this.store.setState({ cellWidth: v }); }
  get currentZoom(): string { return this.gs().currentZoom; }
  set currentZoom(v: string) { this.store.setState({ currentZoom: v }); }
  get zoomLevels() { return this.gs().zoomLevels; }
  get taskBarHeight(): number { return this.gs().taskBarHeight; }
  get rowHeight(): number { return this.gs().rowHeight; }
  get containerWidth(): number { return this.gs().containerWidth; }
  set containerWidth(v: number) { this.store.setState({ containerWidth: v }); }
  get revision(): number { return this.gs().revision; }
  get taskRevision(): number { return this.gs().taskRevision; }
  get linkRevision(): number { return this.gs().linkRevision; }
  get treeRevision(): number { return this.gs().treeRevision; }
  get layoutRevision(): number { return this.gs().layoutRevision; }
  get scrollLeft(): number { return this._scrollLeft; }
  set scrollLeft(v: number) { this._scrollLeft = v; }

  parse(tasks: GanttTaskData[], links: GanttLinkData[], resources?: GanttResource[], assignments?: GanttAssignment[], calendars?: CalendarEntry[]): void {
    this._dirty = false;
    if (calendars) for (const e of calendars) this.calendarManager.registerCalendar(e.id, e.calendar);
    const newTasks = new Map<GanttId, GanttTask>();
    for (const t of flattenTasks(tasks, null)) newTasks.set(t.id, { ...t, $x: 0, $y: 0, $w: 0, $h: 0, $level: 0, $source: [], $target: [] });
    const newLinks = new Map<GanttId, GanttLink>();
    if (links) for (const l of links) newLinks.set(l.id, { ...l, $p: '' });
    const newResources = new Map<GanttId, GanttResource>();
    if (resources) for (const r of resources) newResources.set(r.id, { ...r });
    const newAssignments = new Map<GanttId, GanttAssignment>();
    if (assignments) for (const a of assignments) newAssignments.set(a.id, { ...a });
    this.store.setState({ tasks: newTasks, links: newLinks, resources: newResources, assignments: newAssignments, expandedSet: new Set() });
    this.computeComputedPropertiesInternal(true);
    const s = this.gs();
    this.store.setState({ revision: s.revision + 1, taskRevision: s.taskRevision + 1 });
  }

  private computeComputedPropertiesInternal(seedExpand = false): void {
    this.parentIndex = buildParentIndex(this.gs().tasks);
    this.computeLevels();
    this.computeSourceTarget();
    if (seedExpand) {
      const state = this.gs();
      this.store.setState({ expandedSet: seedExpandedSet(state.tasks, state.expandedSet) });
    }
    this.computeScaleRange();
    this.computeCoordinates();
    this.computeLinkPolylines();
  }

  private computeLevels(): void {
    const state = this.gs();
    const newTasks = new Map(state.tasks);
    const queue: Array<{ parent: GanttId | null; level: number }> = [{ parent: null, level: 0 }];
    while (queue.length > 0) {
      const { parent, level } = queue.shift()!;
      const children = this.parentIndex.get(parent);
      if (children) for (const childId of children) {
        const task = newTasks.get(childId);
        if (task) { newTasks.set(childId, { ...task, $level: level }); queue.push({ parent: childId, level: level + 1 }); }
      }
    }
    this.store.setState({ tasks: newTasks });
  }

  private computeSourceTarget(): void {
    const state = this.gs();
    const newTasks = new Map(state.tasks);
    for (const [id, task] of newTasks) newTasks.set(id, { ...task, $source: [], $target: [] });
    for (const link of state.links.values()) {
      const src = newTasks.get(link.source), tgt = newTasks.get(link.target);
      if (src) newTasks.set(link.source, { ...src, $source: [...src.$source, link.target] });
      if (tgt) newTasks.set(link.target, { ...tgt, $target: [...tgt.$target, link.source] });
    }
    this.store.setState({ tasks: newTasks });
  }

  recalcLayout(): void {
    this.computeScaleRange();
    this.computeCoordinates();
    this.computeLinkPolylines();
    const s = this.gs();
    this.store.setState({ revision: s.revision + 1, layoutRevision: s.layoutRevision + 1 });
  }

  private computeScaleRange(): void {
    const state = this.gs();
    if (state.tasks.size === 0) {
      const now = new Date();
      this.store.setState({ scaleRange: { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) } });
      return;
    }
    let minMs = Infinity, maxMs = -Infinity;
    for (const task of state.tasks.values()) {
      const s = new Date(task.start).getTime(), e = new Date(task.end).getTime();
      if (s < minMs) minMs = s; if (e > maxMs) maxMs = e;
    }
    if (minMs >= maxMs) maxMs = minMs + 86400000;
    const pad = Math.max((maxMs - minMs) * 0.1, 86400000);
    this.store.setState({ scaleRange: { start: new Date(minMs - pad), end: new Date(maxMs + pad) } });
  }

  private computeCoordinates(): void {
    const state = this.gs();
    const visibleTasks = getVisibleTasks(state.tasks, this.parentIndex, state.expandedSet);
    const visibleIds = visibleTasks.map((t) => t.id);
    computeTaskLayout(visibleTasks, visibleIds, state.scaleRange, state.cellWidth, state.taskBarHeight, state.rowHeight);
    const newTasks = new Map(state.tasks);
    for (const task of visibleTasks) newTasks.set(task.id, task);
    this.store.setState({ tasks: newTasks });
  }

  private computeLinkPolylines(): void {
    const state = this.gs();
    computeLinkPolylines(state.tasks, state.links);
    const newLinks = new Map(state.links);
    for (const [id, link] of state.links) newLinks.set(id, link);
    this.store.setState({ links: newLinks });
  }

  updateTask(id: GanttId, partial: Partial<GanttTaskData>): void {
    this._dirty = true;
    const state = this.gs();
    const task = state.tasks.get(id);
    if (!task) return;
    const { children: _c, ...rest } = partial; void _c;
    let updated = { ...task, ...rest } as GanttTask;
    const calendar = this.calendarManager.resolveCalendar(updated.calendar);
    if (calendar && (partial.start || partial.end || partial.duration !== undefined) && updated.duration !== undefined && updated.start) {
      const from = new Date(updated.start);
      updated = { ...updated, end: calendar.addWorkDays(from, updated.duration).toISOString().slice(0, 10) };
    }
    const newTasks = new Map(state.tasks); newTasks.set(id, updated);
    this.store.setState({ tasks: newTasks, revision: state.revision + 1, taskRevision: state.taskRevision + 1 });
    this.computeComputedPropertiesInternal();
  }

  updateLink(id: GanttId, partial: Partial<GanttLink>): void {
    this._dirty = true;
    const state = this.gs();
    const link = state.links.get(id); if (!link) return;
    const newLinks = new Map(state.links); newLinks.set(id, { ...link, ...partial });
    this.store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
    this.computeLinkPolylines();
  }

  getVisibleTasks(): GanttTask[] {
    const state = this.gs();
    return getVisibleTasks(state.tasks, this.parentIndex, state.expandedSet);
  }

  isOpen(taskId: GanttId): boolean { return this.gs().expandedSet.has(taskId); }

  toggleOpen(taskId: GanttId): void {
    this._dirty = true;
    const state = this.gs();
    if (!state.tasks.get(taskId)) return;
    const newExpanded = new Set(state.expandedSet);
    if (newExpanded.has(taskId)) newExpanded.delete(taskId); else newExpanded.add(taskId);
    this.store.setState({ expandedSet: newExpanded, revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
    this.computeCoordinates();
    this.computeLinkPolylines();
    const s2 = this.gs();
    this.store.setState({ layoutRevision: s2.layoutRevision + 1 });
  }

  expandAll(): void {
    const state = this.gs();
    const newExpanded = new Set(state.expandedSet);
    for (const task of state.tasks.values()) { if (this.parentIndex.has(task.id)) newExpanded.add(task.id); }
    this.store.setState({ expandedSet: newExpanded, revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
  }

  collapseAll(): void {
    const state = this.gs();
    this.store.setState({ expandedSet: new Set(), revision: state.revision + 1, treeRevision: state.treeRevision + 1 });
  }

  getVisibleDescendantCount(taskId: GanttId): number { return getVisibleDescendantCount(taskId, this.parentIndex); }

  deleteTask(id: GanttId): void {
    this._dirty = true;
    const state = this.gs();
    if (!state.tasks.get(id)) return;
    const childIds: GanttId[] = [];
    this.collectDescendantIds(id, childIds);
    const allIds = [id, ...childIds];
    const newTasks = new Map(state.tasks); const newLinks = new Map(state.links);
    for (const deleteId of allIds) {
      for (const [linkId, link] of newLinks) { if (link.source === deleteId || link.target === deleteId) newLinks.delete(linkId); }
      newTasks.delete(deleteId);
    }
    this.store.setState({ tasks: newTasks, links: newLinks, revision: state.revision + 1, taskRevision: state.taskRevision + 1 });
    this.computeComputedPropertiesInternal();
  }

  private collectDescendantIds(parentId: GanttId, result: GanttId[]): void {
    const children = this.parentIndex.get(parentId);
    if (!children) return;
    for (const childId of children) { result.push(childId); this.collectDescendantIds(childId, result); }
  }

  addLink(source: GanttId, target: GanttId, type: GanttLinkType): GanttLink {
    this._dirty = true;
    const state = this.gs();
    const id = `link_${String(source)}_${String(target)}_${Date.now()}`;
    const link: GanttLink = { id, source, target, type, $p: '' };
    const newLinks = new Map(state.links); newLinks.set(id, link);
    this.store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
    this.computeSourceTarget();
    this.computeLinkPolylines();
    return link;
  }

  removeLink(id: GanttId): void {
    this._dirty = true;
    const state = this.gs();
    const newLinks = new Map(state.links); newLinks.delete(id);
    this.store.setState({ links: newLinks, revision: state.revision + 1, linkRevision: state.linkRevision + 1 });
    this.computeSourceTarget();
  }

  setZoom(zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number): void {
    const state = this.gs();
    if (!state.zoomLevels.has(zoomKey)) return;
    const oldCellWidth = state.cellWidth;
    const zoom = state.zoomLevels.get(zoomKey)!;
    const newCellWidth = zoom.minCellWidth ?? oldCellWidth;
    this.store.setState({ currentZoom: zoomKey, cellWidth: newCellWidth });
    const sl = anchorScrollLeft ?? this._scrollLeft;
    const cw = anchorContainerWidth ?? state.containerWidth;
    if (sl > 0 && cw > 0) {
      const centerDate = pixelToDate(sl + cw / 2, state.scaleRange, oldCellWidth);
      this.recalcLayout();
      const newCenterX = dateToPixel(centerDate, this.gs().scaleRange, this.gs().cellWidth);
      this._scrollLeft = Math.max(0, newCenterX - cw / 2);
    } else { this.recalcLayout(); }
  }

  getAvailableZooms(): GanttZoomLevel[] { return Array.from(this.gs().zoomLevels.values()); }

  destroy(): void {
    this.parentIndex.clear();
    this.store.setState({ tasks: new Map(), links: new Map(), resources: new Map(), assignments: new Map(), expandedSet: new Set() });
  }
}
