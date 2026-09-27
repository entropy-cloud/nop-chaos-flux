/**
 * 表达式模板校验（S3-3 formula adapter 的纯逻辑面）。
 *
 * 复用 `flux-formula` 的 `createFormulaCompiler().compileTemplate` —— 与
 * flux-code-editor expression linter 同一编译引擎（design §11.2「formula 编辑器
 * 复用」的依赖出清形态：取 formula 面而非拖入 CodeMirror）。非模板纯字符串
 * 不校验（合法原样值）；含 `${...}` 的模板整段编译，语法错误返回消息，
 * 合法返回 `null`。
 */

import { createFormulaCompiler } from '@nop-chaos/flux-formula';

const formulaCompiler = createFormulaCompiler();

/** 错误 → 消息（非 Error 抛出物也保底成字符串）。 */
export function toExpressionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 校验 `${...}` 表达式模板。返回 `null` = 合法（或非模板原样值）；否则为错误消息。 */
export function validateExpressionTemplate(value: string): string | null {
  if (!value.includes('${')) return null;
  try {
    formulaCompiler.compileTemplate(value);
    return null;
  } catch (error: unknown) {
    return toExpressionErrorMessage(error);
  }
}

/** 值是否携带表达式段（面板据此区分「原样字符串」与「表达式模板」展示态）。 */
export function hasExpressionSegment(value: string): boolean {
  return formulaCompiler.hasExpression(value);
}
