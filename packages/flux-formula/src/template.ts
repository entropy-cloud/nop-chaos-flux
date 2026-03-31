function countBraceDepth(source: string, startIndex: number): { depth: number; endIndex: number } {
  let depth = 1;
  let j = startIndex;
  let inString: string | null = null;

  while (j < source.length && depth > 0) {
    const ch = source[j];
    if (inString) {
      if (ch === '\\' && j + 1 < source.length) {
        j += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    }
    j++;
  }

  return { depth, endIndex: j };
}

function normalizeExpressionSource(source: string): string {
  const trimmed = source.trim();
  const directMatch = /^\$\{([\s\S]+)\}$/.exec(trimmed);

  if (directMatch) {
    return directMatch[1].trim();
  }

  return trimmed;
}

function isPureExpression(source: string): boolean {
  if (!source.startsWith('${')) {
    return false;
  }

  const { depth, endIndex } = countBraceDepth(source, 2);

  return depth === 0 && endIndex === source.length;
}

function parseTemplateSegments(source: string): Array<{ type: 'text' | 'expr'; value: string }> {
  const segments: Array<{ type: 'text' | 'expr'; value: string }> = [];
  let i = 0;

  while (i < source.length) {
    const exprStart = source.indexOf('${', i);
    if (exprStart === -1) {
      if (i < source.length) {
        segments.push({ type: 'text', value: source.slice(i) });
      }
      break;
    }

    if (exprStart > i) {
      segments.push({ type: 'text', value: source.slice(i, exprStart) });
    }

    const { depth, endIndex: j } = countBraceDepth(source, exprStart + 2);

    if (depth === 0) {
      const exprContent = source.slice(exprStart + 2, j - 1).trim();
      segments.push({ type: 'expr', value: exprContent });
      i = j;
    } else {
      segments.push({ type: 'text', value: source.slice(exprStart) });
      break;
    }
  }

  return segments;
}

export { normalizeExpressionSource, isPureExpression, parseTemplateSegments };
