export type TreeNavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End';

export function getVisibleTreeItems(root: HTMLDivElement | null): HTMLDivElement[] {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll<HTMLDivElement>('[role="treeitem"]'));
}

export function getTreeItemDepth(element: HTMLDivElement | undefined): number {
  if (!element) {
    return 0;
  }

  const depth = Number(element.dataset.depth);
  return Number.isFinite(depth) ? depth : 0;
}

export function getTreeItemNodeId(element: HTMLDivElement | undefined): string | undefined {
  return element?.dataset.treeNodeId;
}
