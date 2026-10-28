import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TopicDetailPage } from './detail';
import { PriceText } from '../../components/mall/price-text';
import { TagBadge } from '../../components/mall/tag-badge';
import { SeckillCountdown } from '../../components/mall/seckill-countdown';
import { GoodsCard } from '../../components/goods-card';
import { installFetchMock, envelope } from '../../test-support';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TopicDetailPage', () => {
  it('loads topic detail by id and renders title/subtitle/content', async () => {
    installFetchMock((url) => {
      if (url === '/r/LitemallTopic__frontDetail')
        return {
          status: 200,
          body: envelope({ id: 't1', title: '居家好物节', subtitle: '为生活加点舒适', content: '<p>正文</p>' }),
        };
      return { status: 200, body: envelope(null) };
    });
    const { container } = render(<TopicDetailPage topicId="t1" />);
    await waitFor(() => expect(screen.getAllByText('居家好物节').length).toBeGreaterThan(0));
    expect(container.textContent).toContain('正文');
    expect(screen.getAllByText('为生活加点舒适').length).toBeGreaterThan(0);
  });

  it('shows error retry when the detail request fails', async () => {
    installFetchMock(() => ({ status: 200, body: envelope(null, 1001, '服务器错误') }));
    render(<TopicDetailPage topicId="t1" />);
    await waitFor(() => expect(document.querySelector('[data-testid="mall-error"]')).toBeTruthy());
  });
});

describe('v2 design components', () => {
  it('PriceText renders big price with small symbol and strikethrough counter price', () => {
    render(<PriceText value={19.9} counterPrice={49.9} />);
    const price = document.querySelector('[data-testid="mall-price"]') as HTMLElement;
    expect(price.textContent).toBe('¥19.90');
    const row = price.closest('.mallv2-goods-price-row') as HTMLElement;
    expect(row.querySelector('.mallv2-price-counter')?.textContent).toBe('¥49.90');
  });

  it('PriceText hides counter price when not discounted', () => {
    render(<PriceText value={10} counterPrice={5} showCounter />);
    expect(document.querySelector('.mallv2-price-counter')).toBeNull();
  });

  it('TagBadge applies tone class', () => {
    render(<TagBadge tone="gold">新品</TagBadge>);
    expect(screen.getByText('新品').className).toContain('is-gold');
  });

  it('SeckillCountdown renders tabular tick cells', () => {
    vi.useFakeTimers();
    render(<SeckillCountdown />);
    const timer = document.querySelector('[data-testid="mall-seckill-timer"]') as HTMLElement;
    expect(timer.querySelectorAll('.mallv2-seckill-tick').length).toBe(3);
    vi.useRealTimers();
  });

  it('GoodsCard v2 shows tags, two-line name and price row', () => {
    const goods = {
      id: 'g1',
      name: '好物',
      brief: '限时直降',
      picUrl: 'http://x/1.png',
      retailPrice: 9.9,
      counterPrice: 19.9,
      isNew: true,
      isHot: true,
    };
    render(<GoodsCard goods={goods} />);
    const card = document.querySelector('[data-testid="mall-goods-card"]') as HTMLElement;
    expect(card.querySelectorAll('.mallv2-tag').length).toBe(2);
    expect(card.querySelector('.mallv2-goods-name')?.textContent).toBe('好物');
    expect(card.querySelector('[data-testid="mall-price"]')?.textContent).toBe('¥9.90');
  });
});
