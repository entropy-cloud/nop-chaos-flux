import { useEffect, useState } from 'react';
import { Heart, Star } from 'lucide-react';
import { useAsync } from '../../hooks/use-async';
import {
  fetchGoodsDetail,
  fetchStockSemantic,
  splitGallery,
  type MallGoodsDetail,
  type StockSemantic,
} from '../../api/catalog-api';
import { fetchProductsByGoods, type MallGoodsProduct } from '../../api/product-api';
import { fetchCommentSummary, type CommentSummary } from '../../api/comment-api';
import { PageShell } from '../../components/page-shell';
import { Gallery } from '../../components/gallery';
import { SkuDrawer } from '../../components/sku-drawer';
import { Skeleton, ErrorRetry, EmptyState } from '../../components/state-views';
import {
  isProductAvailable,
  buildSkuMatrix,
} from './sku-matrix';
import { useGoodsActions } from './use-goods-actions';

export interface GoodsDetailPageProps {
  goodsId: string;
}

export function GoodsDetailPage({ goodsId }: GoodsDetailPageProps) {
  const detail = useAsync(() => fetchGoodsDetail(goodsId), goodsId);
  const products = useAsync(() => fetchProductsByGoods(goodsId), goodsId);
  const semantic = useAsync(() => fetchStockSemantic(goodsId), goodsId);
  const comments = useAsync(() => fetchCommentSummary(goodsId), goodsId);

  const actions = useGoodsActions(goodsId);

  const [skuOpen, setSkuOpen] = useState(false);
  const [buyMode, setBuyMode] = useState<'cart' | 'buy'>('cart');

  const recordFootprint = actions.recordFootprint;
  useEffect(() => {
    recordFootprint();
  }, [recordFootprint]);

  const goods = detail.data;

  const openSku = (mode: 'cart' | 'buy') => {
    setBuyMode(mode);
    setSkuOpen(true);
  };

  const onSkuConfirm = (product: MallGoodsProduct, number: number) => {
    if (buyMode === 'cart') {
      actions.addToCart(product, number, () => setSkuOpen(false));
    } else {
      actions.buyNow(product, number, () => setSkuOpen(false));
    }
  };

  return (
    <PageShell title={goods?.name ?? '商品详情'}>
      {detail.loading ? (
        <Skeleton lines={5} />
      ) : detail.error ? (
        <ErrorRetry message={detail.error} onRetry={() => detail.refetch()} />
      ) : !goods ? (
        <EmptyState message="商品不存在或已下架" />
      ) : (
        <DetailBody
          goods={goods}
          products={products}
          semantic={semantic}
          comments={comments}
          collected={actions.collected}
          onCollect={actions.toggleCollect}
          onOpenSku={openSku}
        />
      )}

      <SkuDrawer
        open={skuOpen}
        onClose={() => setSkuOpen(false)}
        products={products.data ?? []}
        goodsSpecs={goods?.specifications}
        goodsName={goods?.name}
        picUrl={goods?.picUrl}
        onConfirm={onSkuConfirm}
        confirmLabel={buyMode === 'cart' ? '加入购物车' : '立即购买'}
        requireLogin={actions.requireLoginForSku}
      />
    </PageShell>
  );
}

interface DetailBodyProps {
  goods: MallGoodsDetail;
  products: ReturnType<typeof useAsync<MallGoodsProduct[]>>;
  semantic: ReturnType<typeof useAsync<StockSemantic>>;
  comments: ReturnType<typeof useAsync<CommentSummary>>;
  collected: boolean;
  onCollect: () => void;
  onOpenSku: (mode: 'cart' | 'buy') => void;
}

