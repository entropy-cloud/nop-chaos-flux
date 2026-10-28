import type { ReactNode } from 'react';
import type { MallGoods } from '../api/catalog-api';
import { PriceText } from './mall/price-text';
import { TagBadge } from './mall/tag-badge';

export interface GoodsCardProps {
  goods: MallGoods;
  onClick?: (goods: MallGoods) => void;
  showBrief?: boolean;
}

export function GoodsCard({ goods, onClick, showBrief = true }: GoodsCardProps) {
  const tags: Array<{ key: string; node: ReactNode }> = [];
  if (goods.isNew) tags.push({ key: 'new', node: <TagBadge tone="gold">新品</TagBadge> });
  if (goods.isHot) tags.push({ key: 'hot', node: <TagBadge tone="promo">热卖</TagBadge> });

  return (
    <button
      type="button"
      className="mall-touch-target mall-goods-card"
      data-testid="mall-goods-card"
      onClick={() => onClick?.(goods)}
    >
      <div className="mall-goods-card-img">
        {goods.picUrl ? (
          <img src={goods.picUrl} alt={goods.name ?? ''} loading="lazy" />
        ) : (
          <span className="mall-goods-card-noimg">无图</span>
        )}
        {tags.length > 0 ? (
          <span className="mallv2-goods-tags">
            {tags.map((t) => (
              <span key={t.key}>{t.node}</span>
            ))}
          </span>
        ) : null}
      </div>
      <div className="mallv2-goods-name">{goods.name ?? ''}</div>
      {showBrief && goods.brief ? <div className="mallv2-goods-brief">{goods.brief}</div> : null}
      <PriceText value={goods.retailPrice} counterPrice={goods.counterPrice} />
    </button>
  );
}

export function GoodsGrid({ items, onItemClick }: {
  items: MallGoods[];
  onItemClick?: (goods: MallGoods) => void;
}) {
  return (
    <div className="mall-grid">
      {items.map((g) => (
        <GoodsCard key={g.id} goods={g} onClick={onItemClick} />
      ))}
    </div>
  );
}
