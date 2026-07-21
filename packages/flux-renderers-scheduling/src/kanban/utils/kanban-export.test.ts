import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boardDataToJson, boardDataFromJson, downloadBlob, exportBoardToPng } from './kanban-export.js';
import type { BoardData } from '../kanban.types.js';

const html2canvasMock = vi.hoisted(() => vi.fn());
vi.mock('html2canvas', () => ({
  default: html2canvasMock,
}));

const sampleBoard: BoardData = {
  root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
  col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1'], data: { title: 'To Do' }, meta: {} },
  card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1' }, meta: {} },
};

describe('boardDataToJson', () => {
  it('serializes BoardData to JSON string', () => {
    const json = boardDataToJson(sampleBoard);
    const parsed = JSON.parse(json);
    expect(parsed.root).toBeDefined();
    expect(parsed.col1).toBeDefined();
    expect(parsed.card1).toBeDefined();
  });

  it('produces pretty-printed JSON', () => {
    const json = boardDataToJson(sampleBoard);
    expect(json).toContain('\n  ');
  });
});

describe('boardDataFromJson', () => {
  it('deserializes valid JSON', () => {
    const json = JSON.stringify(sampleBoard);
    const result = boardDataFromJson(json);
    expect(result.root).toBeDefined();
    expect(result.root.type).toBe('root');
    expect(result.root.children).toEqual(['col1']);
    expect(result.card1.data.title).toBe('Task 1');
  });

  it('throws for JSON without root', () => {
    expect(() => boardDataFromJson('{"foo": "bar"}')).toThrow('Invalid BoardData snapshot');
  });

  it('throws for malformed JSON', () => {
    expect(() => boardDataFromJson('not json')).toThrow();
  });

  it('round-trips BoardData correctly', () => {
    const json = boardDataToJson(sampleBoard);
    const restored = boardDataFromJson(json);
    expect(restored).toEqual(sampleBoard);
  });

  it('round-trips complex BoardData with multiple columns and cards', () => {
    const complex: BoardData = {
      root: { id: 'root', type: 'root', children: ['col1', 'col2'], data: {}, meta: {} },
      col1: { id: 'col1', type: 'column', parentId: 'root', children: ['card1', 'card2'], data: { title: 'To Do' }, meta: { color: 'blue' } },
      col2: { id: 'col2', type: 'column', parentId: 'root', children: ['card3'], data: { title: 'Done' }, meta: {} },
      card1: { id: 'card1', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 1', priority: 'high' }, meta: {} },
      card2: { id: 'card2', type: 'card', parentId: 'col1', children: [], data: { title: 'Task 2', priority: 'low' }, meta: { assignee: 'alice' } },
      card3: { id: 'card3', type: 'card', parentId: 'col2', children: [], data: { title: 'Task 3' }, meta: {} },
    };
    const json = boardDataToJson(complex);
    const restored = boardDataFromJson(json);
    expect(restored).toEqual(complex);
    expect(restored.col2.data.title).toBe('Done');
    expect(restored.card1.data.priority).toBe('high');
  });
});

describe('downloadBlob', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a download link and click it', () => {
    const blobUrl = 'blob:test';
    URL.createObjectURL = vi.fn(() => blobUrl);
    URL.revokeObjectURL = vi.fn();

    let anchorEl: HTMLAnchorElement | null = null;
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        anchorEl = originalCreateElement(tag) as HTMLAnchorElement;
        return anchorEl;
      }
      return originalCreateElement(tag);
    });

    const blob = new Blob(['test'], { type: 'application/json' });
    downloadBlob(blob, 'board.json');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchorEl).not.toBeNull();
    expect(anchorEl!.download).toBe('board.json');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
  });
});

describe('exportBoardToPng', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export board to PNG blob', async () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'toBlob').mockImplementation((cb: BlobCallback) => {
      const blob = new Blob(['png-data'], { type: 'image/png' });
      cb(blob);
    });

    html2canvasMock.mockResolvedValue(canvas);

    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollWidth', { value: 200, writable: true });
    Object.defineProperty(el, 'scrollHeight', { value: 100, writable: true });

    const blob = await exportBoardToPng(el);
    expect(blob).toBeInstanceOf(Blob);
    expect(html2canvasMock).toHaveBeenCalledWith(el, expect.objectContaining({
      useCORS: true,
      scale: 2,
    }));
  });

  it('should throw when board is too large', async () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollWidth', { value: 5000 });
    Object.defineProperty(el, 'scrollHeight', { value: 5000 });

    await expect(exportBoardToPng(el)).rejects.toThrow('Board too large for PNG export');
  });

  it('should throw on abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollWidth', { value: 200 });
    Object.defineProperty(el, 'scrollHeight', { value: 100 });

    await expect(exportBoardToPng(el, controller.signal)).rejects.toThrow('Aborted');
  });
});
