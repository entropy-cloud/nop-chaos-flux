// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createForestSnapshotCollector, type ForestSnapshot } from './snapshot-repository.js';
import { captureDomShadow } from './dom-shadow.js';
import { createPreviewController } from './preview-controller.js';

describe('createPreviewController (M2)', () => {
  let collector: ReturnType<typeof createForestSnapshotCollector>;

  beforeEach(() => {
    collector = createForestSnapshotCollector();
    collector.observe({ scopeId: 'root', revision: 1, snapshot: { a: 1 }, change: { paths: ['a'], revision: 1 } });
    collector.flush();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function makeController(overrides: Record<string, unknown> = {}) {
    const live = document.createElement('div');
    live.setAttribute('data-live', 'true');
    live.textContent = 'live content';
    document.body.appendChild(live);
    return createPreviewController({
      getSnapshotAt: (epoch) => collector.getSnapshotAt(epoch),
      getLatestShadow: () => captureDomShadow(live),
      ...overrides,
    } as Parameters<typeof createPreviewController>[0]);
  }

  it('rejects unknown epochs without touching the DOM', () => {
    const controller = makeController();
    const before = document.body.innerHTML;
    expect(controller.enterPreview(999)).toBe(false);
    expect(controller.isActive()).toBe(false);
    expect(document.body.innerHTML).toBe(before);
  });

  it('enterPreview mounts an overlay with banner + shadow clone; leavePreview restores', () => {
    const controller = makeController();
    expect(controller.enterPreview(1)).toBe(true);
    expect(controller.isActive()).toBe(true);
    expect(controller.getActiveEpoch()).toBe(1);
    const overlay = document.querySelector('[data-nop-preview-overlay]');
    expect(overlay).not.toBeNull();
    expect(document.querySelector('[data-nop-preview-banner]')?.textContent).toContain('epoch 1');
    expect((overlay as HTMLElement).querySelector('[data-live]')?.textContent).toBe('live content');

    controller.leavePreview();
    expect(controller.isActive()).toBe(false);
    expect(document.querySelector('[data-nop-preview-overlay]')).toBeNull();
  });

  it('real keydown exits preview unless pinned', () => {
    const controller = makeController();
    controller.enterPreview(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    expect(controller.isActive()).toBe(false);

    controller.enterPreview(1);
    controller.setPinned(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(controller.isActive()).toBe(true);
    expect(controller.isPinned()).toBe(true);

    controller.setPinned(false);
    document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(controller.isActive()).toBe(false);
  });

  it('re-entering with a different epoch switches overlays without stacking', () => {
    collector.observe({ scopeId: 'root', revision: 2, snapshot: { a: 2 }, change: { paths: ['a'], revision: 2 } });
    collector.flush();
    const controller = makeController();
    expect(controller.enterPreview(1)).toBe(true);
    expect(controller.enterPreview(2)).toBe(true);
    expect(document.querySelectorAll('[data-nop-preview-overlay]').length).toBe(1);
    expect(controller.getActiveEpoch()).toBe(2);
  });

  it('getPreviewSnapshot returns collector snapshots and misses unknown epochs', () => {
    const controller = makeController();
    const snapshot = controller.getPreviewSnapshot(1) as ForestSnapshot | null;
    expect(snapshot?.epoch).toBe(1);
    expect(controller.getPreviewSnapshot(42)).toBeNull();
  });

  it('onStateChange is notified on enter/leave', () => {
    const onStateChange = vi.fn();
    const controller = makeController({ onStateChange });
    controller.enterPreview(1);
    controller.leavePreview();
    expect(onStateChange).toHaveBeenNthCalledWith(1, true, 1);
    expect(onStateChange).toHaveBeenNthCalledWith(2, false, null);
  });

  it('dispose exits preview and clears pin', () => {
    const controller = makeController();
    controller.enterPreview(1);
    controller.setPinned(true);
    controller.dispose();
    expect(controller.isActive()).toBe(false);
    expect(controller.isPinned()).toBe(false);
    expect(document.querySelector('[data-nop-preview-overlay]')).toBeNull();
  });
});
