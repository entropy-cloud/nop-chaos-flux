//
// Focused behavioral regression tests for the carousel auto-advance effect:
// - F1: layered pause sources (hover / focus / offscreen) — resuming one source
//   must not clobber another (the prior single shared `paused` flag did).
// - F2: reactive prefers-reduced-motion — a mid-session toggle stops/restarts the
//   interval immediately, instead of being read once at mount.
//
// The real embla `CarouselApi` cannot be driven by happy-dom, so `@nop-chaos/ui`
// is mocked to inject a fake api whose `scrollNext` is a spy. `setInterval` /
// `matchMedia` / `IntersectionObserver` are stubbed so the interval tick, the
// reduced-motion preference, and the offscreen state are all under test control.

import { act, cleanup, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CarouselApi } from '@nop-chaos/ui';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import type { CarouselSchema } from './schemas.js';

// ── Module-level mocks ──────────────────────────────────────────────────────

const registerMock = vi.fn();
const mockRegistry = { register: registerMock } as unknown as ComponentHandleRegistry;

vi.mock('@nop-chaos/flux-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/flux-react')>();
  return { ...actual, useCurrentComponentRegistry: () => mockRegistry };
});

// `mockApi` is read lazily inside the mocked Carousel's effect (at render time,
// long after module init), so a module-level `let` is safe here. The `mock`
// prefix keeps it allowed inside the hoisted `vi.mock` factory.
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

// ── Controllable reduced-motion / observer / interval stubs ─────────────────

function newFakeApi() {
  let snap = 0;
  const selectCallbacks: Array<() => void> = [];
  const api = {
    scrollNext: vi.fn(),
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
    setSnap: (index: number) => {
      snap = index;
    },
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

function setReducedMotion(matches: boolean) {
  reducedMotionMatches = matches;
  for (const cb of reducedMotionChangeListeners) {
    cb({ matches });
  }
}

let intervalCallback: (() => void) | undefined;

class MockIntersectionObserver {
  static last: MockIntersectionObserver | undefined;
  callback: (entries: { isIntersecting: boolean }[]) => void;
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    this.callback = callback;
    MockIntersectionObserver.last = this;
  }
  observe() {
    /* no-op */
  }
  unobserve() {
    /* no-op */
  }
  disconnect() {
    /* no-op */
  }
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
    addListener() {
      /* no-op */
    },
    removeListener() {
      /* no-op */
    },
    dispatchEvent() {
      return false;
    },
  };
  vi.stubGlobal('matchMedia', () => mql);
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('setInterval', (cb: () => void) => {
    intervalCallback = cb;
    return 0 as unknown as number;
  });
  vi.stubGlobal('clearInterval', () => {
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

function triggerVisibility(isIntersecting: boolean) {
  MockIntersectionObserver.last?.callback([{ isIntersecting }]);
}

function renderCarousel(overrides: Partial<CarouselSchema> = {}) {
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
  });
  const view = render(<CarouselRenderer {...props} />);
  const container = view.container.querySelector('[data-slot="carousel"]') as HTMLElement;
  return { view, container };
}

describe('CarouselRenderer auto-advance — F1 layered pause sources', () => {
  it('advances when visible and not hovered/focused', () => {
    const fake = newFakeApi();
    mockApi = fake;
    renderCarousel();
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);
  });

  it('pause is derived: hover, focus, and offscreen each independently pause the tick', () => {
    const fake = newFakeApi();
    mockApi = fake;
    const { container } = renderCarousel();

    // Baseline: visible & not hovered → advances.
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Hover pauses.
    fireEvent.mouseEnter(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Leaving hover resumes (still visible, not focused).
    fireEvent.mouseLeave(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(2);

    // Focus pauses.
    fireEvent.focusIn(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(2);

    // Leaving focus resumes.
    fireEvent.focusOut(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(3);

    // Offscreen pauses.
    triggerVisibility(false);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(3);

    // Back in viewport resumes.
    triggerVisibility(true);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(4);
  });

  it('F1 interleaving: mouseleave while offscreen does NOT resume auto-advance', () => {
    // The prior shared `paused` flag was clobbered by resume(): hover → scroll
    // offscreen → mouseleave → resume() cleared the flag → carousel advanced
    // while offscreen. Layered sources keep it paused until back in viewport.
    const fake = newFakeApi();
    mockApi = fake;
    const { container } = renderCarousel();

    // Baseline: advances.
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Hover → pause.
    fireEvent.mouseEnter(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Scroll offscreen while hovered → still paused.
    triggerVisibility(false);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // THE F1 BUG: mouseleave must not resume an offscreen carousel.
    fireEvent.mouseLeave(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Back into the viewport, no hover/focus → resumes.
    triggerVisibility(true);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(2);
  });

  it('F1 interleaving: focusout while offscreen does NOT resume auto-advance', () => {
    const fake = newFakeApi();
    mockApi = fake;
    const { container } = renderCarousel();

    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    fireEvent.focusIn(container);
    triggerVisibility(false);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // focusout must not resume an offscreen carousel.
    fireEvent.focusOut(container);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    triggerVisibility(true);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(2);
  });
});

describe('CarouselRenderer auto-advance — F2 reactive reduced-motion', () => {
  it('never auto-advances when prefers-reduced-motion is on at mount', () => {
    setReducedMotion(true);
    const fake = newFakeApi();
    mockApi = fake;
    renderCarousel();
    fireTick();
    expect(fake.scrollNext).not.toHaveBeenCalled();
  });

  it('enabling reduced-motion mid-session stops the running interval immediately', () => {
    const fake = newFakeApi();
    mockApi = fake;
    renderCarousel();

    // reduced-motion off → advances.
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Enable reduced-motion reactively → interval cleared (zero-tick latency).
    setReducedMotion(true);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(1);

    // Disable reduced-motion → interval restarts → advances again.
    setReducedMotion(false);
    fireTick();
    expect(fake.scrollNext).toHaveBeenCalledTimes(2);
  });

  it('does not auto-advance without autoPlay even when reduced-motion is off', () => {
    const fake = newFakeApi();
    mockApi = fake;
    renderCarousel({ autoPlay: false });
    fireTick();
    expect(fake.scrollNext).not.toHaveBeenCalled();
  });
});

describe('CarouselRenderer component handle — O-03 identity stability', () => {
  it('slide changes do not rebuild the handle (no register churn)', () => {
    const fake = newFakeApi();
    mockApi = fake;
    renderCarousel();
    // Capture the registration count after the api-driven effects settle on
    // mount (the handle is registered with api=null, then again once the mocked
    // Carousel injects the api).
    const registeredAfterMount = registerMock.mock.calls.length;
    expect(registeredAfterMount).toBeGreaterThan(0);

    // Simulate the embla api reporting a new selected slide. activeIndex changes,
    // but it is read via activeIndexRef (not a handle dep), so the register
    // effect does not re-run and the handle is not rebuilt.
    fake.setSnap(1);
    act(() => {
      fake.triggerSelect();
    });
    expect(registerMock.mock.calls.length).toBe(registeredAfterMount);

    // And getDebugData still reflects the latest slide.
    const handle = registerMock.mock.calls[registeredAfterMount - 1]?.[0] as
      | { capabilities?: { getDebugData?: () => Record<string, unknown> } }
      | undefined;
    expect(handle?.capabilities?.getDebugData?.()).toMatchObject({ activeIndex: 1 });
  });
});
