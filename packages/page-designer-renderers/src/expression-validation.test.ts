/**
 * 表达式模板校验测试（S3-3）：合法模板/纯字符串 → null、语法错误 → 消息、
 * 与 flux-formula 同引擎（createFormulaCompiler.compileTemplate）。
 */

import { describe, expect, it } from 'vitest';
import { hasExpressionSegment, toExpressionErrorMessage, validateExpressionTemplate } from './expression-validation.js';

describe('toExpressionErrorMessage', () => {
  it('unwraps Error messages and stringifies other throwables', () => {
    expect(toExpressionErrorMessage(new Error('boom'))).toBe('boom');
    expect(toExpressionErrorMessage('raw string')).toBe('raw string');
    expect(toExpressionErrorMessage(42)).toBe('42');
  });
});

describe('validateExpressionTemplate', () => {
  it('accepts valid expression templates', () => {
    expect(validateExpressionTemplate('${users.name}')).toBeNull();
    expect(validateExpressionTemplate('${a.b} - ${c.d + 1}')).toBeNull();
    expect(validateExpressionTemplate('${doUppercase(users.name)}')).toBeNull();
  });

  it('accepts plain strings without expression segments (passthrough, no validation)', () => {
    expect(validateExpressionTemplate('plain text')).toBeNull();
    expect(validateExpressionTemplate('')).toBeNull();
    expect(validateExpressionTemplate('$ { not an expression')).toBeNull();
  });

  it('rejects syntax errors with the compiler message', () => {
    expect(validateExpressionTemplate('${users.name +}')).toMatch(/Unexpected token/);
    expect(validateExpressionTemplate('${}')).toMatch(/Unexpected token/);
    expect(validateExpressionTemplate('${a.b} trailing ${oops +}')).toMatch(/Unexpected token/);
  });

  it('hasExpressionSegment distinguishes template vs plain values', () => {
    expect(hasExpressionSegment('${a.b}')).toBe(true);
    expect(hasExpressionSegment('plain')).toBe(false);
  });
});
