let innerIdCounter = 0;

export function resetLeaferMock() {
  innerIdCounter = 0;
}

export class MockLeaf {
  tag = 'Leaf';
  innerId = ++innerIdCounter;
  parent: MockLeaf | null = null;
  children: MockLeaf[] = [];
  listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  destroyed = false;

  constructor(config?: Record<string, unknown>) {
    if (config) Object.assign(this, config);
  }

  on(event: string, fn: (...args: unknown[]) => void) {
    const list = this.listeners.get(event) ?? [];
    list.push(fn);
    this.listeners.set(event, list);
    return this;
  }

  once(event: string, fn: (...args: unknown[]) => void) {
    const wrapped = (...args: unknown[]) => {
      this.off(event, wrapped);
      fn(...args);
    };
    return this.on(event, wrapped);
  }

  off(event: string, fn?: (...args: unknown[]) => void) {
    const list = this.listeners.get(event);
    if (!list) return this;
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }
    this.listeners.set(
      event,
      list.filter((item) => item !== fn),
    );
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    for (const fn of this.listeners.get(event) ?? []) {
      fn(...args);
    }
    return this;
  }

  add(child: MockLeaf | MockLeaf[]) {
    const list = Array.isArray(child) ? child : [child];
    for (const item of list) {
      item.parent = this;
      this.children.push(item);
    }
    return this;
  }

  addMany(...children: MockLeaf[]) {
    return this.add(children);
  }

  remove(child?: MockLeaf) {
    if (!child) return this;
    this.children = this.children.filter((item) => item !== child);
    if (child.parent === this) child.parent = null;
    return this;
  }

  removeAll() {
    for (const child of this.children) child.parent = null;
    this.children = [];
    return this;
  }

  clear() {
    return this.removeAll();
  }

  set(attrs: Record<string, unknown>) {
    Object.assign(this, attrs);
    return this;
  }

  get(name?: string | string[]) {
    if (name === undefined) return { ...this };
    if (Array.isArray(name)) {
      const out: Record<string, unknown> = {};
      for (const key of name) out[key] = (this as Record<string, unknown>)[key];
      return out;
    }
    return (this as Record<string, unknown>)[name];
  }

  reset(data?: Record<string, unknown>) {
    if (data) Object.assign(this, data);
    return this;
  }

  destroy() {
    this.destroyed = true;
    this.listeners.clear();
    if (this.parent) this.parent.remove(this);
    this.removeAll();
  }

  toJSON(): Record<string, unknown> {
    return { tag: this.tag, innerId: this.innerId, children: this.children.map((c) => c.toJSON()) };
  }
}

export class MockGroup extends MockLeaf {
  override tag = 'Group';
}

export class MockBox extends MockGroup {
  override tag = 'Box';
}

export class MockRect extends MockLeaf {
  override tag = 'Rect';
}

export class MockEllipse extends MockLeaf {
  override tag = 'Ellipse';
}

export class MockLine extends MockLeaf {
  override tag = 'Line';
}

export class MockArrow extends MockLeaf {
  override tag = 'Arrow';
}

export class MockPolygon extends MockLeaf {
  override tag = 'Polygon';
}

export class MockText extends MockLeaf {
  override tag = 'Text';
}

export class MockPath extends MockLeaf {
  override tag = 'Path';
}

export class MockZoomLayer extends MockGroup {
  override tag = 'ZoomLayer';
  scaleX = 1;
  scaleY = 1;
  x = 0;
  y = 0;
  moveCalls: Array<{ x: number; y: number }> = [];
  scaleOfWorldCalls: Array<{ world: { x: number; y: number }; scale: number }> = [];

  constructor(config?: Record<string, unknown>) {
    super();
    if (config) Object.assign(this, config);
  }

  move(x: number | { x: number; y: number }, y?: number) {
    const dx = typeof x === 'number' ? x : x.x;
    const dy = typeof x === 'number' ? (y ?? 0) : x.y;
    this.moveCalls.push({ x: dx, y: dy });
    this.x = this.x + dx;
    this.y = this.y + dy;
    return this;
  }

  scaleOfWorld(world: { x: number; y: number }, scale: number) {
    this.scaleOfWorldCalls.push({ world, scale });
    this.scaleX = this.scaleX * scale;
    this.scaleY = this.scaleY * scale;
    return this;
  }
}

const wrappedByOriginal = new WeakMap<(...args: unknown[]) => void, Set<(...args: unknown[]) => void>>();

export class MockLeafer extends MockGroup {
  override tag = 'Leafer';
  zoomLayer: MockZoomLayer;
  selector: { getByPoint: (point: { x: number; y: number }, padding?: number) => unknown };
  leafs = 0;
  __world = { x: 0, y: 0, width: 0, height: 0 };
  renderCount = 0;
  type?: string;
  config: Record<string, unknown> = {};

  constructor(config: Record<string, unknown> = {}) {
    super();
    this.config = config;
    this.type = (config.type as string | undefined) ?? 'design';
    this.zoomLayer = new MockZoomLayer({ name: 'zoomLayer' });
    // 真实 leafer `selector.getByPoint` 恒返回 `IPickResult { target, path }`（gate-3-review §3 抽查项 3 / M-2）——mock 返回同形状
    this.selector = {
      getByPoint: () => ({ target: null, path: [] }),
    };
  }

  override on(event: string, fn: (...args: unknown[]) => void) {
    const wrapped = (...args: unknown[]) => {
      if (event === 'render') this.renderCount++;
      fn(...args);
    };
    const set = wrappedByOriginal.get(fn) ?? new Set<(...args: unknown[]) => void>();
    set.add(wrapped);
    wrappedByOriginal.set(fn, set);
    return super.on(event, wrapped);
  }

  override off(event: string, fn?: (...args: unknown[]) => void) {
    if (fn) {
      for (const wrapped of wrappedByOriginal.get(fn) ?? []) {
        super.off(event, wrapped);
      }
      return this;
    }
    return super.off(event, fn);
  }

  forceRender() {
    this.emit('render', { frame: this.renderCount + 1 });
    return this;
  }
}

export class MockApp extends MockLeafer {
  override tag = 'App';
  ground: MockLeafer;
  tree: MockLeafer;
  sky: MockLeafer;
  resizeCalls: Array<{ width: number; height: number }> = [];
  destroyed = false;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.config = config;
    this.ground = new MockLeafer({ type: 'ground' });
    this.tree = new MockLeafer((config.tree as Record<string, unknown>) ?? {});
    this.sky = new MockLeafer({ type: 'sky' });
  }

  override destroy() {
    this.destroyed = true;
    this.tree.destroy();
    this.ground.destroy();
    this.sky.destroy();
    this.zoomLayer.destroy();
  }

  resize(size: { width: number; height: number } | number, height?: number) {
    const w = typeof size === 'number' ? size : size.width;
    const h = typeof size === 'number' ? (height ?? 0) : size.height;
    this.resizeCalls.push({ width: w, height: h });
    return this;
  }
}

export const leaferUIMock = {
  App: MockApp,
  Leafer: MockLeafer,
  Group: MockGroup,
  Box: MockBox,
  Rect: MockRect,
  Ellipse: MockEllipse,
  Line: MockLine,
  Arrow: MockLine,
  Polygon: MockPolygon,
  Text: MockText,
  Path: MockPath,
  UI: MockLeaf,
};

export { MockApp as App, MockLeafer as Leafer, MockGroup as Group, MockBox as Box, MockRect as Rect };
export {
  MockEllipse as Ellipse,
  MockLine as Line,
  MockPolygon as Polygon,
  MockText as Text,
  MockPath as Path,
  MockLeaf as UI,
};
