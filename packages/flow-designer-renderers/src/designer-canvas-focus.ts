const canvasFocusHandlers = new WeakMap<object, () => void>();

export function registerDesignerCanvasFocusHandler(owner: object, handler: () => void) {
  canvasFocusHandlers.set(owner, handler);
  return () => {
    if (canvasFocusHandlers.get(owner) === handler) {
      canvasFocusHandlers.delete(owner);
    }
  };
}

export function focusDesignerCanvasSurface(owner: object) {
  canvasFocusHandlers.get(owner)?.();
}
