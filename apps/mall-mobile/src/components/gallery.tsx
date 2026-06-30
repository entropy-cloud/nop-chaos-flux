import { useRef, useState } from 'react';

export interface GalleryProps {
  images: string[];
  fallback?: string;
  alt?: string;
}

const SWIPE_THRESHOLD = 40;

export function Gallery({ images, fallback, alt = '' }: GalleryProps) {
  const slides = images.length > 0 ? images : fallback ? [fallback] : [];
  const [index, setIndex] = useState(0);
  const startRef = useRef<{ x: number; y: number; horizontal: boolean } | null>(null);

  const len = slides.length;
  const current = len === 0 ? 0 : ((index % len) + len) % len;

  if (len === 0) {
    return (
      <div className="mall-gallery" data-testid="mall-gallery">
        <div className="mall-gallery-fallback">无图</div>
      </div>
    );
  }

  const go = (next: number) => {
    setIndex((((next % len) + len) % len));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, horizontal: false };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const start = startRef.current;
    if (!start || start.horizontal) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      start.horizontal = true;
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = startRef.current;
    startRef.current = null;
    if (!start || !start.horizontal) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      go(dx < 0 ? current + 1 : current - 1);
    }
  };

  return (
    <div
      className="mall-gallery"
      data-testid="mall-gallery"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="mall-gallery-track"
        data-testid="mall-gallery-track"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((src, i) => (
          <div className="mall-gallery-slide" key={src} data-slide-index={i}>
            <img src={src} alt={`${alt} ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>
      {len > 1 ? (
        <>
          <div className="mall-gallery-dots">
            {slides.map((src, i) => (
              <button
                type="button"
                key={src}
                className={`mall-gallery-dot${i === current ? ' is-active' : ''}`}
                aria-label={`第 ${i + 1} 张`}
                aria-current={i === current ? 'true' : 'false'}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <div className="mall-gallery-index" data-testid="mall-gallery-index">
            {current + 1}/{len}
          </div>
        </>
      ) : null}
    </div>
  );
}
