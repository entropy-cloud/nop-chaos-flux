import { createLowlight, common } from 'lowlight';

// WA-content-007 (plan 567): the adapter was born dead (cdab2db0f) — a bare
// `createLowlight()` registers zero languages, so `highlight()` threw for
// every call and the catch silently degraded to escaped plain text (feature
// dead on arrival, zero observability). Register the common language set and
// surface unknown languages with a dev warn instead of a silent swallow.
// Bundle note: `common` (37 grammars) was chosen over per-language lazy
// registration because lowlight@3 `register` is synchronous and exposes no
// per-language subpath imports; slimming the set is a product decision that
// can land later without touching this contract.
const lowlightInstance = createLowlight(common);

/** Schema-facing aliases: schema authors write short names, hl.js uses full ones. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
};

const PLAIN_LANGUAGES = new Set(['plaintext', 'text', 'txt', 'none', 'plain']);

let warnedUnknownLanguage = false;

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
  if (!language || PLAIN_LANGUAGES.has(language)) {
    return escapeHtml(code);
  }

  const resolved = LANGUAGE_ALIASES[language] ?? language;
  const cacheKey = `${resolved}:${code}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.html;

  try {
    const result = lowlightInstance.highlight(resolved, code);
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
    // Unknown/unregistered language: degrade to plain text, but keep the
    // failure observable (dev, once) — never cache the degraded result so a
    // later language-set change takes effect immediately.
    if (import.meta.env?.DEV === true && !warnedUnknownLanguage) {
      warnedUnknownLanguage = true;
      console.warn(
        `[flux:diff-view] diff-highlight-unknown-language: language "${language}" is not registered — rendering plain text (registered set: lowlight common).`,
      );
    }
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
