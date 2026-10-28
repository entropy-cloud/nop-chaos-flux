import { useEffect, useState } from 'react';
import type { MallAd } from '../api/catalog-api';

export interface BannerProps {
  ads: MallAd[];
  intervalMs?: number;
  onClick?: (ad: MallAd) => void;
}

export function Banner({ ads, intervalMs = 3000, onClick }: BannerProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % ads.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [ads.length, intervalMs]);

  if (ads.length === 0) return null;
  const safeActive = Math.min(active, ads.length - 1);
  const current = ads[safeActive];

  return (
    <div className="mall-banner" data-testid="mall-banner" data-count={ads.length}>
      <button
        type="button"
        className="mall-touch-target mall-banner-slide"
        onClick={() => onClick?.(current)}
      >
        {current.url ? (
          <img src={current.url} alt={current.name ?? ''} />
        ) : (
          <span className="mall-banner-fallback">{current.name ?? ''}</span>
        )}
      </button>
      {ads.length > 1 ? (
        <div className="mall-banner-dots" role="tablist">
          {ads.map((ad, i) => (
            <span
              key={ad.id ?? i}
              className={`mall-banner-dot${i === safeActive ? ' is-active' : ''}`}
              role="tab"
              aria-selected={i === safeActive}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
