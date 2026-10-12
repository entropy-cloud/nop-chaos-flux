import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';

afterEach(() => {
  resetFluxI18n();
  vi.restoreAllMocks();
});

/**
 * WA-pages-004 判别测试：demo 页模块加载不得翻转全局 i18n 语言。
 * 双通道断言——import 后语言恒为全局默认 zh-CN，且不触发 WA-i18n-001
 * 的二次带参 initFluxI18n warn（页面级语言需求未登记前不得走全局 init）。
 */
describe('ai-hitl-demo module load (WA-pages-004)', () => {
  it('keeps the global language at zh-CN and never re-inits i18n with options', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mod = await import('./ai-hitl-demo.js');

    expect(mod.AiHitlDemoPage).toBeTruthy();
    expect(getFluxI18n().language).toBe('zh-CN');
    const i18nWarns = warnSpy.mock.calls.filter((call) => String(call[0]).includes('flux-i18n'));
    expect(i18nWarns).toEqual([]);
  }, 30_000);
});
