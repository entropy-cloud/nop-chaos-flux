import React, { useEffect, useRef, useState } from 'react';
import type { ComponentHandle, RendererComponentProps } from '@nop-chaos/flux-core';
import { useCurrentComponentRegistry } from '@nop-chaos/flux-react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  cn,
} from '@nop-chaos/ui';
import type { CarouselItemSchema, CarouselSchema } from './schemas.js';

const DEFAULT_INTERVAL = 5000;

function normalizeItems(value: unknown): CarouselItemSchema[] {
  return Array.isArray(value) ? (value as CarouselItemSchema[]) : [];
}

function toSlideKey(item: CarouselItemSchema | undefined, index: number): string {
  const candidate = item ? asString(item.image) ?? asString(item.title) : undefined;
  return candidate ? `slide:${candidate}` : `slide:${index}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function CarouselRenderer(props: RendererComponentProps<CarouselSchema>) {
  const slotProps = props.props;
  const items = normalizeItems(slotProps.items);
  const autoPlay = slotProps.autoPlay === true;
  const interval =
    typeof slotProps.interval === 'number' && slotProps.interval > 0
      ? slotProps.interval
      : DEFAULT_INTERVAL;
  const loop = slotProps.loop !== false;
  const showControls = slotProps.controls !== false;
  const showIndicators = slotProps.indicators !== false;

  const componentRegistry = useCurrentComponentRegistry();
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const onChange = props.events.onChange;
  const lastIndexRef = useRef(0);
  // O-03 / F6: activeIndex is mirrored into a ref — updated alongside
  // setActiveIndex inside the select handler below — so getDebugData reads the
  // current slide WITHOUT the component handle needing activeIndex in its
  // reactive deps. The handle therefore stays identity-stable across slide
  // changes (no register churn). autoPlay / loop stay direct reads (they are in
  // the register-effect deps and change rarely).
  const activeIndexRef = useRef(activeIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the selected slide via the embla api and bridge it to local state.
  useEffect(() => {
    if (!api) {
      return;
    }
    const onSelect = () => {
      const next = api.selectedScrollSnap();
      activeIndexRef.current = next;
      setActiveIndex(next);
      if (next !== lastIndexRef.current) {
        lastIndexRef.current = next;
        const item = items[next];
        const payload = { type: 'change', activeIndex: next, item };
        void onChange?.(payload, { event: payload, evaluationBindings: payload });
      }
    };
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, items, onChange]);

  // Auto-advance the carousel on an interval. O-04 / F1 / F2: honor
  // prefers-reduced-motion reactively, and pause on hover/focus and while
  // offscreen (WCAG 2.2.2). F1: each pause source owns an independent flag and
  // the tick derives `paused = hovered || focused || !visible`, so resuming one
  // source never clobbers another. F2: reduced-motion gates the interval
  // lifecycle directly (clear/restart on `change`) for zero-tick-latency
  // compliance, instead of being read once at setup.
  useEffect(() => {
    if (!autoPlay || !api) {
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let hovered = false;
    let focused = false;
    let visible = true;
    let id: number | undefined;
    const tick = () => {
      const paused = hovered || focused || !visible;
      if (!paused) {
        api.scrollNext();
      }
    };
    const start = () => {
      if (id !== undefined) {
        return;
      }
      id = window.setInterval(tick, interval);
    };
    const stop = () => {
      if (id === undefined) {
        return;
      }
      window.clearInterval(id);
      id = undefined;
    };
    const onReducedMotionChange = () => {
      if (reducedMotion.matches) {
        stop();
      } else {
        start();
      }
    };
    const onHoverEnter = () => {
      hovered = true;
    };
    const onHoverLeave = () => {
      hovered = false;
    };
    const onFocusIn = () => {
      focused = true;
    };
    const onFocusOut = () => {
      focused = false;
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseenter', onHoverEnter);
      container.addEventListener('mouseleave', onHoverLeave);
      container.addEventListener('focusin', onFocusIn);
      container.addEventListener('focusout', onFocusOut);
    }
    let observer: IntersectionObserver | undefined;
    if (container && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      observer.observe(container);
    }
    reducedMotion.addEventListener('change', onReducedMotionChange);
    onReducedMotionChange();
    return () => {
      stop();
      if (container) {
        container.removeEventListener('mouseenter', onHoverEnter);
        container.removeEventListener('mouseleave', onHoverLeave);
        container.removeEventListener('focusin', onFocusIn);
        container.removeEventListener('focusout', onFocusOut);
      }
      observer?.disconnect();
      reducedMotion.removeEventListener('change', onReducedMotionChange);
    };
  }, [autoPlay, interval, api]);

  // O-03 / F6: the handle is constructed inside the register effect (no
  // hand-written useMemo). Its reactive inputs are the effect deps below;
  // activeIndex is read via `activeIndexRef` (not a dep), so the handle keeps a
  // stable identity across slide changes (no register churn) while getDebugData
  // still returns fresh values.
  useEffect(() => {
    if (!componentRegistry) {
      return;
    }
    const handle: ComponentHandle = {
      id: props.id,
      name: typeof slotProps.name === 'string' ? slotProps.name : undefined,
      type: 'carousel',
      capabilities: {
        invoke(method, payload) {
          switch (method) {
            case 'next':
              api?.scrollNext();
              return { ok: true, data: { index: api?.selectedScrollSnap() } };
            case 'prev':
              api?.scrollPrev();
              return { ok: true, data: { index: api?.selectedScrollSnap() } };
            case 'setValue': {
              const requested = Number(payload?.value);
              if (Number.isFinite(requested)) {
                const target = Math.max(0, Math.min(Math.trunc(requested), items.length - 1));
                api?.scrollTo(target);
                return { ok: true, data: { index: target } };
              }
              return { ok: false, error: new Error('carousel setValue requires a numeric value') };
            }
            default:
              return { ok: false, error: new Error(`Unsupported carousel method: ${method}`) };
          }
        },
        hasMethod(method) {
          return method === 'next' || method === 'prev' || method === 'setValue';
        },
        listMethods() {
          return ['next', 'prev', 'setValue'];
        },
        getDebugData() {
          return {
            activeIndex: activeIndexRef.current,
            itemCount: items.length,
            autoPlay,
            loop,
          };
        },
      },
    };
    return componentRegistry.register(handle, { cid: props.meta.cid });
  }, [componentRegistry, props.id, props.meta.cid, api, items.length, slotProps.name, autoPlay, loop]);

  if (items.length === 0) {
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="carousel"
        data-empty="true"
        className={cn('nop-carousel', props.meta.className)}
      >
        <div data-slot="carousel-empty" className="text-sm text-muted-foreground">
          {'No items to display'}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="carousel"
      data-active-index={activeIndex}
      className={cn('nop-carousel', props.meta.className)}
    >
      <Carousel opts={{ loop }} setApi={setApi} className="w-full max-w-full">
        <CarouselContent>
          {items.map((item, index) => {
            const image = asString(item.image);
            const title = asString(item.title);
            const caption = asString(item.caption);
            return (
              <CarouselItem key={toSlideKey(item, index)} data-slot="carousel-item" data-item-index={index}>
                <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt={title || ''}
                      data-slot="carousel-item-image"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      data-slot="carousel-item-placeholder"
                      className="flex h-32 w-full items-center justify-center text-xs text-muted-foreground"
                    >
                      {`Slide ${index + 1}`}
                    </div>
                  )}
                  {title || caption ? (
                    <div
                      data-slot="carousel-item-caption"
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-white"
                    >
                      {title ? (
                        <div data-slot="carousel-item-title" className="text-sm font-medium">
                          {title}
                        </div>
                      ) : null}
                      {caption ? (
                        <div data-slot="carousel-item-text" className="text-xs opacity-90">
                          {caption}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {showControls ? (
          <>
            <CarouselPrevious data-slot="carousel-prev" />
            <CarouselNext data-slot="carousel-next" />
          </>
        ) : null}
      </Carousel>
      {showIndicators ? (
        <div data-slot="carousel-indicators" className="mt-2 flex justify-center gap-2">
          {items.map((item, index) => (
            <button
              key={toSlideKey(item, index)}
              type="button"
              data-slot="carousel-indicator"
              data-index={index}
              data-active={index === activeIndex ? 'true' : undefined}
              aria-label={`Go to slide ${index + 1}`}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                index === activeIndex ? 'bg-primary' : 'bg-muted-foreground/30',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
