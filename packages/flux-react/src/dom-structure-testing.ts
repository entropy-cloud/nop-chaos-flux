/**
 * DOM 结构契约测试 helper（owner doc: renderer-markers-and-selectors.md
 * "Universal Root Anchors"）。仅由各渲染器包的测试代码导入，不进入任何生产
 * 渲染路径；断言失败抛普通 Error，不依赖测试框架全局（expect 等由调用方决定
 * 如何承接）。
 */

export interface RendererRootAnchorExpectations {
  /** 注册的 renderer type（同时决定 `nop-<type>` 根标记的期望值）。 */
  type: string;
  /** 期望的 `data-cid` 值；省略则只断言属性存在。 */
  cid?: string | number | null;
  /** 登记过的豁免项（如 hidden 裸输入、关闭态 portal），跳过对应断言。 */
  skip?: Array<'marker' | 'renderer' | 'cid'>;
}

function fail(message: string): never {
  throw new Error(`[dom-structure] ${message}`);
}

export function assertRendererRootAnchors(
  root: Element | null | undefined,
  expected: RendererRootAnchorExpectations,
): void {
  const label = `renderer "${expected.type}"`;
  if (!root) fail(`${label}: root element not found`);

  if (!expected.skip?.includes('marker')) {
    const marker = `nop-${expected.type}`;
    if (!root.classList.contains(marker)) {
      fail(
        `${label}: root element missing class "${marker}" (got className="${root.className}")`,
      );
    }
  }

  if (!expected.skip?.includes('renderer')) {
    if (root.getAttribute('data-renderer') !== expected.type) {
      fail(
        `${label}: data-renderer expected "${expected.type}", got "${root.getAttribute('data-renderer')}"`,
      );
    }
  }

  if (!expected.skip?.includes('cid')) {
    const cid = root.getAttribute('data-cid');
    if (cid == null || cid === '') {
      fail(`${label}: data-cid missing on root element`);
    }
    if (expected.cid != null && String(expected.cid) !== cid) {
      fail(`${label}: data-cid expected "${expected.cid}", got "${cid}"`);
    }
  }
}
