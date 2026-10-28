import { useAsync } from '../../hooks/use-async';
import { usePagedList } from '../../hooks/use-paged-list';
import { fetchBrandDetail } from '../../api/brand-api';
import { fetchGoodsPage } from '../../api/catalog-api';
import { PageShell } from '../../components/page-shell';
import { GoodsGrid } from '../../components/goods-card';
import { InfiniteScroll } from '../../components/infinite-scroll';
import { Skeleton, EmptyState, ErrorRetry, GoodsGridSkeleton } from '../../components/state-views';
import { goGoodsDetail } from '../../page-nav';

const BRAND_GOODS_PAGE_SIZE = 10;

export interface BrandDetailPageProps {
  brandId: string;
}

export function BrandDetailPage({ brandId }: BrandDetailPageProps) {
  const detail = useAsync(() => fetchBrandDetail(brandId), brandId);
  const goods = usePagedList(
    (page, pageSize) => fetchGoodsPage({ brandId, page, pageSize }),
    brandId,
    { pageSize: BRAND_GOODS_PAGE_SIZE },
  );

  const brand = detail.data;

  return (
    <PageShell title={brand?.name ?? '品牌详情'}>
      {detail.loading ? (
        <Skeleton lines={3} />
      ) : detail.error ? (
        <ErrorRetry message={detail.error} onRetry={() => detail.refetch()} />
      ) : !brand ? (
        <EmptyState message="品牌不存在" />
      ) : (
        <section className="mall-section mall-brand-detail-header">
          {brand.picUrl ? (
            <div className="mall-brand-detail-logo">
              <img src={brand.picUrl} alt={brand.name ?? ''} />
            </div>
          ) : null}
          <div className="mall-brand-detail-name">{brand.name ?? ''}</div>
          {brand.desc ? <div className="mall-brand-detail-desc">{brand.desc}</div> : null}
        </section>
      )}

      <section className="mall-section">
        <div className="mall-floor-header">
          <span className="mall-floor-title">品牌商品</span>
        </div>
        {goods.loading && goods.items.length === 0 ? (
          <GoodsGridSkeleton />
        ) : goods.error && goods.items.length === 0 ? (
          <ErrorRetry message={goods.error} onRetry={() => goods.refresh()} />
        ) : goods.items.length === 0 && !goods.loading ? (
          <EmptyState message="该品牌暂无商品" />
        ) : (
          <InfiniteScroll
            hasMore={goods.hasMore}
            loading={goods.loading}
            error={goods.error}
            onLoadMore={() => goods.loadMore()}
          >
            <GoodsGrid items={goods.items} onItemClick={(g) => goGoodsDetail(g.id)} />
          </InfiniteScroll>
        )}
      </section>
    </PageShell>
  );
}
