import { afterAll, beforeAll } from 'vitest';

type PointerEventCtor = typeof globalThis.PointerEvent;

export function installTestDomPolyfills(): () => void {
  const originalScrollIntoView = Element.prototype.scrollIntoView;
  const hadOwnScrollIntoView = Object.prototype.hasOwnProperty.call(Element.prototype, 'scrollIntoView');
  const originalPointerEvent = globalThis.PointerEvent;
  const hadPointerEvent = typeof originalPointerEvent !== 'undefined';

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }

  if (typeof globalThis.PointerEvent === 'undefined') {
    class TestPointerEvent extends MouseEvent {
      constructor(
        type: string,
        props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
      ) {
        super(type, props);
      }
    }

    globalThis.PointerEvent = TestPointerEvent as PointerEventCtor;
  }

  return () => {
    if (hadOwnScrollIntoView) {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    } else {
      delete (Element.prototype as { scrollIntoView?: typeof Element.prototype.scrollIntoView })
        .scrollIntoView;
    }

    if (hadPointerEvent) {
      globalThis.PointerEvent = originalPointerEvent;
    } else {
      delete (globalThis as { PointerEvent?: PointerEventCtor }).PointerEvent;
    }
  };
}

let restoreDomPolyfills: (() => void) | undefined;

beforeAll(() => {
  restoreDomPolyfills = installTestDomPolyfills();
});

afterAll(() => {
  restoreDomPolyfills?.();
  restoreDomPolyfills = undefined;
});
