import type { ApiFetcher } from '@nop-chaos/flux-core';

/* Dev-only in-memory backend mock (MALL_MOCK=1). Lets the app run without the
   Quarkus backend for UX walkthroughs. Never imported in production paths when
   the flag is off — the factory below short-circuits to undefined. */

interface MockRoute {
  match: (url: string) => boolean;
  respond: (body: unknown) => unknown;
}

function pic(seed: string): string {
  return `/mock-img/${seed}.svg`;
}

function page<T>(items: T[], total = items.length): { items: T[]; total: number } {
  return { items, total };
}

function goods(i: number, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: `g${100 + i}`,
    name: ['北欧简约陶瓷马克杯', '无线蓝牙降噪耳机', '多功能不锈钢厨具套装', '天然乳胶护颈枕头', '智能体脂秤家用', '纯棉简约四件套床品', '便携折叠小风扇', '全麦健康早餐麦片'][i % 8] + ` #${i + 1}`,
    brief: '限时直降 · 顺丰包邮 · 七天无理由',
    picUrl: pic(`g${i}`),
    retailPrice: ((i * 37) % 900) / 4 + 9.9,
    counterPrice: ((i * 37) % 900) / 4 + 39.9,
    isNew: i % 3 === 0,
    isHot: i % 2 === 0,
    ...over,
  };
}

const GOODS = Array.from({ length: 23 }, (_, i) => goods(i));

