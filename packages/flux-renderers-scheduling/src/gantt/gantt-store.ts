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

interface CalendarEntry {
  id: string;
  calendar: WorkCalendar;
}

type EventHandler = (...args: unknown[]) => void;

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

export class GanttStore {
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
  scrollLeft: number;
  containerWidth: number;
  calendarManager: CalendarManager;
  revision: number;
  taskRevision: number;
  linkRevision: number;
  treeRevision: number;
  layoutRevision: number;
  dataRevision: number;

  private expandedSet: Set<GanttId>;
  private parentIndex: Map<GanttId | null, GanttId[]>;
  private listeners: Map<string, Set<EventHandler>>;

  constructor(config?: GanttStoreConfig) {
    this.tasks = new Map();
    this.links = new Map();
    this.resources = new Map();
    this.assignments = new Map();
    this.scaleRange = { start: new Date(), end: new Date() };
    this.cellWidth = config?.cellWidth ?? 40;
    this.expandedSet = new Set();
    this.parentIndex = new Map();
    this.listeners = new Map();
    this.currentZoom = config?.defaultZoom ?? 'week';
    this.zoomLevels = new Map();
    this.taskBarHeight = config?.taskBarHeight ?? 28;
    this.rowHeight = config?.rowHeight ?? 40;
    this.scrollLeft = config?.scrollLeft ?? 0;
    this.containerWidth = config?.containerWidth ?? 800;
    this.revision = 0;
    this.taskRevision = 0;
    this.linkRevision = 0;
    this.treeRevision = 0;
    this.layoutRevision = 0;
    this.dataRevision = 0;
    this.calendarManager = new CalendarManager(config?.globalCalendarId);
    if (config?.zoomLevels) {
      for (const zl of config.zoomLevels) {
        this.zoomLevels.set(zl.key, zl);
      }
    }
  }

