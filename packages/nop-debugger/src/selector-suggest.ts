interface SelectorSuggestion {
  selector: string;
  tier: 'data-testid' | 'data-cid' | 'css';
  unique: boolean;
}

function shortestUniqueCss(element: Element): string | null {
  if (typeof document === 'undefined') return null;
  const tag = element.tagName.toLowerCase();
  // try id
  const id = element.getAttribute('id');
  if (id && document.querySelectorAll(`#${CSS.escape(id)}`).length === 1) {
    return `#${id}`;
  }
  // tag + classes
  const classes = Array.from(element.classList);
  if (classes.length > 0) {
    const selector = `${tag}.${classes.map((name) => CSS.escape(name)).join('.')}`;
    if (document.querySelectorAll(selector).length === 1) return selector;
  }
  // nth-of-type chain via parent
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((child) => child.tagName === element.tagName);
    const index = siblings.indexOf(element) + 1;
    const parentSelector = parent === document.body ? 'body' : shortestUniqueCss(parent);
    if (parentSelector) {
      const selector = `${parentSelector} > ${tag}:nth-of-type(${index})`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
  }
  return tag && document.querySelectorAll(tag).length === 1 ? tag : null;
}

export function suggestSelectorForElement(element: Element): SelectorSuggestion {
  const testId = element.getAttribute('data-testid');
  if (testId && (typeof document === 'undefined' || document.querySelectorAll(`[data-testid="${testId}"]`).length === 1)) {
    return { selector: `[data-testid="${testId}"]`, tier: 'data-testid', unique: true };
  }
  const cid = element.getAttribute('data-cid');
  if (cid && (typeof document === 'undefined' || document.querySelectorAll(`[data-cid="${cid}"]`).length === 1)) {
    return { selector: `[data-cid="${cid}"]`, tier: 'data-cid', unique: true };
  }
  const css = shortestUniqueCss(element);
  if (css) {
    return { selector: css, tier: 'css', unique: document.querySelectorAll(css).length === 1 };
  }
  return { selector: element.tagName.toLowerCase(), tier: 'css', unique: false };
}

export function suggestSelector(cid: string): SelectorSuggestion | null {
  if (typeof document === 'undefined') return null;
  const element = document.querySelector(`[data-cid="${cid}"]`);
  if (!element) return null;
  return suggestSelectorForElement(element);
}
