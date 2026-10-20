import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { IndexBarSchema } from './schemas.js';

/**
 * Index bar (plan 668 Phase 1, M10a): vertical letter/key sidebar for list
 * navigation. Non-passive touchmove tracks the key under the finger via
 * `document.elementFromPoint` + `closest('[data-index-key]')`; the highlighted
 * key dispatches onChange and optionally scrolls a target container.
 *
 * Not a modal surface: no global z-index seat, no scroll lock — the
 * highlight bubble uses a component-local z-index.
 */
export function IndexBarRenderer(props: RendererComponentProps<IndexBarSchema>) {
  const slotProps = props.props;
  const items = React.useMemo(() => slotProps.items ?? [], [slotProps.items]);
  const disabled = slotProps.disabled === true;
  const targetSelector = typeof slotProps.targetSelector === 'string' ? slotProps.targetSelector : undefined;

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const activeIndexRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);
  // last committed key (persists after release; data-selected e2e channel)
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const notify = React.useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) return;
      const payload = { type: 'select', index, value: item.value, label: item.label };
      void props.events.onChange?.(payload, {
        event: payload,
        evaluationBindings: payload,
        scope: props.node.scope,
      });
    },
    [items, props.events, props.node.scope],
  );

  const scrollToTarget = React.useCallback(
    (index: number) => {
      if (!targetSelector) return;
      const target = document.querySelector(`${targetSelector} [data-index-anchor="${index}"]`);
      if (target) {
        target.scrollIntoView({ block: 'start' });
      }
      // target-miss: no-op, no throw (Failure Path indexbar-target-miss)
    },
    [targetSelector],
  );

  const sidebarRef = React.useRef<HTMLDivElement | null>(null);
  const locate = React.useCallback(
    (x: number, y: number) => {
      const element = document.elementFromPoint(x, y);
      let keyEl = element?.closest('[data-index-key]') as HTMLElement | null;
      if (!keyEl && sidebarRef.current) {
        // geometric fallback for real browsers: pick the key whose rect
        // contains the touch Y (handles gaps between keys)
        for (const key of sidebarRef.current.querySelectorAll<HTMLElement>('[data-index-key]')) {
          const rect = key.getBoundingClientRect();
          if (y >= rect.top && y <= rect.bottom) {
            keyEl = key;
            break;
          }
        }
        if (!keyEl) {
          const keys = [...sidebarRef.current.querySelectorAll<HTMLElement>('[data-index-key]')];
          if (keys.length > 0) {
            const first = keys[0].getBoundingClientRect();
            const last = keys[keys.length - 1].getBoundingClientRect();
            if (y < first.top) keyEl = keys[0];
            else if (y > last.bottom) keyEl = keys[keys.length - 1];
          }
        }
      }
      if (!keyEl) return;
      const index = Number.parseInt(keyEl.getAttribute('data-index-key') ?? '', 10);
      if (!Number.isFinite(index) || index === activeIndexRef.current) return;
      setActiveIndex(index);
      setSelectedIndex(index);
      notify(index);
      scrollToTarget(index);
    },
    [notify, scrollToTarget],
  );

  const locateFromTouch = (x: number, y: number) => locate(x, y);
  const locateFromTouchRef = React.useRef(locateFromTouch);

  function onTouchStart(e: React.TouchEvent) {
    if (disabled || items.length === 0) return;
    // refresh the native-listener closure at gesture start (assignment in a
    // handler is outside render, satisfying react-hooks/refs)
    locateFromTouchRef.current = locate;
    const touch = e.touches[0];
    if (!touch) return;
    locate(touch.clientX, touch.clientY);
  }


  React.useEffect(() => {
    if (disabled) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    function onNativeTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      locateFromTouchRef.current(touch.clientX, touch.clientY);
    }
    sidebar.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      sidebar.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, [disabled]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className={cn('nop-index-bar', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="index-bar"
      data-disabled={disabled || undefined}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        touchAction: 'none',
        zIndex: 5,
      }}
      onTouchStart={disabled ? undefined : onTouchStart}
      onTouchEnd={disabled ? undefined : () => setActiveIndex(null)}
      onTouchCancel={disabled ? undefined : () => setActiveIndex(null)}
      data-selected={selectedIndex ?? undefined}
    >
      {items.map((item, index) => {
        const active = activeIndex === index;
        return (
          <div
            key={`${String(item.label)}:${String(item.value)}`}
            data-slot="index-bar-key"
            data-index-key={index}
            data-active={active || undefined}
            data-selected={selectedIndex === index || undefined}
            style={{
              position: 'relative',
              padding: '2px 8px',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // color via package styles.css ([data-active] rules) — literal
              // colors live there per the styling-contract gate
            }}
          >
            {item.label}
            {active ? (
              <span
                data-slot="index-bar-bubble"
                style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginRight: 8,
                  minWidth: 40,
                  minHeight: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  fontSize: 16,
                  zIndex: 6,
                }}
              >
                {item.label}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
