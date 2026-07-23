import { describe, it, expect, beforeEach } from 'vitest';
import { createBarcodeQueueStore, enqueueItem, dequeueItem, clearQueue, markSubmitted, getPending, getAllItems } from './barcode-queue-utils.js';
import type { BarcodeQueueStore } from './barcode-queue-utils.js';

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

  it('should add duplicate entry when same value scanned after submission', () => {
    const item1 = enqueueItem(store, '1234567890', 'ean_13');
    markSubmitted(store, item1.id);
    const dupItem = enqueueItem(store, '1234567890', 'ean_13');
    expect(dupItem.status).toBe('duplicate');
    expect(dupItem.id).not.toBe(item1.id);
    expect(getAllItems(store).length).toBe(2);
  });

  it('should keep original submitted item unchanged when duplicate is added after submission', () => {
    const item1 = enqueueItem(store, '1234567890', 'ean_13');
    markSubmitted(store, item1.id);
    enqueueItem(store, '1234567890', 'ean_13');
    const items = getAllItems(store);
    const original = items.find((i) => i.id === item1.id);
    expect(original?.status).toBe('submitted');
  });

  it('should allow multiple duplicates of the same submitted value', () => {
    const item1 = enqueueItem(store, '1234567890', 'ean_13');
    markSubmitted(store, item1.id);
    enqueueItem(store, '1234567890', 'ean_13');
    enqueueItem(store, '1234567890', 'ean_13');
    const dups = getAllItems(store).filter((i) => i.status === 'duplicate');
    expect(dups.length).toBe(2);
  });
});
