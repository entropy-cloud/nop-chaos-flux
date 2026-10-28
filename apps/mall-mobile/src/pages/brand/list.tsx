import { usePagedList } from '../../hooks/use-paged-list';
import { fetchBrandPage, type MallBrand } from '../../api/brand-api';
import { PageShell } from '../../components/page-shell';
import { InfiniteScroll } from '../../components/infinite-scroll';
import { Skeleton, EmptyState, ErrorRetry } from '../../components/state-views';
import { goBrandDetail } from '../../page-nav';

const BRAND_PAGE_SIZE = 10;

export function BrandListPage() {
  const brands = usePagedList((_p, ps) => fetchBrandPage(_p, ps), undefined, {
    pageSize: BRAND_PAGE_SIZE,
  });

  return (
    <PageShell title="品牌馆">
      {brands.loading && brands.items.length === 0 ? (
        <Skeleton lines={5} />
      ) : brands.error && brands.items.length === 0 ? (
        <ErrorRetry message={brands.error} onRetry={() => brands.refresh()} />
      ) : brands.items.length === 0 && !brands.loading ? (
        <EmptyState message="暂无品牌" />
      ) : (
        <InfiniteScroll
          hasMore={brands.hasMore}
          loading={brands.loading}
          error={brands.error}
          onLoadMore={() => brands.loadMore()}
        >
          <div className="mall-brand-list">
            {brands.items.map((b: MallBrand) => (
              <button
                key={b.id}
                type="button"
                className="mall-touch-target mall-brand-card"
                data-testid="mall-brand-card"
                onClick={() => goBrandDetail(b.id)}
              >
                <div className="mall-brand-card-logo">
                  {b.picUrl ? <img src={b.picUrl} alt={b.name ?? ''} loading="lazy" /> : null}
                </div>
                <div className="mall-brand-card-info">
                  <div className="mall-brand-card-name">{b.name ?? ''}</div>
                  {b.desc ? <div className="mall-brand-card-desc">{b.desc}</div> : null}
                </div>
              </button>
            ))}
          </div>
        </InfiniteScroll>
      )}
    </PageShell>
  );
}
