import { isBacktrackingSafePattern } from '@nop-chaos/flux-core';
import type { NopDebugEvent } from './types.js';

function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

export function parseRegexLiteral(input: string): RegExp | null {
  const match = /^\/(.*)\/([a-z]*)$/.exec(input.trim());
  // security R7 (plan 861): a typed pattern is compiled only when it cannot
  // backtrack super-linearly; refused literals fall back to text matching.
  if (!match || !isBacktrackingSafePattern(match[1])) {
    return null;
  }

  try {
    return new RegExp(match[1], match[2]);
  } catch {
    return null;
  }
}

function matchesRegex(event: NopDebugEvent, regex: RegExp): boolean {
  return [
    event.summary,
    event.detail,
    event.source,
    event.nodeId,
    event.path,
    event.requestKey,
  ].some((value) => value != null && regex.test(value));
}

export function matchesSearchQuery(event: NopDebugEvent, rawQuery: string): boolean {
  const query = rawQuery.trim();
  if (!query) {
    return true;
  }

  if (query.startsWith('path:')) {
    const pathQuery = query.slice(5).trim();
    if (!pathQuery) {
      return true;
    }

    const pathRegex = parseRegexLiteral(pathQuery);
    if (pathRegex) {
      return pathRegex.test(event.path ?? '');
    }

    return includesText(event.path, pathQuery);
  }

  const regex = parseRegexLiteral(query);
  if (regex) {
    return matchesRegex(event, regex);
  }

  return (
    includesText(event.summary, query) ||
    includesText(event.detail, query) ||
    includesText(event.source, query) ||
    includesText(event.nodeId, query) ||
    includesText(event.path, query) ||
    includesText(event.requestKey, query)
  );
}
