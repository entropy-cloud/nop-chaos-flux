import { describe, it, expect, beforeEach } from 'vitest';
import { BarcodeQueue } from './barcode-queue.js';

describe('BarcodeQueue', () => {
  let queue: BarcodeQueue;

  beforeEach(() => {
    queue = new BarcodeQueue();
  });

  it('should start empty', () => {
    expect(queue.getCount()).toBe(0);
    expect(queue.getAll()).toEqual([]);
  });

  it('should enqueue items', () => {
    const item = queue.enqueue('1234567890', 'ean_13');
    expect(item.rawValue).toBe('1234567890');
    expect(item.format).toBe('ean_13');
    expect(item.status).toBe('pending');
    expect(queue.getCount()).toBe(1);
  });

  it('should mark duplicates on enqueue of same value', () => {
    queue.enqueue('1234567890', 'ean_13');
    const dup = queue.enqueue('1234567890', 'ean_13');
    expect(dup.status).toBe('duplicate');
  });

  it('should dequeue items', () => {
    const item = queue.enqueue('abc', 'code_128');
    expect(queue.getCount()).toBe(1);
    const removed = queue.dequeue(item.id);
    expect(removed).toBeDefined();
    expect(removed!.id).toBe(item.id);
    expect(queue.getCount()).toBe(0);
  });

  it('should return undefined when dequeuing non-existent id', () => {
    expect(queue.dequeue('nonexistent')).toBeUndefined();
  });

  it('should flush pending items', () => {
    queue.enqueue('a', 'code_128');
    queue.enqueue('b', 'ean_13');
    expect(queue.getPending().length).toBe(2);
    const flushed = queue.flush();
    expect(flushed.length).toBe(2);
    expect(queue.getPending().length).toBe(0);
    flushed.forEach((i) => expect(i.status).toBe('submitted'));
  });

  it('should not flush submitted items', () => {
    queue.enqueue('a', 'code_128');
    queue.flush();
    const flushedAgain = queue.flush();
    expect(flushedAgain.length).toBe(0);
  });

  it('should deduplicate across all statuses, not just pending', () => {
    queue.enqueue('1234567890', 'ean_13');
    queue.flush();
    const countBefore = queue.getCount();
    const reEnqueued = queue.enqueue('1234567890', 'ean_13');
    expect(reEnqueued.rawValue).toBe('1234567890');
    expect(queue.getCount()).toBe(countBefore);
  });

  it('should clear all items', () => {
    queue.enqueue('a', 'code_128');
    queue.enqueue('b', 'ean_13');
    expect(queue.getCount()).toBe(2);
    queue.clear();
    expect(queue.getCount()).toBe(0);
  });

  it('should mark items as error', () => {
    const item = queue.enqueue('a', 'code_128');
    queue.markError(item.id, 'Network error');
    expect(item.status).toBe('error');
    expect(item.errorMessage).toBe('Network error');
  });

  it('should mark items as submitted', () => {
    const item = queue.enqueue('a', 'code_128');
    queue.markSubmitted(item.id);
    expect(item.status).toBe('submitted');
  });

  it('should get pending items', () => {
    queue.enqueue('a', 'code_128');
    queue.enqueue('b', 'ean_13');
    const item = queue.enqueue('c', 'qr_code');
    queue.markSubmitted(item.id);
    expect(queue.getPending().length).toBe(2);
  });
});

