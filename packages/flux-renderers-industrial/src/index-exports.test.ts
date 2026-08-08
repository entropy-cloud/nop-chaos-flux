import { describe, it, expect, vi } from 'vitest';
import * as publicSurface from './index.js';

// index.ts 引入链含 registerScadaSymbols → base-shapes → leafer-ui + @leafer-in/viewport；
// happy-dom 无 canvas 上下文，mock 后保证包入口在纯 JS 环境可加载。
vi.mock('leafer-ui', () => import('./test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));

describe('package public surface — serialization + definitions export parity (P2-1 / P2-3)', () => {
  // plan 2026-08-08-1931-2 Phase 3：包入口导出与「host 校验/审计」注释承诺一致。
  // P2-1：serialize/parse/validate/diff + ScadaValidationResult 同步导出；
  // P2-3：industrialRendererDefinitions 与兄弟 flux-renderers-* 包注册模式对齐导出。
  it('exports the 5 serialization symbols (serialize/parse/validate/diff + type alias)', () => {
    expect(publicSurface.serializeScadaConfig).toBeTypeOf('function');
    expect(publicSurface.parseScadaConfig).toBeTypeOf('function');
    expect(publicSurface.validateScadaConfig).toBeTypeOf('function');
    expect(publicSurface.diffScadaConfig).toBeTypeOf('function');
  });

  it('exports industrialRendererDefinitions (host 自定义注册用)', () => {
    expect(Array.isArray(publicSurface.industrialRendererDefinitions)).toBe(true);
    expect(publicSurface.industrialRendererDefinitions.length).toBeGreaterThan(0);
  });

  it('parseScadaConfig + validateScadaConfig are usable together for host-side entry validation', () => {
    // 契约联通：host 经包入口 parse → validate 做入口校验（无需绕 relative path）。
    const config = publicSurface.parseScadaConfig(
      JSON.stringify({ version: 1, variables: [], symbols: [] }),
    );
    const result = publicSurface.validateScadaConfig(config);
    expect(result.ok).toBe(true);
  });
});
