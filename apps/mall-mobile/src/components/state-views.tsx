import { Loader2, RefreshCw } from 'lucide-react';

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="mall-skeleton" data-testid="mall-skeleton" aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key -- static skeleton placeholders, never reordered
        <div key={i} className="mall-skeleton-line" />
      ))}
    </div>
  );
}

export function GoodsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mall-grid" data-testid="mall-grid-skeleton" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key -- static skeleton placeholders, never reordered
        <div key={i} className="mall-goods-card mall-goods-card-skeleton">
          <div className="mall-skeleton-block mall-goods-card-img" />
          <div className="mall-skeleton-line" />
          <div className="mall-skeleton-line" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="mall-empty" data-testid="mall-empty" role="status">
      <p>{message}</p>
    </div>
  );
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mall-error" data-testid="mall-error" role="alert">
      <p>{message}</p>
      <button
        type="button"
        className="mall-touch-target mall-error-retry"
        onClick={onRetry}
      >
        <RefreshCw size={16} />
        <span>重试</span>
      </button>
    </div>
  );
}

export function InlineLoading({ message = '加载中...' }: { message?: string }) {
  return (
    <span className="mall-inline-loading" role="status" aria-live="polite">
      <Loader2 size={16} className="animate-spin" />
      <span className="ml-1">{message}</span>
    </span>
  );
}
