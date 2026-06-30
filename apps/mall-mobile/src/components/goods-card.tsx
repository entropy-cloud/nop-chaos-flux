import type { MallGoods } from '../api/catalog-api';

export interface GoodsCardProps {
  goods: MallGoods;
  onClick?: (goods: MallGoods) => void;
}

function formatPrice(value: number | string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return null;
  return n.toFixed(2);
}

export function GoodsCard({ goods, onClick }: GoodsCardProps) {
  const retail = formatPrice(goods.retailPrice);
  const counter = formatPrice(goods.counterPrice);
  const hasCounterDiscount =
    counter !== null && retail !== null && parseFloat(counter) > parseFloat(retail);

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
      </div>
      <div className="mall-goods-card-name">{goods.name ?? ''}</div>
      <div className="mall-goods-card-price">
        {retail !== null ? (
          <>
            <span className="mall-price-retail">¥{retail}</span>
            {hasCounterDiscount ? (
              <span className="mall-price-counter">¥{counter}</span>
            ) : null}
          </>
        ) : (
          <span className="mall-price-retail">—</span>
        )}
      </div>
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
