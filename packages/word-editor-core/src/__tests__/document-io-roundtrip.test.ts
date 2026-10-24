import { describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  installDocumentIoTestHooks,
  localStorageState,
} from './document-io-test-utils.js';
import {
  SaveDocumentError,
  loadDocument,
  saveDocument,
  setRecoveryLoadErrorHandler,
} from '../document-io.js';

// P1-MA4.4-006 regression guard: the save/recovery chain end-to-end. The
// five boundaries each had one-side mocks (save produced payloads no loader
// consumed; load parsed hand-written JSON) and the two named failure
// classes (storage-unavailable / bridge-read-failed, design.md:204) had zero
// coverage — a regression in the render-time loadRecoveredState path would
// crash SSR pages with the whole suite green (audit Round D / D-01 + Round
// J / J-01).

// registers per-test localStorage stub + handler reset (top-level by design)
installDocumentIoTestHooks();

function realBridge() {
  return {
    getValue: vi.fn(() => ({
      data: {
        header: [{ value: 'header-text' }],
        main: [
          { value: 'paragraph-1' },
          {
            url: 'xpl:<nop:chart id="chart_1" name="Revenue" type="bar" dataset="ds" category="month" valueField="value" showTitle="true" />',
          },
          {
            url: 'xpl:<nop:code id="code_1" name="QR" type="qrcode" dataset="ds" valueField="id" />',
          },
        ],
        footer: [{ value: 'footer-text' }],
      },
    })),
    getPaperSettings: vi.fn(() => ({
      width: 595,
      height: 842,
      direction: 'vertical',
      margins: [100, 120, 100, 120],
    })),
  } as any;
}

describe('word save/recovery chain round-trip (P1-MA4.4-006)', () => {
  it('A: saveDocument -> loadDocument round-trips the full document equivalently', () => {
    const saved = saveDocument(realBridge());

    const loaded = loadDocument();
    expect(loaded).not.toBeNull();
    expect(loaded!.data.main).toEqual(saved.data.main);
    expect(loaded!.data.header).toEqual(saved.data.header);
    expect(loaded!.data.footer).toEqual(saved.data.footer);
    expect(loaded!.data.charts).toEqual(saved.data.charts);
    expect(loaded!.data.codes).toEqual(saved.data.codes);
    expect(loaded!.paperSettings).toEqual(saved.paperSettings);
    expect(loaded!.savedAt).toBe(saved.savedAt);
  });

  it('A2: a corrupted persisted payload is rejected (null) with json-parse-failed reported', () => {
    localStorageState.current.setItem(STORAGE_KEY, '{not-valid-json');
    const handler = vi.fn();
    setRecoveryLoadErrorHandler(handler);

    expect(loadDocument()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ target: 'document', reason: 'json-parse-failed' });
  });

  it('B: storage-unavailable fails the save with SaveDocumentError and the load with a reported recovery error', () => {
    const handler = vi.fn();
    setRecoveryLoadErrorHandler(handler);

    // override the harness stub: make localStorage disappear entirely
    vi.stubGlobal('localStorage', undefined);

    expect(() => saveDocument(realBridge())).toThrowError(SaveDocumentError);
    try {
      saveDocument(realBridge());
    } catch (error) {
      expect((error as SaveDocumentError).reason).toBe('storage-unavailable');
    }

    expect(loadDocument()).toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ target: 'document', reason: 'storage-unavailable' });
  });

  it('C: bridge-read-failed surfaces as SaveDocumentError with the dedicated reason', () => {
    const brokenBridge = {
      getValue: vi.fn(() => {
        throw new Error('canvas exploded');
      }),
      getPaperSettings: vi.fn(() => null),
    } as any;

    expect(() => saveDocument(brokenBridge)).toThrowError(SaveDocumentError);
    try {
      saveDocument(brokenBridge);
    } catch (error) {
      expect((error as SaveDocumentError).reason).toBe('bridge-read-failed');
    }
  });
});
