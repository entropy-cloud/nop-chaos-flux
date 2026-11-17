interface DomShadow {
  root: Node;
  cssBundleId?: string;
  capturedAt: number;
}

export function captureDomShadow(root: Element = document.documentElement): DomShadow {
  const clone = root.cloneNode(true) as Element;

  clone.querySelectorAll('script').forEach((node) => node.remove());

  const seenCssIds = new Set<string>();
  clone.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const cssId = `css:${href}`;
    if (seenCssIds.has(cssId)) {
      link.remove();
      return;
    }
    seenCssIds.add(cssId);
    link.setAttribute('data-nop-shadow-css-id', cssId);
  });

  return {
    root: clone,
    cssBundleId: seenCssIds.size > 0 ? [...seenCssIds].join('|') : undefined,
    capturedAt: Date.now(),
  };
}

export function attachDomShadow(
  shadow: DomShadow,
  container: HTMLElement,
): () => void {
  const attached = shadow.root.cloneNode(true);
  container.appendChild(attached);
  return () => {
    attached.parentNode?.removeChild(attached);
  };
}

