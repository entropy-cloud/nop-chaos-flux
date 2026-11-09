import { describe, expect, it } from 'vitest';
import { isSafeNavigationUrl } from './url.js';

// plan 861 S1: the guard must agree with the browser's URL parser. The parser
// strips leading/trailing C0 controls and spaces and removes tab/LF/CR anywhere,
// so a scheme check on the raw string can be bypassed.
describe('isSafeNavigationUrl', () => {
  it.each([
    [' javascript:alert(1)'],
    ['\tjavascript:alert(1)'],
    ['\njavascript:alert(1)'],
    ['java\nscript:alert(1)'],
    ['java\tscript:alert(1)'],
    ['jav\rascript:alert(1)'],
    ['\u0001javascript:alert(1)'],
    ['\u0000javascript:alert(1)'],
    ['javascript:alert(1)'],
    ['JAVASCRIPT:alert(1)'],
    [' vbscript:msgbox(1)'],
    ['file:///etc/passwd'],
  ])('rejects %j (resolves to a non-allowlisted scheme)', (url) => {
    expect(isSafeNavigationUrl(url)).toBe(false);
  });

  it.each([['/x'], ['#a'], ['?q=1'], ['./y'], ['plain'], ['//cdn.example.com/x'], ['https://example.com/a?b=1'], ['http://example.com']])(
    'accepts relative or http(s) URL %j',
    (url) => {
      expect(isSafeNavigationUrl(url)).toBe(true);
    },
  );

  it.each([['mailto:a@example.com'], ['tel:+123'], ['data:text/plain,hello']])('keeps allowlisted scheme %j', (url) => {
    expect(isSafeNavigationUrl(url)).toBe(true);
  });

  it('allows blob: only for download anchors', () => {
    expect(isSafeNavigationUrl('blob:https://example.com/uuid')).toBe(false);
    expect(isSafeNavigationUrl('blob:https://example.com/uuid', { download: true })).toBe(true);
    expect(isSafeNavigationUrl(' javascript:alert(1)', { download: true })).toBe(false);
  });

  it('fails closed on input the URL parser cannot resolve', () => {
    expect(isSafeNavigationUrl('http://[')).toBe(false);
  });
});
