import { useMemo, useState } from 'react';
import { useAsync } from '../../hooks/use-async';
import { usePagedList } from '../../hooks/use-paged-list';
import {
  fetchCategoryTree,
  fetchGoodsPage,
} from '../../api/catalog-api';
import { SearchBar } from '../../components/search-bar';
import { GoodsGrid } from '../../components/goods-card';
import { InfiniteScroll } from '../../components/infinite-scroll';
import { Skeleton, EmptyState, ErrorRetry, GoodsGridSkeleton } from '../../components/state-views';
import { goSearch, goGoodsDetail } from '../../page-nav';

const CATEGORY_PAGE_SIZE = 10;

export function CategoryPage() {
  const tree = useAsync(() => fetchCategoryTree());
  const [selectedTopId, setSelectedTopId] = useState<string | null>(null);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const activeTopId = selectedTopId ?? nodes[0]?.id ?? null;

  const activeTop = nodes.find((n) => n.id === activeTopId) ?? null;
  const children = activeTop?.children ?? [];
  const goodsCategoryId = activeSubId ?? activeTopId ?? '';

  const list = usePagedList(
    (_page, pageSize) => fetchGoodsPage({ categoryId: goodsCategoryId, page: _page, pageSize }),
    goodsCategoryId,
    { pageSize: CATEGORY_PAGE_SIZE },
  );

  const selectTop = (id: string) => {
    if (id === activeTopId) return;
    setSelectedTopId(id);
    setActiveSubId(null);
  };

  return (
    <div className="mall-tab-page mall-category-page">
      <header className="mall-category-header">
        <SearchBar onClick={goSearch} />
      </header>
      <div className="mall-category-body">
        <aside className="mall-category-rail" data-testid="mall-category-rail">
          {tree.loading ? (
            <Skeleton lines={8} />
          ) : tree.error ? (
            <ErrorRetry message={tree.error} onRetry={() => tree.refetch()} />
          ) : nodes.length === 0 ? (
            <EmptyState message="暂无分类" />
          ) : (
            nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`mall-touch-target mall-category-rail-item${n.id === activeTopId ? ' is-active' : ''}`}
                onClick={() => selectTop(n.id)}
              >
                {n.name ?? ''}
              </button>
            ))
          )}
        </aside>

        <section className="mall-category-content" data-testid="mall-category-content">
          {children.length > 0 ? (
            <div className="mall-category-pills">
              <button
                type="button"
                className={`mall-touch-target mall-category-pill${activeSubId === null ? ' is-active' : ''}`}
                onClick={() => setActiveSubId(null)}
              >
                全部
              </button>
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`mall-touch-target mall-category-pill${c.id === activeSubId ? ' is-active' : ''}`}
                  onClick={() => setActiveSubId(c.id)}
                >
                  {c.name ?? ''}
                </button>
              ))}
            </div>
          ) : null}

          {list.loading && list.items.length === 0 ? (
            <GoodsGridSkeleton />
          ) : list.error && list.items.length === 0 ? (
            <ErrorRetry message={list.error} onRetry={() => list.refresh()} />
          ) : list.items.length === 0 && !list.loading ? (
            <EmptyState message="该分类暂无商品" />
          ) : (
            <InfiniteScroll
              hasMore={list.hasMore}
              loading={list.loading}
              error={list.error}
              onLoadMore={() => list.loadMore()}
            >
              <GoodsGrid items={list.items} onItemClick={(g) => goGoodsDetail(g.id)} />
            </InfiniteScroll>
          )}
        </section>
      </div>
    </div>
  );
}
