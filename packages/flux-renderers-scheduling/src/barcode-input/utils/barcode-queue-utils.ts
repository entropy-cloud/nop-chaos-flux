import { createStore } from 'zustand/vanilla';
import type { BarcodeQueueItem } from '../barcode-input.types.js';

interface BarcodeQueueState {
  items: BarcodeQueueItem[];
}

export function createBarcodeQueueStore() {
  return createStore<BarcodeQueueState>(() => ({
    items: [],
  }));
}

export type BarcodeQueueStore = ReturnType<typeof createBarcodeQueueStore>;

export function enqueueItem(
  store: BarcodeQueueStore,
  rawValue: string,
  format: string,
  options?: { alwaysAppend?: boolean },
): BarcodeQueueItem {
  const state = store.getState();
  const existing = state.items.find((i) => i.rawValue === rawValue);
  if (existing && options?.alwaysAppend !== true) {
    if (existing.status === 'pending') {
      store.setState({
        items: state.items.map((i) => i.id === existing.id ? { ...i, status: 'duplicate' as const } : i),
      });
      return store.getState().items.find((i) => i.id === existing.id)!;
    }
    if (existing.status === 'submitted') {
      const dupItem: BarcodeQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        rawValue,
        timestamp: Date.now(),
        format,
        status: 'duplicate',
      };
      store.setState({ items: [...state.items, dupItem] });
      return dupItem;
    }
    return store.getState().items.find((i) => i.id === existing.id)!;
  }

  // 2-13 batch-mode adjudication: every scan appends a NEW pending entry even
  // when an identical rawValue already exists (pending or submitted), so each
  // consecutive same-value scan produces submittable processing instead of
  // being folded into a duplicate marker that autoSubmit never delivers.
  const item: BarcodeQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    rawValue,
    timestamp: Date.now(),
    format,
    status: 'pending',
  };
  store.setState({ items: [...state.items, item] });
  return item;
}

export function dequeueItem(store: BarcodeQueueStore, id: string): BarcodeQueueItem | undefined {
  const state = store.getState();
  const idx = state.items.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  const item = state.items[idx];
  store.setState({ items: state.items.filter((i) => i.id !== id) });
  return item;
}

export function clearQueue(store: BarcodeQueueStore): void {
  store.setState({ items: [] });
}

export function markSubmitted(store: BarcodeQueueStore, id: string): void {
  const state = store.getState();
  store.setState({
    items: state.items.map((i) => i.id === id ? { ...i, status: 'submitted' as const } : i),
  });
}

export function getPending(store: BarcodeQueueStore): BarcodeQueueItem[] {
  return store.getState().items.filter((i) => i.status === 'pending');
}

export function getAllItems(store: BarcodeQueueStore): BarcodeQueueItem[] {
  return store.getState().items;
}


