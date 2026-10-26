import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fieldSources } from './report-designer-demo-shared.js';

const DEMO_SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/report-designer-demo.tsx'), 'utf8');
const HOST_SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/report-designer-host-demo.tsx'), 'utf8');

const LOCAL_FIELD_SOURCES_MARKER = 'const fieldSources: FieldSourceSnapshot[] = [';

describe('report-designer fieldSources single source (WA-pages-009②)', () => {
  it('exposes one Orders field table; the generic demo references it and keeps no local copy', () => {
    // plan 753: host demo switched from the shared static table to the
    // nop-report profile assembly (provider-backed datasets) — the pin now
    // applies to the generic report-designer demo only.
    expect(DEMO_SOURCE).toContain("from './report-designer-demo-shared.js'");
    expect(HOST_SOURCE).toContain('createNopReportAdapters');
    expect(HOST_SOURCE).not.toContain("from './report-designer-demo-shared.js'");
    expect(DEMO_SOURCE).not.toContain(LOCAL_FIELD_SOURCES_MARKER);
    expect(HOST_SOURCE).not.toContain(LOCAL_FIELD_SOURCES_MARKER);
  });

  it('shared field table is the Orders dataset contract both panels render', () => {
    expect(fieldSources).toHaveLength(1);
    const [orders] = fieldSources;
    expect(orders.id).toBe('orders');
    expect(orders.label).toBe('Orders Dataset');
    expect(orders.groups).toHaveLength(1);
    expect(orders.groups[0].fields.map((field) => field.id)).toEqual([
      'orderId',
      'customer',
      'amount',
      'date',
    ]);
  });
});
