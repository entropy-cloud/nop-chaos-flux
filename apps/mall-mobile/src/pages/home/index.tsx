import { useRef } from 'react';
import { LayoutGrid, Tag, Sparkles, Flame } from 'lucide-react';
import type { RefObject } from 'react';
import { useAsync } from '../../hooks/use-async';
import {
  fetchHomeBanners,
  fetchGoodsByFlags,
  fetchTopicPage,
  type MallAd,
  type MallGoods,
  type MallTopic,
} from '../../api/catalog-api';
import { PullToRefresh, type PullToRefreshHandle } from '../../components/pull-to-refresh';
import { Banner } from '../../components/banner';
import { SearchBar } from '../../components/search-bar';
import { GoodsCard } from '../../components/goods-card';
import { Skeleton, EmptyState, ErrorRetry } from '../../components/state-views';
import {
  goSearch,
  goCategoryTab,
  goBrandList,
  goTopicDetail,
  goGoodsDetail,
} from '../../page-nav';

const FLOOR_PAGE_SIZE = 6;

function FloorHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="mall-floor-header">
      <span className="mall-floor-icon">{icon}</span>
      <span className="mall-floor-title">{title}</span>
    </div>
  );
}

function FloorState<T>({
  loading,
  error,
  data,
  onRetry,
  emptyText,
  skeletonLines,
  children,
}: {
  loading: boolean;
  error: string | null;
  data: T | null;
  onRetry: () => void;
  emptyText: string;
  skeletonLines?: number;
  children: (data: T) => React.ReactNode;
}) {
  if (loading) return <Skeleton lines={skeletonLines ?? 2} />;
  if (error) return <ErrorRetry message={error} onRetry={onRetry} />;
  if (!data || (Array.isArray(data) && data.length === 0)) return <EmptyState message={emptyText} />;
  return <>{children(data)}</>;
}

export function HomePage() {
  const pullRef = useRef<PullToRefreshHandle>(null);
  const newSectionRef = useRef<HTMLDivElement>(null);
  const hotSectionRef = useRef<HTMLDivElement>(null);

  const banners = useAsync(() => fetchHomeBanners(1, 20));
  const newGoods = useAsync(
    () => fetchGoodsByFlags({ isNew: true, page: 1, pageSize: FLOOR_PAGE_SIZE }),
  );
  const hotGoods = useAsync(
    () => fetchGoodsByFlags({ isHot: true, page: 1, pageSize: FLOOR_PAGE_SIZE }),
  );
  const topics = useAsync(() => fetchTopicPage(1, 10));

  const refreshAll = async () => {
    await Promise.all([
      banners.refetch(),
      newGoods.refetch(),
      hotGoods.refetch(),
      topics.refetch(),
    ]);
  };

  const scrollTo = (ref: RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mall-tab-page">
      <header className="mall-home-header">
        <SearchBar onClick={goSearch} />
      </header>
      <PullToRefresh ref={pullRef} onRefresh={refreshAll}>
        <section className="mall-section">
          <FloorState
            loading={banners.loading}
            error={banners.error}
            data={banners.data}
            onRetry={() => banners.refetch()}
            emptyText="暂无广告"
          >
            {(ads: MallAd[]) => <Banner ads={ads} />}
          </FloorState>
        </section>

        <section className="mall-section">
          <div className="mall-quick-grid">
            <button type="button" className="mall-touch-target mall-quick-item" onClick={goCategoryTab}>
              <LayoutGrid size={22} />
              <span>分类</span>
            </button>
            <button type="button" className="mall-touch-target mall-quick-item" onClick={goBrandList}>
              <Tag size={22} />
              <span>品牌</span>
            </button>
            <button
              type="button"
              className="mall-touch-target mall-quick-item"
              onClick={() => scrollTo(newSectionRef)}
            >
              <Sparkles size={22} />
              <span>新品</span>
            </button>
            <button
              type="button"
              className="mall-touch-target mall-quick-item"
              onClick={() => scrollTo(hotSectionRef)}
            >
              <Flame size={22} />
              <span>热销</span>
            </button>
          </div>
        </section>

        <section className="mall-section" ref={newSectionRef}>
          <FloorHeader title="新品推荐" icon={<Sparkles size={16} />} />
          <FloorState
            loading={newGoods.loading}
            error={newGoods.error}
            data={newGoods.data}
            onRetry={() => newGoods.refetch()}
            emptyText="暂无新品"
          >
            {(page) => {
              const items = (page?.items ?? []) as MallGoods[];
              if (items.length === 0) return <EmptyState message="暂无新品" />;
              return (
                <div className="mall-scroll-x">
                  {items.map((g) => (
                    <GoodsCard key={g.id} goods={g} onClick={(x) => goGoodsDetail(x.id)} />
                  ))}
                </div>
              );
            }}
          </FloorState>
        </section>

        <section className="mall-section" ref={hotSectionRef}>
          <FloorHeader title="热销好物" icon={<Flame size={16} />} />
          <FloorState
            loading={hotGoods.loading}
            error={hotGoods.error}
            data={hotGoods.data}
            onRetry={() => hotGoods.refetch()}
            emptyText="暂无热销"
          >
            {(page) => {
              const items = (page?.items ?? []) as MallGoods[];
              if (items.length === 0) return <EmptyState message="暂无热销" />;
              return (
                <div className="mall-scroll-x">
                  {items.map((g) => (
                    <GoodsCard key={g.id} goods={g} onClick={(x) => goGoodsDetail(x.id)} />
                  ))}
                </div>
              );
            }}
          </FloorState>
        </section>

        <section className="mall-section">
          <FloorHeader title="专题精选" icon={<Tag size={16} />} />
          <FloorState
            loading={topics.loading}
            error={topics.error}
            data={topics.data}
            onRetry={() => topics.refetch()}
            emptyText="暂无专题"
          >
            {(page) => {
              const list = (page?.items ?? []) as MallTopic[];
              if (list.length === 0) return <EmptyState message="暂无专题" />;
              return (
                <div className="mall-scroll-x">
                  {list.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="mall-touch-target mall-topic-card"
                      data-testid="mall-topic-card"
                      onClick={() => goTopicDetail(t.id)}
                    >
                      {t.picUrl ? <img src={t.picUrl} alt={t.title ?? ''} /> : null}
                      <span className="mall-topic-card-title">{t.title ?? ''}</span>
                      {t.subtitle ? <span className="mall-topic-card-sub">{t.subtitle}</span> : null}
                    </button>
                  ))}
                </div>
              );
            }}
          </FloorState>
        </section>
      </PullToRefresh>
    </div>
  );
}
