/**
 * 共享拖拽 ghost 原语（plan 597 CX-17，R1 M3 交付签名）：为 HTML5 拖拽构造离屏
 * DOM 节点（fixed 视口外 + pointer-events:none，避免干扰 elementsFromPoint 命中链），
 * setDragImage 后经 setTimeout(0) 移除。原语只持有共享不变式；视觉差异由消费方
 * 经 `style` cssText 字符串参数注入（禁变体枚举——消费方 token 在 ui 之下不可导入）；
 * label 为消费侧已组合的终串（i18n/fieldType 组合留消费侧）。宿主/测试 dataTransfer
 * 缺 setDragImage 时 feature-detect 降级浏览器默认截图；setDragImage 抛错（happy-dom
 * 等 Not implemented 宿主）时统一防御化降级：同步移除 ghost 并返回（B 派语义，
 * 申报防御增强）。
 */

const GHOST_INVARIANT_CSS_TEXT = [
  'position:fixed',
  'top:-200px',
  'left:-200px',
  'z-index:-1',
  'pointer-events:none',
  'display:inline-flex',
  'align-items:center',
  'white-space:nowrap',
].join(';');

const DEFAULT_GHOST_CSS_TEXT = [
  'gap:6px',
  'padding:6px 12px',
  'border-radius:8px',
  'border:1px solid hsl(var(--primary))',
  'background:hsl(var(--secondary))',
  'box-shadow:0 4px 12px rgba(15,23,42,0.16)',
  'font-size:13px',
  'font-weight:500',
].join(';');

interface DragGhostOptions {
  /** ghost 元素 data-testid（e2e MutationObserver 以 testid 锚定，三面各持原值）。 */
  testid: string;
  /** 已组合终串 label（i18n/fieldType 组合留消费侧）。 */
  label: string;
  /** 消费方 cssText（附加在共享不变式之后；缺省=hsl-vars 体）。 */
  style?: string;
  offsetX?: number;
  offsetY?: number;
}

export function setDragGhost(event: { dataTransfer: DataTransfer | null }, options: DragGhostOptions): void {
  const dataTransfer = event.dataTransfer as (DataTransfer & { setDragImage?: unknown }) | null;
  if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function') {
    return;
  }
  const ghost = document.createElement('div');
  ghost.textContent = options.label;
  ghost.setAttribute('data-testid', options.testid);
  ghost.style.cssText = [GHOST_INVARIANT_CSS_TEXT, options.style ?? DEFAULT_GHOST_CSS_TEXT].join(';');
  document.body.appendChild(ghost);
  try {
    // 宿主可能存在 setDragImage 但抛 Not implemented（happy-dom 等）——降级默认截图
    dataTransfer.setDragImage(ghost, options.offsetX ?? 12, options.offsetY ?? 12);
  } catch {
    ghost.remove();
    return;
  }
  window.setTimeout(() => {
    ghost.remove();
  }, 0);
}
