import { describe, expect, it, vi } from 'vitest';

vi.mock('leafer-ui', () => ({
  Rect: class {},
  Ellipse: class {},
  Line: class {},
  Group: class {},
  Text: class {},
  Image: class {},
}));

/**
 * P4.4 module-load smoke（closure audit Blocker 修正验证）：host-demo 在模块作用域构建
 * registry（recipe 扩展含 definition entry）——load 即全路径把关，防 "register is not a
 * function" 类回归（该页 lazy route 无单测覆盖，e2e 之外唯一把关口）。
 */
describe('report-designer-host-demo module load (P4.4)', () => {
  it('evaluates module scope (registry build) without throwing', async () => {
    const mod = await import('./report-designer-host-demo.js');
    expect(mod.ReportDesignerHostDemo).toBeTruthy();
  });
});
