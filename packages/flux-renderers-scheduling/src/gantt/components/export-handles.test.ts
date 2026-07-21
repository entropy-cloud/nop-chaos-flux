import { describe, expect, it, vi } from 'vitest';
import type { GanttTask, GanttId } from '../gantt.types.js';

vi.mock('html2canvas', () => {
  const h2c = vi.fn(() => ({
    toBlob: (cb: (b: Blob | null) => void) => cb(new Blob()),
    toDataURL: () => 'data:image/png;base64,test',
    width: 100,
    height: 100,
  }));
  return { default: h2c };
});

vi.mock('jspdf', () => {
  function MockJSPDF() {
    return {
      internal: { pageSize: { getWidth: () => 297, getHeight: () => 210 } },
      addImage: vi.fn(),
      save: vi.fn(),
    };
  }
  return { default: MockJSPDF };
});

vi.mock('xlsx', () => {
  const writeFile = vi.fn();
  const book_new = vi.fn(() => ({}));
  const json_to_sheet = vi.fn(() => ({}));
  const book_append_sheet = vi.fn();
  return {
    utils: { book_new, json_to_sheet, book_append_sheet },
    writeFile,
  };
});

async function getModule() {
  return import('./export-handles.js');
}

function createMockTask(overrides: Partial<GanttTask> & { id: GanttId }): GanttTask {
  return {
    text: 'Task',
    start: '2026-01-01',
    end: '2026-01-10',
    $x: 0, $y: 0, $w: 100, $h: 20, $level: 0, $source: [], $target: [],
    ...overrides,
  };
}

function createTaskMap(tasks: GanttTask[]): Map<GanttId, GanttTask> {
  const map = new Map<GanttId, GanttTask>();
  for (const t of tasks) map.set(t.id, t);
  return map;
}

describe('exportToPng', () => {
  it('returns early when element is null', async () => {
    const { exportToPng } = await getModule();
    await expect(exportToPng(null)).resolves.toBeUndefined();
  });

  it('rejects with AbortError when signal is aborted', async () => {
    const { exportToPng } = await getModule();
    const el = document.createElement('div');
    const controller = new AbortController();
    controller.abort();
    await expect(exportToPng(el, { signal: controller.signal })).rejects.toThrow('Aborted');
  });
});

describe('exportToPdf', () => {
  it('returns early when element is null', async () => {
    const { exportToPdf } = await getModule();
    await expect(exportToPdf(null)).resolves.toBeUndefined();
  });

  it('rejects with AbortError when signal is aborted', async () => {
    const { exportToPdf } = await getModule();
    const el = document.createElement('div');
    const controller = new AbortController();
    controller.abort();
    await expect(exportToPdf(el, { signal: controller.signal })).rejects.toThrow('Aborted');
  });
});

describe('exportToExcel', () => {
  it('transforms task data without error', async () => {
    const { exportToExcel } = await getModule();
    const tasks = createTaskMap([
      createMockTask({ id: 't1', text: 'Alpha', start: '2026-01-01', end: '2026-01-05', duration: 5, progress: 50 }),
      createMockTask({ id: 't2', text: 'Beta', start: '2026-01-06', end: '2026-01-10', type: 'milestone' }),
    ]);
    await expect(exportToExcel(tasks)).resolves.toBeUndefined();
  });

  it('rejects with AbortError when signal is aborted', async () => {
    const { exportToExcel } = await getModule();
    const controller = new AbortController();
    controller.abort();
    const tasks = createTaskMap([createMockTask({ id: 't1' })]);
    await expect(exportToExcel(tasks, { signal: controller.signal })).rejects.toThrow('Aborted');
  });
});
