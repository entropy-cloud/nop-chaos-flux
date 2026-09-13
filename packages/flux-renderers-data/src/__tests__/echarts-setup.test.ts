import { describe, expect, it } from 'vitest';
import { getECharts } from '../echarts-setup.js';

// 真实加载 echarts-setup（其余单测均 mock 本模块）：证明 echarts/core 导入、
// 22 类 chart + 组件的 use(...) 注册、registerTheme('flux') 在测试环境可执行，
// 并覆盖 registerMap 经 GeoComponent 的真实分发链（mocked 单测绕过该链路）。
describe('echarts-setup (real echarts/core registration)', () => {
  it('exposes init/dispose/registerMap after module registration', () => {
    const api = getECharts();
    expect(typeof api.init).toBe('function');
    expect(typeof api.dispose).toBe('function');
    expect(typeof api.registerMap).toBe('function');
  });

  it('registers a map through the real GeoComponent distribution chain', () => {
    expect(() =>
      getECharts().registerMap('echarts-setup-isolation-geo', {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'probe' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
            },
          },
        ],
      }),
    ).not.toThrow();
  });
});
