import { describe, expect, it } from 'vitest';
import { asyncFailureRules } from '../audit/rules.mjs';

const rule = asyncFailureRules.find((candidate) => candidate.id === 'catch-without-structured-failure-path');

function scan(content: string) {
  return rule.scanWithContent({ rule, relativePath: 'packages/demo/src/demo.ts', content });
}

describe('catch-without-structured-failure-path', () => {
  it('accepts the repo canonical reporting channel reportRuntimeHostIssue', () => {
    const content = [
      'async function run() {',
      '  try {',
      '    await work();',
      '  } catch (error) {',
      '    reportRuntimeHostIssue({ env, error, phase: "action" });',
      '  }',
      '}',
    ].join('\n');
    expect(scan(content)).toEqual([]);
  });

  it('still flags a catch that only logs', () => {
    const content = ['try {', '  work();', '} catch (error) {', '  console.log(error);', '}'].join('\n');
    expect(scan(content)).toHaveLength(1);
  });

  it('still flags an empty catch and does not count a channel name mentioned only in a comment', () => {
    const empty = ['try {', '  work();', '} catch {', '}'].join('\n');
    expect(scan(empty)).toHaveLength(1);
    const commentOnly = ['try {', '  work();', '} catch (error) {', '  // reportRuntimeHostIssue later', '}'].join('\n');
    expect(scan(commentOnly)).toHaveLength(1);
  });
});
