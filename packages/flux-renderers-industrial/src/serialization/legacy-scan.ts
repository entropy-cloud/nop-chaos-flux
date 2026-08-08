import { isPlainObject, MAX_VALIDATE_DEPTH } from './validators/helpers.js';

/** I18 迁移期：检测旧 `@{pointId}` 方言表达式，warn（不 fail）+ 错误码 `legacy-at-syntax`。 */
const LEGACY_AT_PATTERN = /@\{[^}]*\}?/;

/**
 * 扫描 config 中的旧 `@{pointId}` 方言表达式（I18 迁移期 warn）。
 * 命中位置：variables[].expression / variables[].scale.expression / symbols[].bindings[].expression /
 * symbols[].bindings[].scale.expression。warn 文案含错误码 + 位置 + codemod 指引。
 *
 * plan 2026-08-06-0900-1 P2-5：symbols 扫描递归 `scada-group` children（镜像 `validateSymbolNode` 的
 * children 遍历）——组态最典型形态（group 嵌套子图元 bindings 内的 `@{pointId}` 方言）不再静默不 warn。
 */
export function scanLegacyAtSyntax(config: Record<string, unknown>, warnings: string[]): void {
  const variables = config.variables;
  if (Array.isArray(variables)) {
    variables.forEach((decl, index) => {
      if (!isPlainObject(decl)) return;
      const expression = decl.expression;
      if (typeof expression === 'string' && LEGACY_AT_PATTERN.test(expression)) {
        warnings.push(
          `legacy-at-syntax: variables[${index}].expression uses deprecated '@{pointId}' dialect; run scripts/scada-expression-codemod.mjs to migrate to '${expression.replace(/@\{([^}]*)\}?/g, '\\${$1}')}'`,
        );
      }
      const scale = decl.scale;
      if (isPlainObject(scale) && typeof scale.expression === 'string' && LEGACY_AT_PATTERN.test(scale.expression)) {
        warnings.push(
          `legacy-at-syntax: variables[${index}].scale.expression uses deprecated '@{pointId}' dialect; run scripts/scada-expression-codemod.mjs to migrate`,
        );
      }
    });
  }
  const symbols = config.symbols;
  if (Array.isArray(symbols)) {
    symbols.forEach((node, sIndex) => {
      scanSymbolLegacy(node, `symbols[${sIndex}]`, warnings);
    });
  }
}

function scanSymbolLegacy(node: unknown, scope: string, warnings: string[], depth = 0): void {
  // plan 2026-08-06-0900-1 P2-9：与 validateSymbolNode 对称的深度上限 fail-closed，防深嵌套 stack overflow。
  if (depth > MAX_VALIDATE_DEPTH) return;
  if (!isPlainObject(node)) return;
  const bindings = (node as Record<string, unknown>).bindings;
  if (isPlainObject(bindings)) {
    for (const [prop, binding] of Object.entries(bindings)) {
      if (!isPlainObject(binding)) continue;
      const expression = binding.expression;
      if (typeof expression === 'string' && LEGACY_AT_PATTERN.test(expression)) {
        warnings.push(
          `legacy-at-syntax: ${scope}.bindings.${prop}.expression uses deprecated '@{pointId}' dialect; run scripts/scada-expression-codemod.mjs to migrate`,
        );
      }
      const scale = binding.scale;
      if (isPlainObject(scale) && typeof scale.expression === 'string' && LEGACY_AT_PATTERN.test(scale.expression)) {
        warnings.push(
          `legacy-at-syntax: ${scope}.bindings.${prop}.scale.expression uses deprecated '@{pointId}' dialect; run scripts/scada-expression-codemod.mjs to migrate`,
        );
      }
    }
  }
  const children = (node as Record<string, unknown>).children;
  if (Array.isArray(children)) {
    children.forEach((child, index) => {
      scanSymbolLegacy(child, `${scope}.children[${index}]`, warnings, depth + 1);
    });
  }
}
