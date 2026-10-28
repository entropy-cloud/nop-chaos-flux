import { useRef } from 'react';
import {
  LayoutGrid,
  Tag,
  Search,
  ShoppingCart,
  Sparkles,
  FileText,
  User,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useAsync } from '../../hooks/use-async';
import { usePagedList } from '../../hooks/use-paged-list';
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
import { GoodsCard } from '../../components/goods-card';
import { Skeleton, EmptyState, ErrorRetry } from '../../components/state-views';
import { InfiniteScroll } from '../../components/infinite-scroll';
import { SeckillCountdown } from '../../components/mall/seckill-countdown';
import { PriceText } from '../../components/mall/price-text';
import {
  goSearch,
  goCategoryTab,
  goBrandList,
  goTopicDetail,
  goGoodsDetail,
} from '../../page-nav';
import { hashNavigate } from '../../env-instance';

const SECKILL_PAGE_SIZE = 6;
const FEED_PAGE_SIZE = 6;

interface KingkongItem {
  key: string;
  label: string;
  tone: number;
  icon: React.ReactNode;
  action: () => void;
}

function seckillProgress(index: number): number {
  return 92 - ((index * 17) % 55);
}

function KingkongGrid() {
  const items: KingkongItem[] = [
    { key: 'category', label: '分类', tone: 1, icon: <LayoutGrid size={22} />, action: goCategoryTab },
    { key: 'brand', label: '品牌', tone: 2, icon: <Tag size={22} />, action: goBrandList },
    { key: 'search', label: '搜索', tone: 3, icon: <Search size={22} />, action: goSearch },
    { key: 'cart', label: '购物车', tone: 4, icon: <ShoppingCart size={22} />, action: () => hashNavigate('/tab/cart') },
    { key: 'seckill', label: '秒杀', tone: 5, icon: <Zap size={22} />, action: () => hashNavigate('/tab/home') },
    { key: 'new', label: '新品', tone: 6, icon: <Sparkles size={22} />, action: () => hashNavigate('/tab/home') },
    { key: 'topic', label: '专题', tone: 7, icon: <FileText size={22} />, action: () => hashNavigate('/tab/home') },
    { key: 'profile', label: '我的', tone: 8, icon: <User size={22} />, action: () => hashNavigate('/tab/profile') },
  ];
  return (
    <nav className="mallv2-kingkong" data-testid="mall-kingkong">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="mall-touch-target mallv2-kingkong-item"
          onClick={item.action}
        >
          <span className={`mallv2-kingkong-icon is-${item.tone}`}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionHeader({
  title,
  sub,
  moreText,
  onMore,
  children,
}: {
  title: string;
  sub?: string;
  moreText?: string;
  onMore?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mallv2-section-header">
      <span className="mallv2-section-title">{title}</span>
      {sub ? <span className="mallv2-section-sub">{sub}</span> : <span className="mallv2-section-sub" />}
      {children}
      {moreText && onMore ? (
        <button type="button" className="mall-touch-target mallv2-section-more" onClick={onMore}>
          {moreText}
          <ChevronRight size={14} />
        </button>
      ) : null}
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

function SeckillCard({ goods, index }: { goods: MallGoods; index: number }) {
  const pct = seckillProgress(index);
  return (
    <button
      type="button"
      className="mall-touch-target mallv2-seckill-card"
      data-testid="mall-seckill-card"
      onClick={() => goGoodsDetail(goods.id)}
    >
      {goods.picUrl ? (
        <img className="mallv2-seckill-img" src={goods.picUrl} alt={goods.name ?? ''} loading="lazy" />
      ) : (
        <span className="mallv2-seckill-img" />
      )}
      <span className="mallv2-seckill-name">{goods.name ?? ''}</span>
      <span className="mallv2-seckill-price">
        <PriceText value={goods.retailPrice} size="sm" showCounter={false} />
      </span>
      <span className="mallv2-seckill-bar">
        <span className="mallv2-seckill-bar-fill" style={{ width: `${pct}%` }} />
        <span>已抢 {pct}%</span>
      </span>
    </button>
  );
}

export function HomePage() {
  const pullRef = useRef<PullToRefreshHandle>(null);
  const seckillSectionRef = useRef<HTMLDivElement>(null);

  const banners = useAsync(() => fetchHomeBanners(1, 20));
  const seckillGoods = useAsync(() =>
    fetchGoodsByFlags({ isHot: true, page: 1, pageSize: SECKILL_PAGE_SIZE }),
  );
  const topics = useAsync(() => fetchTopicPage(1, 10));
  const feed = usePagedList(
    (page, pageSize) => fetchGoodsByFlags({ page, pageSize }),
    undefined,
    { pageSize: FEED_PAGE_SIZE },
  );

  const refreshAll = async () => {
    await Promise.all([banners.refetch(), seckillGoods.refetch(), topics.refetch(), feed.refresh()]);
  };

  const scrollToSeckill = () => {
    seckillSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mall-tab-page">
      <header className="mallv2-home-header">
        <div className="mallv2-home-brandbar">
          <span className="mallv2-home-brand">mall 优选</span>
          <span className="mallv2-home-notice">新人专享 · 天天领券 · 品牌特卖</span>
        </div>
        <button type="button" className="mall-touch-target mallv2-search-capsule" onClick={goSearch}>
          <Search size={16} />
          <span>搜索商品 / 品牌 / 专题</span>
        </button>
      </header>
      <PullToRefresh ref={pullRef} onRefresh={refreshAll}>
        <section className="mallv2-section" style={{ padding: 0, overflow: 'hidden' }}>
          <FloorState
            loading={banners.loading}
            error={banners.error}
            data={banners.data}
            onRetry={() => banners.refetch()}
            emptyText="暂无广告"
            skeletonLines={1}
          >
            {(ads: MallAd[]) => (ads.length > 0 ? <Banner ads={ads} /> : <EmptyState message="暂无广告" />)}
          </FloorState>
        </section>

        <KingkongGrid />

        <div ref={seckillSectionRef}>
          <section className="mallv2-section mallv2-seckill">
            <SectionHeader title="限时秒杀" moreText="更多" onMore={scrollToSeckill}>
              <SeckillCountdown />
            </SectionHeader>
            <FloorState
              loading={seckillGoods.loading}
              error={seckillGoods.error}
              data={seckillGoods.data}
              onRetry={() => seckillGoods.refetch()}
              emptyText="暂无秒杀商品"
            >
              {(page) => {
                const list = (page?.items ?? []) as MallGoods[];
                if (list.length === 0) return <EmptyState message="暂无秒杀商品" />;
                return (
                  <div className="mallv2-seckill-row">
                    {list.map((g, i) => (
                      <SeckillCard key={g.id} goods={g} index={i} />
                    ))}
                  </div>
                );
              }}
            </FloorState>
          </section>
        </div>

        <section className="mallv2-section">
          <SectionHeader title="专题精选" moreText="更多" onMore={goBrandList} />
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
                <div className="mallv2-hscroll">
                  {list.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="mall-touch-target mall-topic-card"
                      data-testid="mall-topic-card"
                      onClick={() => goTopicDetail(t.id)}
                    >
                      {t.picUrl ? <img src={t.picUrl} alt={t.title ?? ''} loading="lazy" /> : null}
                      <span className="mall-topic-card-title">{t.title ?? ''}</span>
                      {t.subtitle ? <span className="mall-topic-card-sub">{t.subtitle}</span> : null}
                    </button>
                  ))}
                </div>
              );
            }}
          </FloorState>
        </section>

        <section className="mallv2-section" style={{ paddingBottom: 4 }}>
          <SectionHeader title="猜你喜欢" sub="为你持续推荐好物" />
        </section>
        <FloorState
          loading={feed.loading && feed.items.length === 0}
          error={feed.error}
          data={feed.items.length > 0 ? feed.items : null}
          onRetry={() => feed.refresh()}
          emptyText="暂无推荐商品"
        >
          {(items: MallGoods[]) => (
            <>
              <div className="mallv2-waterfall">
                {items.map((g) => (
                  <GoodsCard key={g.id} goods={g} onClick={(x) => goGoodsDetail(x.id)} />
                ))}
              </div>
              <InfiniteScroll
                hasMore={feed.hasMore}
                loading={feed.loading}
                error={feed.error}
                onLoadMore={feed.loadMore}
              />
            </>
          )}
        </FloorState>
        <div style={{ height: 12 }} />
      </PullToRefresh>
    </div>
  );
}