  parse(
    tasks: GanttTaskData[],
    links: GanttLinkData[],
    resources?: GanttResource[],
    assignments?: GanttAssignment[],
    calendars?: CalendarEntry[],
  ): void {
    this.tasks.clear();
    this.links.clear();
    this.resources.clear();
    this.assignments.clear();
    this.expandedSet.clear();

    if (calendars) {
      for (const entry of calendars) {
        this.calendarManager.registerCalendar(entry.id, entry.calendar);
      }
    }

    for (const t of this.flattenTasks(tasks, null)) {
      this.tasks.set(t.id, {
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

    if (links) {
      for (const l of links) {
        this.links.set(l.id, { ...l, $p: '' });
      }
    }

    if (resources) {
      for (const r of resources) {
        this.resources.set(r.id, { ...r });
      }
    }

    if (assignments) {
      for (const a of assignments) {
        this.assignments.set(a.id, { ...a });
      }
    }

    this.computeComputedPropertiesInternal(true);
    this.emitDataChange();
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
    for (const task of this.tasks.values()) {
      if (task.open ?? true) {
        this.expandedSet.add(task.id);
      }
    }
  }

  private buildParentIndex(): void {
    this.parentIndex.clear();
    for (const task of this.tasks.values()) {
      const p: GanttId | null = task.parent ?? null;
      if (!this.parentIndex.has(p)) {
        this.parentIndex.set(p, []);
      }
      this.parentIndex.get(p)!.push(task.id);
    }
  }

  private computeLevels(): void {
    const queue: Array<{ parent: GanttId | null; level: number }> = [{ parent: null, level: 0 }];
    while (queue.length > 0) {
      const { parent, level } = queue.shift()!;
      const children = this.parentIndex.get(parent);
      if (children) {
        for (const childId of children) {
          const task = this.tasks.get(childId);
          if (task) {
            this.tasks.set(childId, { ...task, $level: level });
            queue.push({ parent: childId, level: level + 1 });
          }
        }
      }
    }
  }

  private computeSourceTarget(): void {
    for (const [id, task] of this.tasks) {
      this.tasks.set(id, { ...task, $source: [], $target: [] });
    }
    for (const link of this.links.values()) {
      const sourceTask = this.tasks.get(link.source);
      const targetTask = this.tasks.get(link.target);
      if (sourceTask) {
        this.tasks.set(link.source, { ...sourceTask, $source: [...sourceTask.$source, link.target] });
      }
      if (targetTask) {
        this.tasks.set(link.target, { ...targetTask, $target: [...targetTask.$target, link.source] });
      }
    }
  }

  recalcLayout(): void {
    this.computeScaleRange();
    this.computeCoordinates();
    this.computeLinkPolylines();
    this.emitLayoutChange();
  }

  private computeScaleRange(): void {
    if (this.tasks.size === 0) {
      const now = new Date();
      this.scaleRange = {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
      return;
    }

    let minMs = Infinity;
    let maxMs = -Infinity;
    for (const task of this.tasks.values()) {
      const s = new Date(task.start).getTime();
      const e = new Date(task.end).getTime();
      if (s < minMs) minMs = s;
      if (e > maxMs) maxMs = e;
    }

    if (minMs >= maxMs) {
      maxMs = minMs + 86400000;
    }

    const pad = Math.max((maxMs - minMs) * 0.1, 86400000);
    this.scaleRange = {
      start: new Date(minMs - pad),
      end: new Date(maxMs + pad),
    };
  }

  private computeCoordinates(): void {
    const visibleTasks = this.getVisibleTasks();
    const visibleIds = visibleTasks.map((t) => t.id);
    computeTaskLayout(
      visibleTasks,
      visibleIds,
      this.scaleRange,
      this.cellWidth,
      this.taskBarHeight,
      this.rowHeight,
    );
  }

  private computeLinkPolylines(): void {
    computeLinkPolylines(this.tasks, this.links);
  }

  updateTask(id: GanttId, partial: Partial<GanttTaskData>): void {
    const task = this.tasks.get(id);
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

    this.tasks.set(id, updated);
    this.computeComputedPropertiesInternal();
    this.emitTaskChange(id);
  }

  updateLink(id: GanttId, partial: Partial<GanttLink>): void {
    const link = this.links.get(id);
    if (!link) return;
    this.links.set(id, { ...link, ...partial });
    this.computeLinkPolylines();
    this.emitLinkChange(id);
  }

  getVisibleTasks(): GanttTask[] {
    const result: GanttTask[] = [];
    this.collectVisible(null, result);
    return result;
  }

  private collectVisible(parent: GanttId | null, result: GanttTask[]): void {
    const children = this.parentIndex.get(parent);
    if (!children) return;
    for (const childId of children) {
      const task = this.tasks.get(childId);
      if (!task) continue;
      result.push(task);
      const hasChildren = this.parentIndex.has(childId);
      if (hasChildren && this.expandedSet.has(childId)) {
        this.collectVisible(childId, result);
      }
    }
  }

  isOpen(taskId: GanttId): boolean {
    return this.expandedSet.has(taskId);
  }

  toggleOpen(taskId: GanttId): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    if (this.expandedSet.has(taskId)) {
      this.expandedSet.delete(taskId);
    } else {
      this.expandedSet.add(taskId);
    }
    this.emitTreeChange();
  }

  expandAll(): void {
    for (const task of this.tasks.values()) {
      if (this.parentIndex.has(task.id)) {
        this.expandedSet.add(task.id);
      }
    }
    this.emitTreeChange();
  }

  collapseAll(): void {
    this.expandedSet.clear();
    this.emitTreeChange();
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
    const task = this.tasks.get(id);
    if (!task) return;

    const childIds: GanttId[] = [];
    this.collectDescendantIds(id, childIds);
    const allIds = [id, ...childIds];

    for (const deleteId of allIds) {
      for (const [linkId, link] of this.links) {
        if (link.source === deleteId || link.target === deleteId) {
          this.links.delete(linkId);
        }
      }
      this.tasks.delete(deleteId);
    }

    this.computeComputedPropertiesInternal();
    this.emitTaskDelete(id);
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
    const id = `link_${String(source)}_${String(target)}_${Date.now()}`;
    const link: GanttLink = { id, source, target, type, $p: '' };
    this.links.set(id, link);
    this.computeSourceTarget();
    this.computeLinkPolylines();
    this.emitLinkAdd(link);
    return link;
  }

  removeLink(id: GanttId): void {
    this.links.delete(id);
    this.computeSourceTarget();
    this.emitLinkDelete(id);
  }

  on(event: string, handler: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((h) => h(...args));
  }

  private emitTaskChange(id: GanttId): void {
    this.revision++;
    this.taskRevision++;
    this.emit('taskChange', { id });
  }

  private emitLinkChange(id: GanttId): void {
    this.revision++;
    this.linkRevision++;
    this.emit('linkChange', { id });
  }

  private emitTreeChange(): void {
    this.revision++;
    this.treeRevision++;
    this.emit('treeChange');
  }

  private emitLayoutChange(): void {
    this.revision++;
    this.layoutRevision++;
    this.emit('layoutChange');
  }

  private emitDataChange(): void {
    this.revision++;
    this.taskRevision++;
    this.linkRevision++;
    this.treeRevision++;
    this.layoutRevision++;
    this.dataRevision++;
    this.emit('dataChange');
  }

  private emitLinkAdd(link: GanttLink): void {
    this.revision++;
    this.linkRevision++;
    this.emit('linkAdd', link);
  }

  private emitLinkDelete(id: GanttId): void {
    this.revision++;
    this.linkRevision++;
    this.emit('linkDelete', { id });
  }

  private emitTaskDelete(id: GanttId): void {
    this.revision++;
    this.taskRevision++;
    this.emit('taskDelete', { id });
  }

  setZoom(zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number): void {
    if (!this.zoomLevels.has(zoomKey)) return;

    const oldCellWidth = this.cellWidth;

    const zoom = this.zoomLevels.get(zoomKey)!;
    this.currentZoom = zoomKey;
    this.cellWidth = zoom.minCellWidth ?? oldCellWidth;

    const sl = anchorScrollLeft ?? this.scrollLeft;
    const cw = anchorContainerWidth ?? this.containerWidth;

    if (sl > 0 && cw > 0) {
      const centerDate = pixelToDate(sl + cw / 2, this.scaleRange, oldCellWidth);
      this.recalcLayout();
      const newCenterX = dateToPixel(centerDate, this.scaleRange, this.cellWidth);
      this.scrollLeft = Math.max(0, newCenterX - cw / 2);
    } else {
      this.recalcLayout();
    }
  }

  getAvailableZooms(): GanttZoomLevel[] {
    return Array.from(this.zoomLevels.values());
  }
}
