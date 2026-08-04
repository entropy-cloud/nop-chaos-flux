let innerIdCounter = 0;

/** 首击延迟（leafer-ui interaction config.ts:14 `pointer.tapTime` 默认 120ms）。 */
export const TAP_MERGE_TIME = 120;
/** 双击窗口增量（leafer Interaction.ts tap(): `useTime < tapTime + 50`）。 */
export const TAP_MERGE_WINDOW = 50;

const pendingTapTimers = new Set<ReturnType<typeof setTimeout>>();

export function resetLeaferMock() {
  innerIdCounter = 0;
  for (const timer of pendingTapTimers) clearTimeout(timer);
  pendingTapTimers.clear();
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

export class MockImage extends MockRect {
  override tag = 'Image';
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

  scaleOfWorld(origin: { x: number; y: number }, scale: number) {
    // P1-9 mock↔真实漂移收口：按 leafer-ui@2.2.9 真实语义建模 x/y 锚定副作用——
    // `zoomOfWorld` → `getTempLocal(t, origin)` 把 origin 当 **外层（screen）空间** 点
    // （parent.scrollWorldTransform 逆变换），`zoomOfLocal` 缩放后按锚点反推平移：
    // t.x = (x - ox)·k + ox（t = zoomLayer，x/y 为外层空间平移）。此前 mock 只乘 scaleX/scaleY
    // 不更新 x/y，掩蔽了引擎传内容坐标锚点的漂移缺陷（P1-9 462 单测不可见）。
    this.scaleOfWorldCalls.push({ world: origin, scale });
    const ox = origin.x;
    const oy = origin.y;
    this.x = (this.x - ox) * scale + ox;
    this.y = (this.y - oy) * scale + oy;
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
  private tapMerge: { timer: ReturnType<typeof setTimeout> | null; downTime: number } | null = null;

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

  override emit(event: string, ...args: unknown[]) {
    // tap 事件经双击合并语义建模（I11.1 Proof，leafer Interaction.ts tap():321-356 + config.ts:14）：
    // path 含 double_tap 监听（EventBridge 恒挂）→ 首击延迟 tapTime(120ms) 发射，tapTime+50 窗口内
    // 第二击取消首击并改发 double_tap（双击只派发 dblclick 不派发 click）；窗口外重开新周期。
    if (event === 'tap' && this.listeners.has('double_tap')) {
      return this.emitTapWithDoubleMerge(...args);
    }
    return super.emit(event, ...args);
  }

  private emitTapWithDoubleMerge(...args: unknown[]) {
    const now = Date.now();
    const pending = this.tapMerge;
    if (pending !== null && now - pending.downTime < TAP_MERGE_TIME + TAP_MERGE_WINDOW) {
      if (pending.timer !== null) {
        clearTimeout(pending.timer);
        pendingTapTimers.delete(pending.timer);
      }
      this.tapMerge = null;
      return super.emit('double_tap', ...args);
    }
    if (pending !== null && pending.timer !== null) {
      clearTimeout(pending.timer);
      pendingTapTimers.delete(pending.timer);
    }
    const state: { timer: ReturnType<typeof setTimeout> | null; downTime: number } = {
      timer: null,
      downTime: now,
    };
    const timer = setTimeout(() => {
      pendingTapTimers.delete(timer);
      if (this.tapMerge === state) this.tapMerge = null;
      super.emit('tap', ...args);
    }, TAP_MERGE_TIME);
    state.timer = timer;
    pendingTapTimers.add(timer);
    this.tapMerge = state;
    return this;
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
  ground: MockLeafer | undefined;
  tree: MockLeafer;
  sky: MockLeafer | undefined;
  resizeCalls: Array<{ width: number; height: number }> = [];
  destroyed = false;

  constructor(config: Record<string, unknown> = {}) {
    super(config);
    this.config = config;
    // 对齐真实 leafer App.init（web.module.js:10099-10106）：仅当 config 含 ground/tree/sky key 时创建对应层
    // （gate-3 类 mock↔真实漂移面：此前 mock 恒建三层，掩蔽引擎未请求 sky/ground 时真实层缺失的缺陷）。
    if (config.ground !== undefined) this.ground = new MockLeafer({ type: 'ground' });
    this.tree = new MockLeafer((config.tree as Record<string, unknown>) ?? {});
    if (config.sky !== undefined) this.sky = new MockLeafer({ type: 'sky' });
  }

  override destroy() {
    this.destroyed = true;
    this.tree.destroy();
    this.ground?.destroy();
    this.sky?.destroy();
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
  Image: MockImage,
  Path: MockPath,
  UI: MockLeaf,
};

export { MockApp as App, MockLeafer as Leafer, MockGroup as Group, MockBox as Box, MockRect as Rect };
export {
  MockEllipse as Ellipse,
  MockLine as Line,
  MockPolygon as Polygon,
  MockText as Text,
  MockImage as Image,
  MockPath as Path,
  MockLeaf as UI,
};
