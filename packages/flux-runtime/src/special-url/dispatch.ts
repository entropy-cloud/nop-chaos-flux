/**
 * Splits a special-URL of the form `@type:path` (or `type://path`) into
 * `[type, path]`. Returns `undefined` for plain relative URLs. Mirrors AMIS
 * `splitPrefixUrl` (`packages/amis-core/src/core/url.ts`).
 *
 * Note: `http://`/`https://` urls split into a tuple (scheme, rest); the
 * dispatch layer decides whether a scheme is actionable. Unknown schemes fall
 * through to `env.fetcher` unchanged.
 */
export function splitSpecialPrefix(url: string): readonly [string, string] | undefined {
  if (typeof url !== 'string' || url.length === 0) {
    return undefined;
  }

  if (url.startsWith('@')) {
    const separatorIndex = url.indexOf(':');
    if (separatorIndex < 0) {
      return undefined;
    }
    return [url.slice(1, separatorIndex), url.slice(separatorIndex + 1).trim()];
  }

  const schemeIndex = url.indexOf('://');
  if (schemeIndex > 0) {
    return [url.slice(0, schemeIndex), url.slice(schemeIndex + 3)];
  }

  return undefined;
}
