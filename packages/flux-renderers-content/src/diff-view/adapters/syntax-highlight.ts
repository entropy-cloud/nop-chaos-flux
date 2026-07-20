import { createLowlight } from 'lowlight';

let lowlightInstance: ReturnType<typeof createLowlight> | null = null;

function getLowlight() {
  if (!lowlightInstance) {
    lowlightInstance = createLowlight();
  }
  return lowlightInstance;
}

interface CacheEntry {
  html: string;
}

class LRUCache {
  private max: number;
  private map = new Map<string, CacheEntry>();

  constructor(max: number) {
    this.max = max;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.map.get(key);
    if (entry) {
      this.map.delete(key);
      this.map.set(key, entry);
    }
    return entry;
  }

  set(key: string, entry: CacheEntry): void {
    if (this.map.size >= this.max) {
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, entry);
  }
}

const cache = new LRUCache(50);

export function highlight(code: string, language: string): string {
  if (!language || language === 'plaintext') {
    return escapeHtml(code);
  }

  const cacheKey = `${language}:${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.html;

  try {
    const lowlight = getLowlight();
    const result = lowlight.highlight(language, code);
    let html = '';
    for (const node of result.children) {
      if (node.type === 'text') {
        html += escapeHtml(node.value);
      } else if (node.type === 'element') {
        const classes = Array.isArray(node.properties?.className) ? (node.properties.className as string[]).join(' hl-') : '';
        html += `<span class="hl-${classes}">`;
        for (const child of node.children) {
          if (child.type === 'text') {
            html += escapeHtml(child.value);
          }
        }
        html += '</span>';
      }
    }
    cache.set(cacheKey, { html });
    return html;
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { escapeHtml };
