import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { toast } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerMobileRenderers } from '@nop-chaos/flux-renderers-mobile';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

export const MOCK_PRODUCTS = [
  { id: '1', name: 'iPhone 15 Pro', price: '¥8,999', tag: '新品', img: 'https://picsum.photos/seed/p1/200/200' },
  { id: '2', name: 'MacBook Air M3', price: '¥12,999', tag: '', img: 'https://picsum.photos/seed/p2/200/200' },
  { id: '3', name: 'AirPods Pro 2', price: '¥1,899', tag: '热卖', img: 'https://picsum.photos/seed/p3/200/200' },
  { id: '4', name: 'iPad mini', price: '¥4,999', tag: '', img: 'https://picsum.photos/seed/p4/200/200' },
  { id: '5', name: 'Apple Watch Ultra', price: '¥6,299', tag: '新品', img: 'https://picsum.photos/seed/p5/200/200' },
  { id: '6', name: 'HomePod mini', price: '¥749', tag: '', img: 'https://picsum.photos/seed/p6/200/200' },
];

export const MOCK_CATEGORIES = [
  { name: '手机数码', icon: 'smartphone', count: 128 },
  { name: '电脑办公', icon: 'laptop', count: 86 },
  { name: '家用电器', icon: 'tv', count: 204 },
  { name: '服饰鞋包', icon: 'shirt', count: 312 },
  { name: '食品饮料', icon: 'coffee', count: 156 },
  { name: '美妆个护', icon: 'sparkles', count: 98 },
  { name: '运动户外', icon: 'dumbbell', count: 67 },
  { name: '图书文具', icon: 'book-open', count: 245 },
];

export const MOCK_CART = [
  { id: 'c1', name: 'iPhone 15 Pro', price: '¥8,999', qty: 1, img: 'https://picsum.photos/seed/c1/100/100' },
  { id: 'c2', name: 'AirPods Pro 2', price: '¥1,899', qty: 2, img: 'https://picsum.photos/seed/c2/100/100' },
  { id: 'c3', name: 'MagSafe 充电器', price: '¥399', qty: 1, img: 'https://picsum.photos/seed/c3/100/100' },
];

export const MOCK_PROFILE = {
  name: '张三',
  avatar: 'https://picsum.photos/seed/avatar/100/100',
  level: 'VIP 会员',
  points: 2880,
  orders: { pendingPayment: 3, pendingShipment: 1, pendingReceipt: 2, returnExchange: 0 },
};

export const MOCK_ORDERS = [
  { orderNo: '20240101', statusText: '已发货', statusClass: 'text-blue-500' },
  { orderNo: '20240102', statusText: '已完成', statusClass: 'text-green-500' },
  { orderNo: '20240103', statusText: '待付款', statusClass: 'text-orange-500' },
];

export const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerMobileRenderers(registry);
registerContentRenderers(registry);
registerLayoutRenderers(registry);

export const SchemaRenderer = createSchemaRenderer();
export const formulaCompiler = createFormulaCompiler();

export function createMockFetcher() {
  return async function fetcher<T>(request: { url: string; method?: string; data?: unknown }): Promise<{ ok: boolean; status: number; data: T }> {
    const url = request.url;
    if (url.includes('/api/products')) return { ok: true, status: 200, data: MOCK_PRODUCTS as T };
    if (url.includes('/api/categories')) return { ok: true, status: 200, data: MOCK_CATEGORIES as T };
    if (url.includes('/api/cart')) return { ok: true, status: 200, data: MOCK_CART as T };
    if (url.includes('/api/cart/add')) return { ok: true, status: 200, data: { success: true } as T };
    if (url.includes('/api/profile')) return { ok: true, status: 200, data: MOCK_PROFILE as T };
    if (url.includes('/api/orders')) return { ok: true, status: 200, data: MOCK_ORDERS as T };
    if (url.includes('/api/order/submit')) return { ok: true, status: 200, data: { orderNo: 'NEW-' + Date.now() } as T };
    return { ok: true, status: 200, data: null as T };
  };
}

export function createEnv(): RendererEnv {
  return {
    fetcher: createMockFetcher(),
    notify: (level, message) => {
      const text = typeof message === 'string' ? message : String(message ?? '');
      if (level === 'error') toast.error(text || 'Error');
      else if (level === 'success') toast.success(text || 'Success');
      else if (level === 'warning') toast.warning?.(text || 'Warning');
      else toast.info?.(text || 'Info');
    },
  };
}
