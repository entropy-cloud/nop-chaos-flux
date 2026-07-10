/**
 * Injectable scope data for JSON-based complex pages.
 * Only pages that need static data injected into the render scope
 * have entries here. Most pages (pure data-source driven) need none.
 */

export const PAGE_DATA: Record<string, Record<string, unknown>> = {};

// ── Dynamic Tabs: remote tab items loaded via DynamicRenderer ──
PAGE_DATA['dynamic-tabs'] = {
  remoteTabItems: [
    { id: 1, name: '数据项 A', value: 100 },
    { id: 2, name: '数据项 B', value: 200 },
    { id: 3, name: '数据项 C', value: 300 },
  ],
};

// ── Complex Form: province / city cascading data ──
const PROVINCE_OPTIONS = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广东', value: 'guangdong' },
  { label: '浙江', value: 'zhejiang' },
  { label: '江苏', value: 'jiangsu' },
];

const CITY_MAP: Record<string, Array<{ label: string; value: string }>> = {
  beijing: [
    { label: '朝阳区', value: 'chaoyang' },
    { label: '海淀区', value: 'haidian' },
    { label: '东城区', value: 'dongcheng' },
  ],
  shanghai: [
    { label: '浦东新区', value: 'pudong' },
    { label: '徐汇区', value: 'xuhui' },
    { label: '黄浦区', value: 'huangpu' },
  ],
  guangdong: [
    { label: '广州市', value: 'guangzhou' },
    { label: '深圳市', value: 'shenzhen' },
    { label: '东莞市', value: 'dongguan' },
  ],
  zhejiang: [
    { label: '杭州市', value: 'hangzhou' },
    { label: '宁波市', value: 'ningbo' },
    { label: '温州市', value: 'wenzhou' },
  ],
  jiangsu: [
    { label: '南京市', value: 'nanjing' },
    { label: '苏州市', value: 'suzhou' },
    { label: '无锡市', value: 'wuxi' },
  ],
};

PAGE_DATA['complex-form'] = {
  provinceOptions: PROVINCE_OPTIONS,
  cityMap: CITY_MAP,
};
