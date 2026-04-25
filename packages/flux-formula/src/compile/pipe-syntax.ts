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

function rewriteFilterPipeSyntax(source: string): string {
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
      const left = source.slice(0, index).trim();
      const right = source.slice(index + 1).trim();
      const [filterName, ...argParts] = splitFilterArgs(right);
      if (!filterName) {
        return source;
      }
      const args = [left, ...argParts].join(', ');
      return `${filterName}(${args})`;
    }
  }

  return source;
}

export { rewriteFilterPipeSyntax };