function DetailBody({
  goods,
  products,
  semantic,
  comments,
  collected,
  onCollect,
  onOpenSku,
}: DetailBodyProps) {
  const gallery = splitGallery(goods.gallery);
  const retail = formatPrice(goods.retailPrice);
  const counter = formatPrice(goods.counterPrice);
  const hasCounterDiscount =
    retail !== null && counter !== null && parseFloat(counter) > parseFloat(retail);
  const stockLevel = semantic.data?.level;
  const allOutOfStock =
    stockLevel === 'out' ||
    (products.data && products.data.length > 0
      ? products.data.every((p) => !isProductAvailable(p))
      : false);
  const matrix = buildSkuMatrix(products.data ?? [], goods.specifications);
  const selectedHint =
    matrix.axes.length === 0
      ? '请选择数量'
      : allOutOfStock
        ? '已售罄'
        : '请选择规格';

  const summary = comments.data;
  const totalCount = summary?.totalCount ?? 0;
  const goodRate = summary?.goodRate ?? 0;
  const starDist = summary?.starDistribution ?? {};

  return (
    <>
      <Gallery images={gallery} fallback={goods.picUrl} alt={goods.name ?? ''} />

      <section className="mall-section mall-goods-info">
        <div className="mall-goods-price">
          {retail !== null ? (
            <span className="mall-price-retail mall-price-retail-lg">¥{retail}</span>
          ) : null}
          {hasCounterDiscount ? (
            <span className="mall-price-counter">¥{counter}</span>
          ) : null}
        </div>
        <h1 className="mall-goods-name" data-testid="goods-name">
          {goods.name ?? ''}
        </h1>
        {goods.brief ? <p className="mall-goods-brief">{goods.brief}</p> : null}
        {semantic.data ? (
          <div
            className="mall-goods-stock"
            data-testid="goods-stock"
            style={{ color: semantic.data.color || undefined }}
          >
            {semantic.data.label ?? ''}
          </div>
        ) : null}
      </section>

      <button
        type="button"
        className="mall-touch-target mall-goods-sku-trigger"
        data-testid="goods-sku-trigger"
        onClick={() => onOpenSku('cart')}
      >
        <span className="mall-goods-sku-text">已选</span>
        <span className="mall-goods-sku-value">{selectedHint}</span>
        <span className="mall-goods-sku-arrow">›</span>
      </button>

      <section className="mall-section mall-goods-comment-summary" data-testid="goods-comment-summary">
        <div className="mall-floor-header">
          <span className="mall-floor-title">评价摘要</span>
        </div>
        {comments.loading ? (
          <Skeleton lines={2} />
        ) : comments.error ? (
          <div className="mall-goods-comment-error">评价摘要加载失败</div>
        ) : totalCount === 0 ? (
          <div className="mall-goods-comment-empty">暂无评价</div>
        ) : (
          <div className="mall-goods-comment-grid">
            <div className="mall-goods-comment-rate">
              <span className="mall-goods-comment-rate-num">{goodRate}%</span>
              <span className="mall-goods-comment-rate-label">好评率</span>
            </div>
            <div className="mall-goods-comment-meta">
              <div className="mall-goods-comment-total">
                共 <b>{totalCount}</b> 条评价
              </div>
              <div className="mall-goods-comment-stars" data-testid="goods-comment-stars">
                {[5, 4, 3, 2, 1].map((s) => (
                  <div className="mall-goods-comment-star-row" key={s}>
                    <Star size={12} className="mall-goods-comment-star-icon" />
                    <span>{s}</span>
                    <span className="mall-goods-comment-star-count">{starDist[String(s) as '1'] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="mall-section mall-goods-detail-content" data-testid="goods-detail-content">
        <div className="mall-floor-header">
          <span className="mall-floor-title">商品详情</span>
        </div>
        {goods.detail ? (
          <div
            className="mall-goods-detail-html"
            // detail is backend-controlled rich text (admin html-64k field); rendered as-is.
            dangerouslySetInnerHTML={{ __html: goods.detail }}
          />
        ) : (
          <div className="mall-goods-detail-empty">暂无详情</div>
        )}
      </section>

      <footer className="mall-goods-action-bar" data-testid="goods-action-bar">
        <button
          type="button"
          className="mall-touch-target mall-goods-action-icon"
          onClick={onCollect}
          aria-label={collected ? '取消收藏' : '收藏'}
          data-testid="goods-collect"
        >
          <Heart
            size={22}
            fill={collected ? 'var(--color-danger, #ff4d4f)' : 'none'}
            color={collected ? 'var(--color-danger, #ff4d4f)' : 'currentColor'}
          />
          <span>{collected ? '已收藏' : '收藏'}</span>
        </button>
        <button
          type="button"
          className="mall-touch-target mall-goods-action-btn mall-goods-action-cart"
          onClick={() => onOpenSku('cart')}
          disabled={allOutOfStock}
          data-testid="goods-add-cart"
        >
          加入购物车
        </button>
        <button
          type="button"
          className="mall-touch-target mall-goods-action-btn mall-btn-primary"
          onClick={() => onOpenSku('buy')}
          disabled={allOutOfStock}
          data-testid="goods-buy-now"
        >
          立即购买
        </button>
      </footer>
    </>
  );
}

function formatPrice(value: number | string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return null;
  return n.toFixed(2);
}
