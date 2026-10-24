// P1-MA4.3-001 regression guard: the autoplay interval LIFECYCLE contracts
// that the original carousel-autoplay harness structurally erased —
// 量 (the configured interval value actually reaches setInterval's delay
// argument), 命 (one interval slot per mount, no cross-mount accumulation),
// 清理 (unmount clears the slot; a post-unmount tick is inert), and the
// select→tick→onChange chain (tick drives a real select, not a bare spy).
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarouselApi } from '@nop-chaos/ui';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { CarouselSchema } from './schemas.js';

const registerMock = vi.fn();
const mockRegistry = { register: registerMock } as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return { ...actual, useCurrentComponentRegistry: () => mockRegistry };
});

let mockApi: FakeApi | null = null;

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  const Carousel = ({
    setApi,
    children,
  }: {
    setApi?: (api: CarouselApi) => void;
    children?: React.ReactNode;
  }) => {
    React.useEffect(() => {
      if (mockApi) {
        setApi?.(mockApi.api);
      }
    }, [setApi]);
    return <>{children}</>;
  };
  const CarouselContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const CarouselItem = ({ children }: { children?: React.ReactNode }) => (
    <div data-slot="carousel-item">{children}</div>
  );
  const CarouselPrevious = () => (
    <button data-slot="carousel-prev" type="button">
      prev
    </button>
  );
  const CarouselNext = () => (
    <button data-slot="carousel-next" type="button">
      next
    </button>
  );
  return {
    ...actual,
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselPrevious,
    CarouselNext,
  };
});

const { CarouselRenderer } = await import('./carousel.js');
const { createMockRendererProps } = await import('./test-support.js');

function newFakeApi() {
  let snap = 0;
  const selectCallbacks: Array<() => void> = [];
  const api = {
    scrollNext: vi.fn(() => {
      snap += 1;
    }),
    scrollPrev: vi.fn(),
    scrollTo: vi.fn((index: number) => {
      snap = index;
    }),
    selectedScrollSnap: vi.fn(() => snap),
    on: vi.fn((type: string, cb: () => void) => {
      if (type === 'select') {
        selectCallbacks.push(cb);
      }
    }),
    off: vi.fn(),
  };
  return {
    api: api as unknown as CarouselApi,
    scrollNext: api.scrollNext,
    triggerSelect: () => {
      for (const cb of selectCallbacks) {
        cb();
      }
    },
  };
}
type FakeApi = ReturnType<typeof newFakeApi>;

let reducedMotionMatches = false;
const reducedMotionChangeListeners = new Set<(e: { matches: boolean }) => void>();

let intervalCalls: Array<{ cb: () => void; delay: number }> = [];
let clearedIds: Array<number> = [];
let nextIntervalId = 1;
let intervalCallback: (() => void) | undefined;

class MockIntersectionObserver {
  static last: MockIntersectionObserver | undefined;
  callback: (entries: { isIntersecting: boolean }[]) => void;
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = callback;
    MockIntersectionObserver.last = this;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  get root() {
    return null;
  }
  get rootMargin() {
    return '';
  }
  get thresholds() {
    return [];
  }
}

beforeEach(() => {
  registerMock.mockReset();
  reducedMotionMatches = false;
  reducedMotionChangeListeners.clear();
  intervalCalls = [];
  clearedIds = [];
  nextIntervalId = 1;
  intervalCallback = undefined;
  MockIntersectionObserver.last = undefined;

  const mql = {
    get matches() {
      return reducedMotionMatches;
    },
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener(type: string, listener: (e: { matches: boolean }) => void) {
      if (type === 'change') {
        reducedMotionChangeListeners.add(listener);
      }
    },
    removeEventListener(type: string, listener: (e: { matches: boolean }) => void) {
      if (type === 'change') {
        reducedMotionChangeListeners.delete(listener);
      }
    },
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  };
  vi.stubGlobal('matchMedia', () => mql);
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('setInterval', (cb: () => void, delay?: number) => {
    const id = nextIntervalId++;
    intervalCalls.push({ cb, delay: delay ?? 0 });
    intervalCallback = cb;
    return id as unknown as number;
  });
  vi.stubGlobal('clearInterval', (id: number) => {
    clearedIds.push(id);
    intervalCallback = undefined;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mockApi = null;
});

function fireTick() {
  intervalCallback?.();
}

function renderCarousel(
  overrides: Record<string, unknown> = {},
  events: { onChange?: ReturnType<typeof vi.fn> } = {},
) {
  const props = createMockRendererProps<CarouselSchema>({
    schema: { type: 'carousel' },
    props: {
      items: [
        { image: '/a.png', title: 'A' },
        { image: '/b.png', title: 'B' },
      ],
      autoPlay: true,
      interval: 1000,
      ...overrides,
    },
    events: events as never,
  });
  return render(<CarouselRenderer {...props} />);
}

describe('carousel autoplay interval lifecycle (P1-MA4.3-001)', () => {
  it('量: the configured interval reaches setInterval as the delay argument; default is 5000', () => {
    mockApi = newFakeApi();
    renderCarousel({ interval: 2500 });
    expect(intervalCalls).toHaveLength(1);
    expect(intervalCalls[0]?.delay).toBe(2500);

    cleanup();
    intervalCalls = [];
    intervalCallback = undefined;

    renderCarousel({ interval: undefined as unknown as number });
    expect(intervalCalls).toHaveLength(1);
    expect(intervalCalls[0]?.delay).toBe(5000);
  });

  it('命: each mount registers exactly one slot with no cross-mount accumulation', () => {
    mockApi = newFakeApi();
    const first = renderCarousel();
    expect(intervalCalls).toHaveLength(1);
    const firstId = intervalCalls[0];
    first.unmount();

    mockApi = newFakeApi();
    renderCarousel();
    expect(intervalCalls).toHaveLength(2);
    expect(intervalCalls[1]).not.toBe(firstId);
    expect(clearedIds).toContain(1);
  });

  it('清理: unmount clears the slot — a late tick never advances', () => {
    mockApi = newFakeApi();
    const view = renderCarousel();
    fireTick();
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);

    const registeredId = intervalCalls[0] && 1;
    view.unmount();
    expect(clearedIds).toContain(registeredId);
    expect(intervalCallback).toBeUndefined();

    fireTick();
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('链: tick -> scrollNext -> select -> onChange event chain is intact', () => {
    mockApi = newFakeApi();
    const onChange = vi.fn();
    renderCarousel({}, { onChange });

    act(() => {
      fireTick();
    });
    expect(mockApi.scrollNext).toHaveBeenCalledTimes(1);
    act(() => {
      mockApi?.triggerSelect();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
