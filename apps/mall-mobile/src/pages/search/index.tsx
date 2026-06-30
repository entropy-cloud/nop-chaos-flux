import { useEffect, useMemo, useState } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { useAsync } from '../../hooks/use-async';
import { usePagedList } from '../../hooks/use-paged-list';
import { fetchHotKeywords, searchGoods } from '../../api/catalog-api';
import { InfiniteScroll } from '../../components/infinite-scroll';
import { GoodsGrid } from '../../components/goods-card';
import { Skeleton, EmptyState, ErrorRetry, GoodsGridSkeleton } from '../../components/state-views';
import { back } from '../../use-route';
import {
  loadSearchHistory,
  addSearchHistory,
  clearSearchHistory,
} from './search-history';
import { goGoodsDetail } from '../../page-nav';

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_PAGE_SIZE = 10;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface SearchPageProps {
  initialKeyword?: string;
}

export function SearchPage({ initialKeyword = '' }: SearchPageProps) {
  const [input, setInput] = useState(initialKeyword);
  const debouncedInput = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);
  const activeKeyword = debouncedInput.trim();
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory());
  const [recordedKeyword, setRecordedKeyword] = useState('');
  if (activeKeyword !== recordedKeyword) {
    setRecordedKeyword(activeKeyword);
    if (activeKeyword) {
      setHistory(addSearchHistory(activeKeyword));
    }
  }

  const hot = useAsync(() => fetchHotKeywords());

  const results = usePagedList(
    (page, pageSize) => searchGoods({ keyword: activeKeyword, page, pageSize }),
    activeKeyword,
    { pageSize: SEARCH_PAGE_SIZE },
  );

  const showResults = activeKeyword.length > 0;
  const placeholderList = useMemo(() => hot.data ?? [], [hot.data]);

  const submitKeyword = (kw: string) => {
    const trimmed = (kw ?? '').trim();
    if (!trimmed) return;
    setInput(trimmed);
  };

  return (
    <div className="mall-app-shell nop-theme-root">
      <header className="mall-navbar">
        <button type="button" className="mall-navbar-side" onClick={back} aria-label="返回">
          ←
        </button>
        <div className="mall-search-input-wrap">
          <Search size={16} />
          <input
            className="mall-touch-target mall-search-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="搜索商品"
            aria-label="搜索商品"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="search"
          />
          {input ? (
            <button
              type="button"
              className="mall-touch-target mall-search-clear"
              aria-label="清空"
              onClick={() => setInput('')}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </header>

      <main className="mall-app-main mall-search-main">
        {showResults ? (
          <div className="mall-page">
            {results.loading && results.items.length === 0 ? (
              <GoodsGridSkeleton />
            ) : results.error && results.items.length === 0 ? (
              <ErrorRetry message={results.error} onRetry={() => results.refresh()} />
            ) : results.items.length === 0 && !results.loading ? (
              <EmptyState message={`没有找到“${activeKeyword}”相关的商品`} />
            ) : (
              <InfiniteScroll
                hasMore={results.hasMore}
                loading={results.loading}
                error={results.error}
                onLoadMore={() => results.loadMore()}
              >
                <GoodsGrid items={results.items} onItemClick={(g) => goGoodsDetail(g.id)} />
              </InfiniteScroll>
            )}
          </div>
        ) : (
          <div className="mall-page">
            <section className="mall-section">
              <div className="mall-floor-header">
                <Clock size={16} />
                <span className="mall-floor-title">搜索历史</span>
                {history.length > 0 ? (
                  <button
                    type="button"
                    className="mall-touch-target mall-history-clear"
                    onClick={() => setHistory(clearSearchHistory())}
                  >
                    清空
                  </button>
                ) : null}
              </div>
              {history.length === 0 ? (
                <EmptyState message="暂无搜索历史" />
              ) : (
                <div className="mall-tags">
                  {history.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      className="mall-touch-target mall-tag"
                      onClick={() => submitKeyword(kw)}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="mall-section">
              <div className="mall-floor-header">
                <span className="mall-floor-title">热门搜索</span>
              </div>
              {hot.loading ? (
                <Skeleton lines={2} />
              ) : hot.error ? (
                <ErrorRetry message={hot.error} onRetry={() => hot.refetch()} />
              ) : placeholderList.length === 0 ? (
                <EmptyState message="暂无热门关键词" />
              ) : (
                <div className="mall-tags">
                  {placeholderList.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      className="mall-touch-target mall-tag mall-tag-hot"
                      onClick={() => submitKeyword(k.keyword ?? '')}
                    >
                      {k.keyword ?? ''}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
