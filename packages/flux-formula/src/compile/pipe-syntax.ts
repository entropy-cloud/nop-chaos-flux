function isPipeBoundary(source: string, index: number): boolean {
  const current = source[index];
  const previous = source[index - 1];
  const next = source[index + 1];

  if (current !== '|') {
    return false;
  }

  if (previous === '|' || next === '|' || previous === undefined || next === undefined) {
    return false;
  }

  return true;
}

function splitFilterArgs(source: string): string[] {
  const args: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];

    if (quote) {
      if (current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === '(' || current === '[' || current === '{') {
      depth += 1;
      continue;
    }

    if (current === ')' || current === ']' || current === '}') {
      depth -= 1;
      continue;
    }

    if (current === ':' && depth === 0) {
      args.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  args.push(source.slice(start).trim());
  return args.filter((item) => item.length > 0);
}

function isFilterIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(value);
}

function parseTopLevelFilterSegments(source: string): string[] | null {
  const segments: string[] = [];
  let start = 0;
  let quote: string | undefined;
  let depth = 0;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];

    if (quote) {
      if (current === '\\') {
        index += 1;
        continue;
      }
      if (current === quote) {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === '(' || current === '[' || current === '{') {
      depth += 1;
      continue;
    }

    if (current === ')' || current === ']' || current === '}') {
      depth -= 1;
      continue;
    }

    if (depth === 0 && isPipeBoundary(source, index)) {
      segments.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  if (segments.length === 0) {
    return null;
  }

  segments.push(source.slice(start).trim());
  return segments;
}

function rewriteFilterPipeSyntax(source: string): string {
  const segments = parseTopLevelFilterSegments(source);
  if (!segments) {
    return source;
  }

  let rewritten = segments[0];
  for (const segment of segments.slice(1)) {
    const [filterName, ...argParts] = splitFilterArgs(segment);
    if (!filterName || !isFilterIdentifier(filterName)) {
      return source;
    }

    const args = [rewritten, ...argParts].join(', ');
    rewritten = `${filterName}(${args})`;
  }

  return rewritten;
}

export { rewriteFilterPipeSyntax };
