import type { ExpressionCompiler, FormulaCompiler } from '@nop-chaos/flux-core';
export declare function createFormulaCompiler(): FormulaCompiler;
export declare function createExpressionCompiler(formulaCompiler?: FormulaCompiler): ExpressionCompiler;
