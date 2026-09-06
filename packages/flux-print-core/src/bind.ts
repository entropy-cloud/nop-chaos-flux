import type { EvalContext, FormulaCompiler, RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  PrintElementSchema,
  PrintTableColumn,
  PrintTemplateSchema,
  PrintValueFormat,
} from './schemas.js';
import type { PrintDiagnostic } from './validate.js';

export interface BindPrintContext {
  /** $page 外部注入（P3 layout 分页后提供真实值；bind 只透传）。 */
  page?: number;
  pages?: number;
  env?: RendererEnv;
  now?: Date;
}

export type BoundPrintElement = PrintElementSchema & {
  /** text/pageNumber/printDate 的绑定结果。 */
  text?: string;
  /** table 按行绑定结果：列 label → 已格式化单元格文本。 */
  boundRows?: Array<Record<string, string>>;
  /** table 原始数据行（分页聚合按 field 取值用）。 */
  sourceRows?: Array<Record<string, unknown>>;
};

export interface BoundPrintTemplate extends Omit<PrintTemplateSchema, 'elements'> {
  elements: BoundPrintElement[];
}

export interface BindPrintTemplateResult {
  template: BoundPrintTemplate;
  diagnostics: PrintDiagnostic[];
}

let cachedDefaultEnv: RendererEnv | undefined;

function getDefaultEnv(): RendererEnv {
  if (!cachedDefaultEnv) {
    cachedDefaultEnv = {
      fetcher: async function <T>() {
        return { status: 0, data: null as T };
      },
      notify: () => {},
    };
  }
  return cachedDefaultEnv;
}

export function resolveDataPath(scope: Record<string, unknown>, path: string): unknown {
  if (path in scope) return scope[path];
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, scope);
}

function createEvalContext(scope: Record<string, unknown>): EvalContext {
  return {
    resolve(path) {
      return resolveDataPath(scope, path);
    },
    has(path) {
      return resolveDataPath(scope, path) !== undefined;
    },
    materialize() {
      return scope;
    },
  };
}

interface InterpolateResult {
  value: string;
  syntaxError: boolean;
  evalError: boolean;
  missingPaths: string[];
  compileMessage?: string;
  evalMessage?: string;
}

function interpolate(
  compiler: FormulaCompiler,
  source: string,
  scope: Record<string, unknown>,
  env: RendererEnv,
): InterpolateResult {
  if (typeof source !== 'string' || !source.includes('${')) {
    return { value: source ?? '', syntaxError: false, evalError: false, missingPaths: [] };
  }

  const missingPaths: string[] = [];
  const evalEnv: RendererEnv = {
    ...env,
    onUndefinedVariable: (info) => {
      missingPaths.push(info.variableName);
    },
  };

  let compiled;
  try {
    compiled = compiler.compileTemplate<string>(source);
  } catch (error) {
    return {
      value: '',
      syntaxError: true,
      evalError: false,
      missingPaths,
      compileMessage: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    return {
      value: compiled.exec(createEvalContext(scope), evalEnv),
      syntaxError: false,
      evalError: false,
      missingPaths,
    };
  } catch (error) {
    return { value: '', syntaxError: false, evalError: true, missingPaths, evalMessage: error instanceof Error ? error.message : String(error) };
  }
}

function formatPrintDate(date: Date, format: string): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return format
    .replace(/YYYY/g, pad(date.getFullYear(), 4))
    .replace(/MM/g, pad(date.getMonth() + 1))
    .replace(/DD/g, pad(date.getDate()))
    .replace(/HH/g, pad(date.getHours()))
    .replace(/mm/g, pad(date.getMinutes()))
    .replace(/ss/g, pad(date.getSeconds()));
}

export function formatPrintValue(value: unknown, format: PrintValueFormat | undefined): string {
  if (format === undefined) {
    return value == null ? '' : String(value);
  }
  let text: string;
  switch (format.type) {
    case 'number':
    case 'currency': {
      const numeric = Number(value);
      text = Number.isFinite(numeric) ? numeric.toFixed(format.digits ?? 0) : String(value ?? '');
      break;
    }
    case 'boolean':
      text = value ? (format.trueText ?? 'true') : (format.falseText ?? 'false');
      break;
    case 'date':
      text = value instanceof Date ? formatPrintDate(value, format.dateFormat ?? 'YYYY-MM-DD') : String(value ?? '');
      break;
    default:
      text = value == null ? '' : String(value);
  }
  return `${format.prefix ?? ''}${text}${format.suffix ?? ''}`;
}

