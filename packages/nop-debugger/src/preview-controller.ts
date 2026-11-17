import type { ForestSnapshot } from './snapshot-repository.js';
import type { DomShadow } from './dom-shadow.js';
import { attachDomShadow } from './dom-shadow.js';

export interface PreviewController {
  enterPreview(epoch: number): boolean;
  leavePreview(): void;
  setPinned(pin: boolean): void;
  isPinned(): boolean;
  isActive(): boolean;
  getActiveEpoch(): number | null;
  getPreviewSnapshot(epoch: number): ForestSnapshot | null;
  dispose(): void;
}

export function createPreviewController(input: {
  getSnapshotAt(epoch: number): ForestSnapshot | null;
  getLatestShadow(): DomShadow | null;
  host?: () => HTMLElement | null;
  onStateChange?: (active: boolean, epoch: number | null) => void;
}): PreviewController {
  let activeEpoch: number | null = null;
  let pinned = false;
  let overlayElement: HTMLElement | null = null;
  let inputListener: ((event: Event) => void) | null = null;

  function ensureInputListener(): void {
    if (inputListener || typeof document === 'undefined') return;
    inputListener = () => {
      if (!pinned && activeEpoch !== null) {
        leavePreview();
      }
    };
    document.addEventListener('keydown', inputListener, true);
    document.addEventListener('pointerdown', inputListener, true);
  }

  function removeInputListener(): void {
    if (!inputListener || typeof document === 'undefined') return;
    document.removeEventListener('keydown', inputListener, true);
    document.removeEventListener('pointerdown', inputListener, true);
    inputListener = null;
  }

  function notify(): void {
    input.onStateChange?.(activeEpoch !== null, activeEpoch);
  }

  function leavePreview(): void {
    if (activeEpoch === null) return;
    overlayElement?.parentNode?.removeChild(overlayElement);
    overlayElement = null;
    activeEpoch = null;
    removeInputListener();
    notify();
  }

  return {
    enterPreview(epoch: number): boolean {
      const snapshot = input.getSnapshotAt(epoch);
      if (!snapshot) return false;
      if (activeEpoch === epoch) return true;
      if (activeEpoch !== null) leavePreview();
      const host = input.host?.() ?? (typeof document !== 'undefined' ? document.body : null);
      if (!host) return false;
      const overlay = typeof document !== 'undefined' ? document.createElement('div') : null;
      if (!overlay) return false;
      overlay.setAttribute('data-nop-preview-overlay', '');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '2147483000';
      overlay.style.pointerEvents = 'none';
      const banner = document.createElement('div');
      banner.setAttribute('data-nop-preview-banner', '');
      banner.textContent = `预览中 · epoch ${epoch}`;
      overlay.appendChild(banner);
      const shadowHost = document.createElement('div');
      overlay.appendChild(shadowHost);
      const targetShadow = input.getLatestShadow();
      if (targetShadow) {
        attachDomShadow(targetShadow, shadowHost);
      }
      host.appendChild(overlay);
      overlayElement = overlay;
      activeEpoch = epoch;
      ensureInputListener();
      notify();
      return true;
    },
    leavePreview,
    setPinned(pin: boolean): void {
      pinned = pin;
    },
    isPinned: () => pinned,
    isActive: () => activeEpoch !== null,
    getActiveEpoch: () => activeEpoch,
    getPreviewSnapshot(epoch: number) {
      return input.getSnapshotAt(epoch);
    },
    dispose(): void {
      leavePreview();
      pinned = false;
    },
  };
}
