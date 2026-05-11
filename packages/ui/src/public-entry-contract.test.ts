import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as ui from './index.js';
import * as chart from './components/ui/chart.js';
import { cn as directCn } from './lib/utils.js';

const packageJson = JSON.parse(
  readFileSync('package.json', 'utf8'),
) as {
  exports: Record<string, unknown>;
};

describe('@nop-chaos/ui public entry contract', () => {
  it('keeps root entry exports aligned with representative public components', () => {
    expect(ui.Button).toBeTypeOf('function');
    expect(ui.NativeSelect).toBeTypeOf('function');
    expect(ui.Sidebar).toBeTypeOf('function');
    expect(ui.toast).toBeTypeOf('function');
    expect(ui.cn).toBe(directCn);
  });

  it('keeps declared package exports aligned with public subpaths', () => {
    expect(packageJson.exports['.']).toMatchObject({
      types: './dist/index.d.ts',
      default: './dist/index.js',
    });
    expect(packageJson.exports['./chart']).toMatchObject({
      types: './dist/components/ui/chart.d.ts',
      default: './dist/components/ui/chart.js',
    });
    expect(packageJson.exports['./lib/utils']).toMatchObject({
      types: './dist/lib/utils.d.ts',
      default: './dist/lib/utils.js',
    });
    expect(packageJson.exports['./base.css']).toBe('./dist/styles/base.css');
    expect(packageJson.exports['./styles.css']).toBe('./dist/styles/index.css');
    expect(chart.ChartContainer).toBeTypeOf('function');
  });
});
