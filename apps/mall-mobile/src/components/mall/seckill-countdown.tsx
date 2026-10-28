import { useEffect, useState } from 'react';

function nextSeckillBoundary(now: number): number {
  const period = 2 * 60 * 60 * 1000;
  return Math.ceil((now + 1) / period) * period;
}

function format(ms: number): { hh: string; mm: string; ss: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(total / 3600)).padStart(2, '0');
  const mm = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return { hh, mm, ss };
}

/** Seckill session countdown — ticks to the next 2-hour session boundary. */
export function SeckillCountdown() {
  const [deadline, setDeadline] = useState(() => nextSeckillBoundary(Date.now()));
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const left = deadline - Date.now();
      if (left <= 0) {
        const next = nextSeckillBoundary(Date.now());
        setDeadline(next);
        setRemaining(next - Date.now());
        return;
      }
      setRemaining(left);
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const { hh, mm, ss } = format(remaining);
  return (
    <span className="mallv2-seckill-timer" data-testid="mall-seckill-timer">
      <span className="mallv2-seckill-tick">{hh}</span>
      <span>:</span>
      <span className="mallv2-seckill-tick">{mm}</span>
      <span>:</span>
      <span className="mallv2-seckill-tick">{ss}</span>
    </span>
  );
}