export function bindPrintTemplate(
  template: PrintTemplateSchema,
  data: Record<string, unknown>,
  context: BindPrintContext = {},
): BindPrintTemplateResult {
  const compiler = createFormulaCompiler();
  const env = context.env ?? getDefaultEnv();
  const diagnostics: PrintDiagnostic[] = [];
  const now = context.now ?? new Date();

  const baseScope: Record<string, unknown> = {
    ...data,
    $page: context.page ?? 1,
    $pages: context.pages ?? 1,
  };

  const bindColumnCell = (
    column: PrintTableColumn,
    rowScope: Record<string, unknown>,
    rowValue: unknown,
  ): string => {
    try {
      if (column.field) {
        const row = rowValue;
        const cellValue =
          row != null && typeof row === 'object'
            ? resolveDataPath(row as Record<string, unknown>, column.field)
            : undefined;
        return formatPrintValue(cellValue, column.format);
      }
      if (column.text) {
        return interpolate(compiler, column.text, rowScope, env).value;
      }
      return formatPrintValue(rowValue, column.format);
    } catch (error) {
      cellErrors.push(`单元格求值失败：${column.label}（${error instanceof Error ? error.message : String(error)}）`);
      return '';
    }
  };

  const cellErrors: string[] = [];
  const elements: BoundPrintElement[] = template.elements.map((element): BoundPrintElement => {
    const elementScope = baseScope;

    if (element.type === 'text') {
      const source = element.field ? `\${${element.field}}` : element.text;
      const result = interpolate(compiler, source, elementScope, env);
      if (result.syntaxError) {
        diagnostics.push({
          level: 'error',
          code: 'PRINT_BIND_SYNTAX',
          message: `表达式语法错误：${source}${result.compileMessage ? `（${result.compileMessage}）` : ''}`,
          elementId: element.id,
        });
      } else {
        if (result.evalError && result.missingPaths.length === 0) {
          diagnostics.push({
            level: 'error',
            code: 'PRINT_BIND_EVAL',
            message: `表达式求值失败：${source}${result.evalMessage ? `（${result.evalMessage}）` : ''}`,
            elementId: element.id,
          });
        }
        // 同元素同 code 去重（identifier+member 访问会触发两次 undefined 回调）
        if (result.missingPaths.length > 0 && !diagnostics.some((d) => d.code === 'PRINT_BIND_PATH_MISSING' && d.elementId === element.id)) {
          diagnostics.push({
            level: 'warning',
            code: 'PRINT_BIND_PATH_MISSING',
            message: `绑定路径不可达：${[...new Set(result.missingPaths)].join('、')}`,
            elementId: element.id,
          });
        }
      }
      return { ...element, text: result.value };
    }

    if (element.type === 'image') {
      return {
        ...element,
        src: element.field
          ? interpolate(compiler, `\${${element.field}}`, elementScope, env).value
          : element.src,
      };
    }

    if (element.type === 'barcode' || element.type === 'qrcode') {
      return {
        ...element,
        value: element.field
          ? interpolate(compiler, `\${${element.field}}`, elementScope, env).value
          : (element.value ?? ''),
      };
    }

    if (element.type === 'table') {
      let rows: Array<Record<string, unknown>> = [];
      // review F4：compile/exec 两段 try——compile 期 → SYNTAX，exec 期 → EVAL
      let sourceCompiled;
      try {
        sourceCompiled = compiler.compileExpression<unknown>(element.source);
      } catch (error) {
        diagnostics.push({
          level: 'error',
          code: 'PRINT_BIND_SYNTAX',
          message: `table source 表达式非法：${element.source}（${error instanceof Error ? error.message : String(error)}）`,
          elementId: element.id,
        });
        sourceCompiled = undefined;
      }
      if (sourceCompiled !== undefined) {
        try {
          const evaluated = sourceCompiled.exec(createEvalContext(elementScope), env);
          if (Array.isArray(evaluated)) {
            rows = evaluated;
          } else {
            diagnostics.push({
              level: 'warning',
              code: 'PRINT_BIND_SOURCE_NOT_ARRAY',
              message: `table source 求值结果不是数组：${element.source}`,
              elementId: element.id,
            });
          }
        } catch (error) {
          diagnostics.push({
            level: 'error',
            code: 'PRINT_BIND_EVAL',
            message: `table source 求值失败：${element.source}（${error instanceof Error ? error.message : String(error)}）`,
            elementId: element.id,
          });
        }
      }

      const boundRows = rows.map((row, rowIndex) => {
        const rowScope: Record<string, unknown> = {
          ...elementScope,
          $row: row,
          $rowIndex: rowIndex,
          $rows: rows,
        };
        const record: Record<string, string> = {};
        cellErrors.length = 0;
        for (const column of element.columns) {
          record[column.label] = bindColumnCell(column, rowScope, row);
        }
        for (const message of cellErrors) {
          diagnostics.push({
            level: 'error',
            code: 'PRINT_BIND_EVAL',
            message: `table 单元格求值失败：${message}`,
            elementId: element.id,
          });
        }
        return record;
      });
      return { ...element, sourceRows: rows, boundRows };
    }

    if (element.type === 'pageNumber') {
      return {
        ...element,
        text: interpolate(
          compiler,
          element.format ?? '${$page}/${$pages}',
          elementScope,
          env,
        ).value,
      };
    }

    if (element.type === 'printDate') {
      return {
        ...element,
        text: formatPrintDate(now, element.format ?? 'YYYY-MM-DD HH:mm:ss'),
      };
    }

    return element;
  });

  return {
    template: { ...template, elements },
    diagnostics,
  };
}
