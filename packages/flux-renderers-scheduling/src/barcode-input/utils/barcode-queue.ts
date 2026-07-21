import type { BarcodeQueueItem } from '../barcode-input.types.js';

export class BarcodeQueue {
  private items: BarcodeQueueItem[] = [];

  enqueue(rawValue: string, format: string): BarcodeQueueItem {
    const existing = this.items.find(
      (i) => i.rawValue === rawValue,
    );
    if (existing) {
      if (existing.status === 'pending') {
        existing.status = 'duplicate';
      }
      return existing;
    }

    const item: BarcodeQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      rawValue,
      timestamp: Date.now(),
      format,
      status: 'pending',
    };
    this.items.push(item);
    return item;
  }

  dequeue(id: string): BarcodeQueueItem | undefined {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    return this.items.splice(idx, 1)[0];
  }

  flush(): BarcodeQueueItem[] {
    const pending = this.items.filter((i) => i.status === 'pending');
    pending.forEach((i) => {
      i.status = 'submitted';
    });
    return pending;
  }

  clear(): void {
    this.items = [];
  }

  getAll(): BarcodeQueueItem[] {
    return [...this.items];
  }

  getPending(): BarcodeQueueItem[] {
    return this.items.filter((i) => i.status === 'pending');
  }

  getCount(): number {
    return this.items.length;
  }

  markSubmitted(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.status = 'submitted';
    }
  }

  markError(id: string, message: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.status = 'error';
      item.errorMessage = message;
    }
  }
}


