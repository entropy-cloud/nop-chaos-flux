/**
 * palette 拖入 ghost（plan 531 S2 Phase 1，527 setPaletteDragGhost 同款移植）：
 * feature-detect setDragImage（宿主/测试 dataTransfer 缺失时早退，浏览器默认拖拽截图兜底）；
 * ghost 元素离屏 fixed（视口外）+ pointer-events:none，避免干扰 elementsFromPoint 命中链；
 * setDragImage 后即刻移除（timeout 兜底 cleanup）。纯 DOM 工具，与 React/leafer 零耦合。
 */
export function setScadaPaletteDragGhost(event: { dataTransfer: DataTransfer | null }, label: string): void {
  const dataTransfer = event.dataTransfer as (DataTransfer & { setDragImage?: unknown }) | null;
  if (!dataTransfer || typeof dataTransfer.setDragImage !== 'function') {
    return;
  }
  const ghost = document.createElement('div');
  ghost.textContent = label;
  ghost.setAttribute('data-testid', 'scada-editor-drag-ghost');
  ghost.style.cssText = [
    'position:fixed',
    'top:-200px',
    'left:-200px',
    'z-index:-1',
    'pointer-events:none',
    'display:inline-flex',
    'align-items:center',
    'padding:4px 10px',
    'border-radius:6px',
    'border:1px solid hsl(var(--primary))',
    'background:var(--nop-surface)',
    'color:hsl(var(--primary))',
    'font-size:12px',
    'font-weight:500',
    'white-space:nowrap',
  ].join(';');
  document.body.appendChild(ghost);
  dataTransfer.setDragImage(ghost, 14, 10);
  window.setTimeout(() => {
    ghost.remove();
  }, 0);
}
