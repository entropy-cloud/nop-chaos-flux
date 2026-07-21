import type { GanttId, GanttLinkType, GanttLinkData } from './gantt.types.js';
import { GanttStore } from './gantt-store.js';

export interface Command {
  type: string;
  execute(): void;
  undo(): void;
  redo(): void;
  mergeable?(other: Command): boolean;
  merge?(other: Command): Command;
}

export class UpdateTaskCommand implements Command {
  type = 'updateTask';
  private taskId: GanttId;
  private before: Record<string, unknown>;
  private after: Record<string, unknown>;
  private store: GanttStore;

  constructor(store: GanttStore, taskId: GanttId, before: Record<string, unknown>, after: Record<string, unknown>) {
    this.store = store;
    this.taskId = taskId;
    this.before = { ...before };
    this.after = { ...after };
  }

  execute(): void {
    this.store.updateTask(this.taskId, this.after as any);
  }

  undo(): void {
    this.store.updateTask(this.taskId, this.before as any);
  }

  redo(): void {
    this.store.updateTask(this.taskId, this.after as any);
  }

  mergeable(other: Command): boolean {
    return other instanceof UpdateTaskCommand && other.taskId === this.taskId;
  }

  merge(other: Command): Command {
    const o = other as UpdateTaskCommand;
    return new UpdateTaskCommand(this.store, this.taskId, this.before, o.after);
  }
}

export class BatchUpdateTaskCommand implements Command {
  type = 'batchUpdateTask';
  private commands: UpdateTaskCommand[];

  constructor(commands: UpdateTaskCommand[]) {
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) cmd.execute();
  }

  undo(): void {
    for (const cmd of this.commands) cmd.undo();
  }

  redo(): void {
    for (const cmd of this.commands) cmd.redo();
  }

  mergeable(_other: Command): boolean {
    return false;
  }
}

export class AddLinkCommand implements Command {
  type = 'addLink';
  private store: GanttStore;
  private source: GanttId;
  private target: GanttId;
  private linkType: GanttLinkType;
  private linkId: GanttId | null = null;

  constructor(store: GanttStore, source: GanttId, target: GanttId, linkType: GanttLinkType) {
    this.store = store;
    this.source = source;
    this.target = target;
    this.linkType = linkType;
  }

  execute(): void {
    const link = this.store.addLink(this.source, this.target, this.linkType);
    this.linkId = link.id;
  }

  undo(): void {
    if (this.linkId != null) {
      this.store.removeLink(this.linkId);
    }
  }

  redo(): void {
    if (this.linkId != null) {
      this.store.addLink(this.source, this.target, this.linkType);
    }
  }

  mergeable(_other: Command): boolean {
    return false;
  }
}

export class RemoveLinkCommand implements Command {
  type = 'removeLink';
  private store: GanttStore;
  private linkData: GanttLinkData | null = null;
  private linkId: GanttId;

  constructor(store: GanttStore, linkId: GanttId) {
    this.store = store;
    this.linkId = linkId;
  }

  execute(): void {
    const link = this.store.links.get(this.linkId);
    if (link) {
      this.linkData = { id: link.id, source: link.source, target: link.target, type: link.type, lag: link.lag };
    }
    this.store.removeLink(this.linkId);
  }

  undo(): void {
    if (this.linkData) {
      this.store.addLink(this.linkData.source, this.linkData.target, this.linkData.type);
    }
  }

  redo(): void {
    this.store.removeLink(this.linkId);
  }

  mergeable(_other: Command): boolean {
    return false;
  }
}

// FIXME: Inconsistent undo pattern — Gantt uses command-based undo (this file)
// while Kanban (kanban-undo-stack.ts) uses snapshot-based undo.
// These should be unified in a future refactor. The command pattern was chosen
// for Gantt because task operations are fine-grained and mergeable.
// See kanban-undo-stack.ts for the alternative snapshot approach.
export class UndoStack {
  private commands: Command[] = [];
  private pointer = -1;
  private limit: number;

  constructor(limit = 50) {
    this.limit = limit;
  }

  get canUndo(): boolean {
    return this.pointer >= 0;
  }

  get canRedo(): boolean {
    return this.pointer < this.commands.length - 1;
  }

  push(cmd: Command): void {
    this.commands.length = this.pointer + 1;

    if (this.pointer >= 0) {
      const last = this.commands[this.pointer];
      if (last.mergeable && last.merge && last.mergeable(cmd)) {
        this.commands[this.pointer] = last.merge(cmd);
        return;
      }
    }

    this.commands.push(cmd);
    if (this.commands.length > this.limit) {
      this.commands.shift();
      if (this.pointer < 0) this.pointer = 0;
    }
    this.pointer = this.commands.length - 1;
  }

  undo(): void {
    if (this.pointer < 0) return;
    this.commands[this.pointer].undo();
    this.pointer--;
  }

  redo(): void {
    if (this.pointer >= this.commands.length - 1) return;
    this.pointer++;
    this.commands[this.pointer].redo();
  }

  clear(): void {
    this.commands = [];
    this.pointer = -1;
  }
}
