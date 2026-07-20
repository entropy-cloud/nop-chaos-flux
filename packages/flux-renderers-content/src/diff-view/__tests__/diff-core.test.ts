import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff, parseToDiffFile } from '../model/diff-parse.js';
import { computeInlineDiff, computeInlineTokensForLine } from '../model/diff-inline.js';
import { computeDiffStats } from '../utils/diff-stats.js';

describe('parseUnifiedDiff', () => {
  it('parses a simple unified diff', () => {
    const input = `--- a/file.txt
+++ b/file.txt
@@ -1,3 +1,4 @@
 line1
-line2
+line2-modified
+line3
 line4`;
    const result = parseUnifiedDiff(input);
    expect(result).toHaveLength(1);
    expect(result[0].oldFileName).toBe('a/file.txt');
    expect(result[0].newFileName).toBe('b/file.txt');
    expect(result[0].hunks).toHaveLength(1);
    const hunk = result[0].hunks[0];
    expect(hunk.lines).toHaveLength(5);
    expect(hunk.lines[0].type).toBe('context');
    expect(hunk.lines[0].content).toBe('line1');
    expect(hunk.lines[1].type).toBe('delete');
    expect(hunk.lines[1].content).toBe('line2');
    expect(hunk.lines[2].type).toBe('add');
    expect(hunk.lines[2].content).toBe('line2-modified');
    expect(hunk.lines[3].type).toBe('add');
    expect(hunk.lines[3].content).toBe('line3');
    expect(hunk.lines[4].type).toBe('context');
    expect(hunk.lines[4].content).toBe('line4');
  });

  it('handles empty input', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff(null as unknown as string)).toEqual([]);
  });

  it('parses line number mapping correctly', () => {
    const input = `@@ -5,3 +7,2 @@
 context
+added
-removed`;
    const result = parseUnifiedDiff(input);
    const lines = result[0].hunks[0].lines;
    expect(lines).toHaveLength(3);
    expect(lines[0].oldLineNum).toBe(5);
    expect(lines[0].newLineNum).toBe(7);
    expect(lines[1].oldLineNum).toBeUndefined();
    expect(lines[1].newLineNum).toBe(8);
    expect(lines[2].oldLineNum).toBe(6);
    expect(lines[2].newLineNum).toBeUndefined();
  });

  it('parses non-diff input as simple file', () => {
    const result = parseToDiffFile('hello\nworld');
    expect(result.hunks).toHaveLength(1);
    expect(result.hunks[0].lines).toHaveLength(2);
    expect(result.hunks[0].lines[0].type).toBe('context');
    expect(result.hunks[0].lines[0].content).toBe('hello');
  });

  it('handles diff with git headers', () => {
    const input = `diff --git a/old.ts b/new.ts
index abc..def 100644
--- a/old.ts
+++ b/new.ts
@@ -1,2 +1,3 @@
 ok
+new-line
 fine`;
    const result = parseUnifiedDiff(input);
    expect(result).toHaveLength(1);
    expect(result[0].oldFileName).toBe('a/old.ts');
    expect(result[0].newFileName).toBe('b/new.ts');
  });
});

describe('computeInlineDiff', () => {
  it('returns equal tokens for identical text', () => {
    const tokens = computeInlineDiff('hello world', 'hello world');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('equal');
  });

  it('detects insertions', () => {
    const tokens = computeInlineDiff('abc', 'abcdef');
    const hasInsert = tokens.some((t) => t.type === 'insert');
    expect(hasInsert).toBe(true);
  });

  it('detects deletions', () => {
    const tokens = computeInlineDiff('abcdef', 'abc');
    const hasDelete = tokens.some((t) => t.type === 'delete');
    expect(hasDelete).toBe(true);
  });

  it('handles empty old text as insertion', () => {
    const tokens = computeInlineDiff('', 'test');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('insert');
    expect(tokens[0].text).toBe('test');
  });
});

describe('computeInlineTokensForLine', () => {
  it('returns inline tokens for an add line', () => {
    const tokens = computeInlineTokensForLine('fix', 'fixed', 'add');
    const hasInsert = tokens.some((t) => t.type === 'insert');
    expect(hasInsert).toBe(true);
  });

  it('returns inline tokens for a delete line', () => {
    const tokens = computeInlineTokensForLine('fixed', 'fix', 'delete');
    const hasDelete = tokens.some((t) => t.type === 'delete');
    expect(hasDelete).toBe(true);
  });
});

describe('computeDiffStats', () => {
  it('counts added and removed lines', () => {
    const input = `--- a/file.txt
+++ b/file.txt
@@ -1,4 +1,4 @@
 line1
-line2
+line3
 line4`;
    const file = parseToDiffFile(input);
    const stats = computeDiffStats(file);
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
    expect(stats.total).toBe(4);
  });

  it('returns zeros for empty hunks', () => {
    const file = parseToDiffFile('');
    const stats = computeDiffStats(file);
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });
});