const ROUTES: MockRoute[] = [
  { match: (u) => u.includes('LitemallAd__listActiveAds'), respond: () => page([
    { id: 'a1', name: '大促', url: pic('ad1'), position: 1 },
    { id: 'a2', name: '新品', url: pic('ad2'), position: 1 },
    { id: 'a3', name: '品牌', url: pic('ad3'), position: 1 },
  ]) },
  {
    match: (u) => u.includes('LitemallGoods__frontListByFlags'),
    respond: (body) => {
      const b = body as { page?: number; pageSize?: number; isHot?: boolean; isNew?: boolean };
      const p = b.page ?? 1;
      const n = b.pageSize ?? 10;
      let list = GOODS;
      if (b.isHot) list = list.filter((g) => g.isHot);
      if (b.isNew) list = list.filter((g) => g.isNew);
      const start = (p - 1) * n;
      return page(list.slice(start, start + n), list.length);
    },
  },
  { match: (u) => u.includes('LitemallGoods__frontList'), respond: (body) => {
    const b = body as { page?: number; pageSize?: number };
    const p = b.page ?? 1;
    const n = b.pageSize ?? 10;
    return page(GOODS.slice((p - 1) * n, (p - 1) * n + n), GOODS.length);
  } },
  { match: (u) => u.includes('LitemallGoods__frontDetail'), respond: (body) => {
    const { id } = body as { id: string };
    const g = GOODS.find((x) => x.id === id) ?? GOODS[0];
    return { ...g, detail: '<p>优选好物，品质保障。</p><p>匠心工艺， detail 渲染。</p>', gallery: [pic('d1'), pic('d2'), pic('d3')].join(','), specifications: [{ id: 's1', specification: '颜色', value: '雾灰' }, { id: 's2', specification: '颜色', value: '米白' }, { id: 's3', specification: '尺码', value: '标准' }] };
  } },
  { match: (u) => u.includes('LitemallGoodsProduct__findList'), respond: () => [
    { id: 'p1', goodsId: 'g100', specifications: JSON.stringify(['雾灰', '标准']), price: 59.9, number: 88 },
    { id: 'p2', goodsId: 'g100', specifications: JSON.stringify(['米白', '标准']), price: 59.9, number: 0 },
    { id: 'p3', goodsId: 'g101', specifications: JSON.stringify(['雾灰', '标准']), price: 199, number: 66 },
    { id: 'p4', goodsId: 'g101', specifications: JSON.stringify(['米白', '标准']), price: 199, number: 8 },
  ] },
  { match: (u) => u.includes('LitemallGoods__getStockSemantic'), respond: () => ({ stockNumber: 88, level: 'sufficient', label: '库存充足' }) },
  { match: (u) => u.includes('LitemallComment__getCommentSummary'), respond: () => ({ totalCount: 126, goodRate: 96, starDistribution: { 5: 100, 4: 18, 3: 5, 2: 2, 1: 1 } }) },
  { match: (u) => u.includes('LitemallTopic__frontList'), respond: () => page([
    { id: 't1', title: '居家好物节', subtitle: '为生活加点舒适', picUrl: pic('t1') },
    { id: 't2', title: '数码新姿势', subtitle: '聪明人的装备库', picUrl: pic('t2') },
    { id: 't3', title: '厨房焕新季', subtitle: '一日三餐的仪式感', picUrl: pic('t3') },
  ]) },
  { match: (u) => u.includes('LitemallTopic__frontDetail'), respond: () => ({ id: 't1', title: '居家好物节', subtitle: '为生活加点舒适', content: '<p>专题内容</p>', picUrl: pic('t1') }) },
  { match: (u) => u.includes('LitemallCategory__'), respond: () => [
    { id: 'c1', name: '居家', picUrl: pic('c1'), children: [{ id: 'c11', name: '床品', picUrl: pic('c11') }, { id: 'c12', name: '收纳', picUrl: pic('c12') }] },
    { id: 'c2', name: '数码', picUrl: pic('c2'), children: [{ id: 'c21', name: '耳机', picUrl: pic('c21') }, { id: 'c22', name: '配件', picUrl: pic('c22') }] },
    { id: 'c3', name: '餐厨', picUrl: pic('c3'), children: [{ id: 'c31', name: '锅具', picUrl: pic('c31') }] },
    { id: 'c4', name: '服饰', picUrl: pic('c4'), children: [{ id: 'c41', name: '家居服', picUrl: pic('c41') }] },
  ] },
  { match: (u) => u.includes('LitemallBrand__frontList'), respond: () => page([
    { id: 'b1', name: '北岸家居', picUrl: pic('brand1'), desc: '简约生活提案' },
    { id: 'b2', name: '声浪科技', picUrl: pic('brand2'), desc: '听见细节' },
    { id: 'b3', name: '食研所', picUrl: pic('brand3'), desc: '好吃不将就' },
  ]) },
  { match: (u) => u.includes('LitemallBrand__frontDetail'), respond: () => ({ id: 'b1', name: '北岸家居', picUrl: pic('brand1'), desc: '简约生活提案' }) },
  { match: (u) => u.includes('LitemallKeyword__getHotKeywords'), respond: () => [{ id: 'k1', keyword: '马克杯' }, { id: 'k2', keyword: '降噪耳机' }, { id: 'k3', keyword: '乳胶枕' }] },
  { match: (u) => u.includes('LitemallKeyword__getDefaultKeywords'), respond: () => [{ id: 'k4', keyword: '新品' }] },
  { match: (u) => u.includes('LitemallGoods__search'), respond: (body) => {
    const b = body as { keyword?: string; page?: number; pageSize?: number };
    const list = GOODS.filter((g) => !b.keyword || String(g.name).includes(b.keyword) || b.keyword === '');
    const p = b.page ?? 1;
    const n = b.pageSize ?? 10;
    return page(list.slice((p - 1) * n, (p - 1) * n + n), list.length);
  } },
  { match: (u) => u.includes('LitemallCart__findPage'), respond: () => page([
    { id: 'cart1', goodsId: 'g100', goodsName: GOODS[0].name, picUrl: GOODS[0].picUrl, price: 59.9, number: 2, checked: true, specifications: '雾灰 标准' },
    { id: 'cart2', goodsId: 'g101', goodsName: GOODS[1].name, picUrl: GOODS[1].picUrl, price: 199, number: 1, checked: false, specifications: '黑色' },
  ]) },
  { match: (u) => u.includes('LitemallCart__'), respond: () => ({}) },
  { match: (u) => u.includes('LitemallCollect__isCollect'), respond: () => false },
  { match: (u) => u.includes('LitemallCollect__'), respond: () => ({}) },
  { match: (u) => u.includes('LitemallFootprint__'), respond: () => ({}) },
  { match: (u) => u.includes('LoginApi__login'), respond: () => ({ accessToken: 'mock-token', refreshToken: 'mock-refresh', userInfo: { userId: '1', userName: 'demo', nickName: '演示用户' } }) },
];

export function createMockFetcher(): ApiFetcher {
  return async (api) => {
    const body = typeof api.data === 'string' ? JSON.parse(api.data as string) : api.data;
    const route = ROUTES.find((r) => r.match(api.url));
    if (!route) {
      console.warn(`[mall-mock] no route for ${api.url}`);
      return { status: 0, data: null };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { status: 0, data: route.respond(body) } as never;
  };
}

export function mockFetcherIfEnabled(): ApiFetcher | undefined {
  return import.meta.env.VITE_MALL_MOCK === '1' ? createMockFetcher() : undefined;
}
