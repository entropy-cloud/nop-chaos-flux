import type { Extension } from '@codemirror/state';
import { linter, type Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { ExpressionLintConfig } from '../../types';

const formulaCompiler = createFormulaCompiler();

function lintExpression(view: EditorView): Diagnostic[] {
  const doc = view.state.doc;
  const expr = doc.toString();

  if (!expr.trim()) return [];

  try {
    formulaCompiler.compileExpression(expr);
    return [];
  } catch (err: any) {
    const message = err instanceof SyntaxError ? err.message : String(err);
    const from = 0;
    const to = expr.length;

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
