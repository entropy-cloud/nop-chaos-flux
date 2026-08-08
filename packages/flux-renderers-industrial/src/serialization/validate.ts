import { hasScadaSymbol } from '../symbols/symbol-registry.js';
import { scanLegacyAtSyntax } from './legacy-scan.js';
import { assertShape, checkNumberField, isPlainObject } from './validators/helpers.js';
import { validatePointDeclaration, validateSymbolNode } from './validators/index.js';

export type ScadaValidationResult =
  | { ok: true; warnings?: string[] }
  | { ok: false; errors: string[]; warnings?: string[] };

export function validateScadaConfig(
  json: unknown,
  isKnownType: (type: string) => boolean = hasScadaSymbol,
): ScadaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isPlainObject(json)) {
    return { ok: false, errors: ['scada config must be an object'] };
  }
  const config = json as Record<string, unknown>;
  if (config.version !== 1) {
    errors.push('config.version must be 1');
  }
  if (!Array.isArray(config.symbols)) {
    errors.push('config.symbols must be an array');
  } else {
    const seenSymbolIds = new Set<string>();
    config.symbols.forEach((node, index) => {
      validateSymbolNode(node, seenSymbolIds, errors, `symbols[${index}]`, isKnownType);
    });
  }
  if (config.variables !== undefined) {
    if (!Array.isArray(config.variables)) {
      errors.push('config.variables must be an array');
    } else {
      const seenPointIds = new Set<string>();
      config.variables.forEach((decl, index) => {
        validatePointDeclaration(decl, seenPointIds, errors, `variables[${index}]`);
      });
    }
  }
  if (config.viewport !== undefined) {
    if (!isPlainObject(config.viewport)) {
      errors.push('config.viewport must be an object');
    } else {
      for (const field of ['x', 'y', 'scale']) {
        checkNumberField(config.viewport as Record<string, unknown>, field, errors, 'viewport');
      }
    }
  }
  if (config.background !== undefined && !isPlainObject(config.background)) {
    errors.push('config.background must be an object');
  } else if (config.background !== undefined) {
    // plan 2026-08-06-0900-1 P2-6：background 子形状校验（color 非字符串 malformed 全过）。
    assertShape(config.background as Record<string, unknown>, { color: 'string' }, 'background', errors);
    // HCA4-P3-2：background.grid 子形状（{size:number;color:string}）未校验——malformed grid 旧实现静默放行。
    const grid = (config.background as Record<string, unknown>).grid;
    if (grid !== undefined) {
      if (!isPlainObject(grid)) {
        errors.push('background.grid must be an object');
      } else {
        assertShape(grid as Record<string, unknown>, { size: 'number', color: 'string' }, 'background.grid', errors);
      }
    }
  }

  // I18 表达式一元化迁移期：扫描旧 `@{pointId}` 方言，warn（不 fail）。
  // 错误码 `legacy-at-syntax`，指向迁移 codemod（scripts/scada-expression-codemod.mjs）。
  scanLegacyAtSyntax(config, warnings);

  if (errors.length > 0) return { ok: false, errors, warnings: warnings.length > 0 ? warnings : undefined };
  return warnings.length > 0 ? { ok: true, warnings } : { ok: true };
}
