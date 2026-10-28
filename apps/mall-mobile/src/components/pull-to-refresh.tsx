import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { Loader2 } from 'lucide-react';

export interface PullToRefreshHandle {
  refresh: () => Promise<void>;
}

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  pullingText?: string;
  releaseText?: string;
  refreshingText?: string;
  maxPull?: number;
  threshold?: number;
  ref?: Ref<PullToRefreshHandle>;
}

function scrollTop(): number {
  if (typeof document === 'undefined') return 0;
  return document.documentElement.scrollTop || document.body.scrollTop || window.scrollY || 0;
}

export function PullToRefresh({
  onRefresh,
  children,
  pullingText = '下拉刷新',
  releaseText = '释放立即刷新',
  refreshingText = '刷新中...',
  maxPull = 80,
  threshold = 56,
  ref,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const engagingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const doRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPullDistance(0);
    try {
      await onRefreshRef.current();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  useImperativeHandle(ref, () => ({ refresh: doRefresh }), [doRefresh]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    if (scrollTop() > 0) return;
    startYRef.current = e.touches[0]?.clientY ?? null;
    engagingRef.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current == null || refreshing) return;
    const currentY = e.touches[0]?.clientY ?? startYRef.current;
    const delta = currentY - startYRef.current;
    if (delta <= 0) {
      engagingRef.current = false;
      setPullDistance(0);
      return;
    }
    if (scrollTop() > 0) {
      startYRef.current = currentY;
      return;
    }
    engagingRef.current = true;
    setPullDistance(Math.min(delta * 0.5, maxPull));
  };

  const onTouchEnd = () => {
    if (engagingRef.current && pullDistance >= threshold) {
      void doRefresh();
    } else {
      setPullDistance(0);
    }
    startYRef.current = null;
    engagingRef.current = false;
  };

  const indicatorText = refreshing
    ? refreshingText
    : pullDistance >= threshold
      ? releaseText
      : pullingText;

  return (
    <div
      className="mall-pull-to-refresh"
      data-slot="pull-to-refresh"
      data-state={refreshing ? 'refreshing' : pullDistance >= threshold ? 'release' : pullDistance > 0 ? 'pulling' : 'idle'}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        className="mall-pull-to-refresh-indicator"
        data-testid="mall-pull-indicator"
        style={{ height: refreshing ? maxPull : pullDistance }}
      >
        <Loader2 size={16} className={refreshing ? 'animate-spin' : ''} />
        <span className="ml-1">{indicatorText}</span>
      </div>
      <div className="mall-pull-to-refresh-body">{children}</div>
    </div>
  );
}
