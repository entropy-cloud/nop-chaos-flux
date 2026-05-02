if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

if (typeof PointerEvent === 'undefined') {
  class PointerEvent extends MouseEvent {
    constructor(
      type: string,
      props: MouseEventInit & { pointerId?: number; pressure?: number } = {},
    ) {
      super(type, props);
    }
  }

  globalThis.PointerEvent = PointerEvent as any;
}
