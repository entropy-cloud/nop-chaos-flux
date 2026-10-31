/**
 * Backtracking-safety gate for regular expressions supplied by schema authors
 * or end users (validation `pattern`, barcode `pattern`, spreadsheet regex
 * search). Every sink that compiles such a pattern must consult this single
 * predicate before `new RegExp(...)`. See
 * `docs/architecture/security-design-requirements.md`.
 *
 * A pattern is rejected when it can backtrack super-linearly:
 *
 * - exponential: a group followed by an unbounded (`*`, `+`, `{n,}`) or wide
 *   (`{n,m}` with m - n >= 10) quantifier whose body contains alternation or a
 *   variable-width quantifier, at any nesting depth (`^(?:a|aa)+$`,
 *   `(a|ab)*c`, `((a+))+`, `(a{1,})+`, `(\w+\s?)*$`);
 * - polynomial: two directly adjacent unbounded-quantified atoms
 *   (`.*.*`, `\d+\d*`, `[a-z]+[a-z]+`), or three or more unbounded `.`
 *   wildcards (`.+a.+b.+c`).
 *
 * Linear patterns stay accepted, including quantified classes separated by
 * literals (`^[^@]+@[^@]+\.[^@]+$`), a single wildcard (`^.+@.+$`) and
 * fixed-width repeats (`\d{6}`, `(\d{3}){2}`).
 */

interface GroupFrame {
  alternation: boolean;
  variableQuantifier: boolean;
  previousAtomUnbounded: boolean;
}

interface QuantifierInfo {
  length: number;
  unbounded: boolean;
  variable: boolean;
  wide: boolean;
}

const WIDE_BOUNDED_SPAN = 10;
const MAX_UNBOUNDED_WILDCARDS = 2;

function readQuantifier(pattern: string, index: number): QuantifierInfo | null {
  const char = pattern[index];
  let info: QuantifierInfo | null = null;
  if (char === '*' || char === '+') {
    info = { length: 1, unbounded: true, variable: true, wide: true };
  } else if (char === '?') {
    info = { length: 1, unbounded: false, variable: true, wide: false };
  } else if (char === '{') {
    const match = /^\{(\d+)(,(\d*))?\}/.exec(pattern.slice(index));
    if (!match) {
      return null;
    }
    const min = Number(match[1]);
    const max = match[2] === undefined ? min : match[3] === '' ? Infinity : Number(match[3]);
    info = {
      length: match[0].length,
      unbounded: max === Infinity,
      variable: max !== min,
      wide: max - min >= WIDE_BOUNDED_SPAN,
    };
  }
  if (info && pattern[index + info.length] === '?') {
    info.length += 1;
  }
  return info;
}

function groupPrefixLength(pattern: string, index: number): number {
  if (pattern[index + 1] !== '?') {
    return 1;
  }
  const rest = pattern.slice(index + 2);
  if (rest.startsWith(':') || rest.startsWith('=') || rest.startsWith('!')) {
    return 3;
  }
  if (rest.startsWith('<=') || rest.startsWith('<!')) {
    return 4;
  }
  const named = /^<[^>]*>/.exec(rest);
  return named ? 2 + named[0].length : 2;
}

function atomLength(pattern: string, index: number): number {
  if (pattern[index] === '\\') {
    return 2;
  }
  if (pattern[index] !== '[') {
    return 1;
  }
  let cursor = index + 1;
  if (pattern[cursor] === '^') cursor += 1;
  if (pattern[cursor] === ']') cursor += 1;
  while (cursor < pattern.length && pattern[cursor] !== ']') {
    cursor += pattern[cursor] === '\\' ? 2 : 1;
  }
  return cursor + 1 - index;
}

function createFrame(): GroupFrame {
  return { alternation: false, variableQuantifier: false, previousAtomUnbounded: false };
}

function recordQuantifiedAtom(frame: GroupFrame, quantifier: QuantifierInfo | null): boolean {
  const unbounded = Boolean(quantifier?.unbounded);
  const adjacent = unbounded && frame.previousAtomUnbounded;
  frame.previousAtomUnbounded = unbounded;
  return adjacent;
}

export function isBacktrackingSafePattern(pattern: string): boolean {
  const stack: GroupFrame[] = [createFrame()];
  let unboundedWildcards = 0;
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index];
    const frame = stack[stack.length - 1];

    if (char === '|') {
      frame.alternation = true;
      frame.previousAtomUnbounded = false;
      index += 1;
      continue;
    }
    if (char === '(') {
      stack.push(createFrame());
      index += groupPrefixLength(pattern, index);
      continue;
    }
    if (char === ')') {
      const group = stack.length > 1 ? stack.pop()! : createFrame();
      const parent = stack[stack.length - 1];
      const quantifier = readQuantifier(pattern, index + 1);
      if (quantifier?.wide && (group.alternation || group.variableQuantifier)) {
        return false;
      }
      parent.alternation ||= group.alternation;
      parent.variableQuantifier ||= group.variableQuantifier || Boolean(quantifier?.variable);
      if (recordQuantifiedAtom(parent, quantifier)) {
        return false;
      }
      index += 1 + (quantifier?.length ?? 0);
      continue;
    }

    const length = atomLength(pattern, index);
    const quantifier = readQuantifier(pattern, index + length);
    if (quantifier?.variable) {
      frame.variableQuantifier = true;
    }
    if (char === '.' && quantifier?.unbounded) {
      unboundedWildcards += 1;
      if (unboundedWildcards > MAX_UNBOUNDED_WILDCARDS) {
        return false;
      }
    }
    if (recordQuantifiedAtom(frame, quantifier)) {
      return false;
    }
    index += length + (quantifier?.length ?? 0);
  }
  return true;
}
