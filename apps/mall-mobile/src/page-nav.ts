import { hashNavigate } from './env-instance';

export function goSearch(): void {
  hashNavigate('/page/search');
}

export function goGoodsDetail(id: string): void {
  hashNavigate(`/page/goods-detail?id=${encodeURIComponent(id)}`);
}

export function goBrandList(): void {
  hashNavigate('/page/brand-list');
}

export function goBrandDetail(id: string): void {
  hashNavigate(`/page/brand-detail?id=${encodeURIComponent(id)}`);
}

export function goTopicDetail(id: string): void {
  hashNavigate(`/page/topic-detail?id=${encodeURIComponent(id)}`);
}

export function goCategoryTab(): void {
  hashNavigate('/tab/category');
}
