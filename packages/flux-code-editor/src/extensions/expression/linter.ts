import type { Extension } from '@codemirror/state';
import { linter, type Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import type { ExpressionLintConfig } from '../../types';

const PREFIX = 'return (';
const PREFIX_LEN = PREFIX.length;

function lintExpression(view: EditorView): Diagnostic[] {
  const doc = view.state.doc;
  const expr = doc.toString();

  if (!expr.trim()) return [];

  try {
    new Function(PREFIX + expr + ')');
    return [];
  } catch (err: any) {
    const message = err instanceof SyntaxError ? err.message : String(err);

    let from = 0;
    let to = expr.length;

    const posMatch = message.match(/position\s+(\d+)/);
    if (posMatch) {
      const reportedPos = Number(posMatch[1]) - PREFIX_LEN;
      if (reportedPos >= 0 && reportedPos <= expr.length) {
        from = reportedPos;
        to = Math.min(reportedPos + 1, expr.length);
      }
    }

    if (from >= to) from = 0;

    return [
      {
        from,
        to,
        severity: 'error',
        message,
        source: 'expression-lint',
      },
    ];
  }
}

export function createExpressionLinter(config?: boolean | ExpressionLintConfig): Extension {
  const obj = typeof config === 'object' ? config : undefined;
  const debounceMs = obj?.debounceMs ?? 300;
  return linter(lintExpression, { delay: debounceMs });
}
