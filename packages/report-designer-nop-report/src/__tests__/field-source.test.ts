import { describe, expect, it, vi } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerProfile,
} from '@nop-chaos/report-designer-core';
import {
  createNopReportDatasetProvider,
  NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
  type NopReportDataset,
} from '../index.js';

const datasets: NopReportDataset[] = [
  {
    id: 'orders',
    label: 'Orders',
    fields: [
      { path: 'orderId', label: 'Order ID', valueType: 'string' },
      { path: 'amount', label: 'Amount', valueType: 'number' },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    fields: [{ path: 'name', label: 'Name' }],
  },
];

describe('createNopReportDatasetProvider', () => {
  it('maps datasets to field source snapshots with dataset/path meta', async () => {
    const provider = createNopReportDatasetProvider({ datasets });
    expect(provider.id).toBe(NOP_REPORT_FIELD_SOURCE_PROVIDER_ID);

    const snapshots = await provider.load({} as never);
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({
      id: `${NOP_REPORT_FIELD_SOURCE_PROVIDER_ID}:orders`,
      label: 'Orders',
      provider: NOP_REPORT_FIELD_SOURCE_PROVIDER_ID,
    });
    expect(snapshots[0].groups[0].fields[0]).toMatchObject({
      id: 'orders.orderId',
      label: 'Order ID',
      path: 'orderId',
      fieldType: 'string',
      meta: { dataset: 'orders', path: 'orderId', valueType: 'string' },
    });
  });

  it('supports a dataset factory and rejects when the factory throws', async () => {
    const factory = vi.fn(() => datasets);
    const provider = createNopReportDatasetProvider({ datasets: factory });
    await expect(provider.load({} as never)).resolves.toHaveLength(2);
    expect(factory).toHaveBeenCalled();

    const failing = createNopReportDatasetProvider({
      datasets: () => {
        throw new Error('dataset backend down');
      },
    });
    await expect(failing.load({} as never)).rejects.toThrowError('dataset backend down');
  });

  it('returns [] on already-aborted signals without touching the factory', async () => {
    const factory = vi.fn(() => datasets);
    const provider = createNopReportDatasetProvider({ datasets: factory });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.load({} as never, { signal: controller.signal })).resolves.toEqual([]);
    expect(factory).not.toHaveBeenCalled();
  });

  it('integrates with the loadFieldSources consumption chain', async () => {
    // report-designer-core 消费链：config.fieldSources[].provider 命中 + profile.fieldSourceIds 选中
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(createEmptyDocument(), 'Demo'),
      config: {
        kind: 'nop-report',
        fieldSources: [{ id: 'ds', label: 'Datasets', provider: NOP_REPORT_FIELD_SOURCE_PROVIDER_ID } as never],
      },
      profile: {
        id: 'p',
        kind: 'nop-report',
        fieldSourceIds: ['ds'],
        fieldDropIds: [],
      } satisfies ReportDesignerProfile,
      adapters: {
        fieldSources: new Map([[NOP_REPORT_FIELD_SOURCE_PROVIDER_ID, createNopReportDatasetProvider({ datasets })]]),
      },
    });

    await core.refreshFieldSources();
    const snapshots = core.getSnapshot().fieldSources;
    expect(snapshots.some((s) => s.id === `${NOP_REPORT_FIELD_SOURCE_PROVIDER_ID}:orders`)).toBe(true);
  });
});
