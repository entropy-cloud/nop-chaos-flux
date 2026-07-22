import { describe, it, expect, beforeEach } from 'vitest';
import { createBarcodeQueueStore, enqueueItem, dequeueItem, clearQueue, markSubmitted, getPending, getAllItems } from './barcode-queue.js';
import type { BarcodeQueueStore } from './barcode-queue.js';

describe('BarcodeQueue (Zustand)', () => {
  let store: BarcodeQueueStore;

  beforeEach(() => {
    store = createBarcodeQueueStore();
  });

  it('should start empty', () => {
    expect(getAllItems(store)).toEqual([]);
  });

  it('should enqueue items', () => {
    const item = enqueueItem(store, '1234567890', 'ean_13');
    expect(item.rawValue).toBe('1234567890');
    expect(item.format).toBe('ean_13');
    expect(item.status).toBe('pending');
    expect(getAllItems(store).length).toBe(1);
  });

  it('should mark duplicates on enqueue of same value', () => {
    enqueueItem(store, '1234567890', 'ean_13');
    const dup = enqueueItem(store, '1234567890', 'ean_13');
    expect(dup.status).toBe('duplicate');
  });

  it('should dequeue items', () => {
    const item = enqueueItem(store, 'abc', 'code_128');
    expect(getAllItems(store).length).toBe(1);
    const removed = dequeueItem(store, item.id);
    expect(removed).toBeDefined();
    expect(removed!.id).toBe(item.id);
    expect(getAllItems(store).length).toBe(0);
  });

  it('should return undefined when dequeuing non-existent id', () => {
    expect(dequeueItem(store, 'nonexistent')).toBeUndefined();
  });

  it('should clear all items', () => {
    enqueueItem(store, 'a', 'code_128');
    enqueueItem(store, 'b', 'ean_13');
    expect(getAllItems(store).length).toBe(2);
    clearQueue(store);
    expect(getAllItems(store).length).toBe(0);
  });

  it('should mark items as submitted', () => {
    const item = enqueueItem(store, 'a', 'code_128');
    markSubmitted(store, item.id);
    const items = getAllItems(store);
    expect(items[0].status).toBe('submitted');
  });

  it('should get pending items', () => {
    enqueueItem(store, 'a', 'code_128');
    enqueueItem(store, 'b', 'ean_13');
    const item = enqueueItem(store, 'c', 'qr_code');
    markSubmitted(store, item.id);
    expect(getPending(store).length).toBe(2);
  });
});
