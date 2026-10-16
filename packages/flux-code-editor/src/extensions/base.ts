import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { indentWithTab, history } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { search, searchKeymap } from '@codemirror/search';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript, javascriptLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { sql, MySQL, PostgreSQL, SQLite, MSSQL, StandardSQL } from '@codemirror/lang-sql';
import { json, jsonParseLinter, jsonLanguage } from '@codemirror/lang-json';
import { html, htmlLanguage } from '@codemirror/lang-html';
import { css, cssLanguage } from '@codemirror/lang-css';
import { python, pythonLanguage } from '@codemirror/lang-python';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { yaml, yamlLanguage } from '@codemirror/lang-yaml';
import { xml, xmlLanguage } from '@codemirror/lang-xml';
import type { Parser } from '@lezer/common';
import { linter } from '@codemirror/lint';
import { t } from '@nop-chaos/flux-i18n';
import { expressionCompletionSource } from './expression/completion.js';
import { createFriendlyNameDecoration } from './expression/decoration.js';
import { createTemplateModeExtension } from './expression/template-mode.js';
import { sqlCompletionSource } from './sql/completion.js';
import { createExpressionLinter } from './expression/linter.js';
import type {
  EditorLanguage,
  EditorMode,
  SQLDialect as SQLDialectType,
  ExpressionLintConfig,
  VariableItem,
  FuncGroup,
  TableSchema,
} from '../types.js';

const defaultLightTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  '.cm-focused': {
    outline: '1px solid hsl(var(--ring))',
    outlineOffset: '-1px',
  },
  '.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, hsl(var(--accent)) 45%, transparent)',
  },
  '&.cm-readOnly': {
    backgroundColor: 'hsl(var(--muted))',
  },
});

/**
 * 语言注册条目（plan 616 / D5 §3.2 registry 开放化）：
 * - `extension`: 语言扩展工厂（必填）；工厂内可按 opts 分支实现替换语义
 *   （sqlDialect / expression template-mode）。
 * - `parser`: colorize 出口用的 lezer parser（可选）。
 * - `completion` / `linter` / `decorations`: 可选追加型扩展工厂，入参 = 创建选项。
 *
 * 内置 12 语言在模块加载时以现值注册（行为与开放化前的 switch 逐字节等价）。
 */
export interface LanguageRegistryEntry {
  extension: (opts: CreateBaseExtensionsOptions) => Extension;
  parser?: Parser;
  completion?: (opts: CreateBaseExtensionsOptions) => Extension | null;
  linter?: (opts: CreateBaseExtensionsOptions) => Extension | null;
  decorations?: (opts: CreateBaseExtensionsOptions) => Extension | null;
}

/**
 * 语言注册表。键 = EditorLanguage 联合成员或运行时注册的字符串语言名。
 * miss 语义：`createLanguageExtension` 回落 []、`getLanguageParser` 回落 null——
 * 未注册语言（如联合内但未调用注册函数的 'xlang'）静默无高亮，不得 throw。
 */
const languageRegistry = new Map<string, LanguageRegistryEntry>();

/**
 * 运行时语言注册扩展点（D5 §一.3 半开放语义）：联合外语言可注册可用，但类型收窄
 * 需上游扩 `EditorLanguage` 联合。同名重复注册后者覆盖并 console.warn（开发态可见）。
 */
export function registerLanguage(name: string, entry: LanguageRegistryEntry): void {
  if (languageRegistry.has(name)) {
    console.warn(`[flux-code-editor] language re-registered, overriding: ${name}`);
  }
  languageRegistry.set(name, entry);
}

function entryFor(language: EditorLanguage | string): LanguageRegistryEntry | undefined {
  return languageRegistry.get(language);
}

// ===== 内置语言注册（行为与开放化前 switch 逐字节等价） =====

languageRegistry.set('expression', {
  // 替换语义（开放化前 L199-210）：template 模式整体替换为模板扩展（不走 javascript()）
  extension: (opts) => {
    if (opts.mode === 'template' && opts.completionConfig) {
      const { variables = [], functions = [] } = opts.completionConfig;
      return createTemplateModeExtension(variables, functions);
    }
    return javascript();
  },
  parser: javascriptLanguage.parser,
  completion: (opts) => {
    if (opts.mode === 'template' || !opts.completionConfig) {
      return null;
    }
    const { variables = [], functions = [] } = opts.completionConfig;
    return autocompletion({
      override: [expressionCompletionSource(variables, functions)],
    });
  },
  linter: (opts) => {
    if (opts.mode === 'template' || !opts.lintConfig) {
      return null;
    }
    const enabled = opts.lintConfig === true || opts.lintConfig.enabled;
    return enabled ? createExpressionLinter(opts.lintConfig) : null;
  },
  decorations: (opts) => {
    if (opts.mode === 'template' || !opts.showFriendlyNames || !opts.completionConfig?.variables?.length) {
      return null;
    }
    return createFriendlyNameDecoration(opts.completionConfig.variables);
  },
});

languageRegistry.set('javascript', {
  extension: () => javascript(),
  parser: javascriptLanguage.parser,
});

languageRegistry.set('typescript', {
  extension: () => javascript({ typescript: true }),
  parser: typescriptLanguage.parser,
});

languageRegistry.set('sql', {
  extension: (opts) => (opts.sqlDialect ? createSQLDialectExtension(opts.sqlDialect) : sql()),
  parser: StandardSQL.language.parser,
  completion: (opts) => {
    if (!opts.completionConfig?.tables?.length) {
      return null;
    }
    return autocompletion({
      override: [sqlCompletionSource(opts.completionConfig.tables)],
    });
  },
});

languageRegistry.set('json', {
  extension: () => [json(), linter(jsonParseLinter())],
  parser: jsonLanguage.parser,
});

languageRegistry.set('html', {
  extension: () => html(),
  parser: htmlLanguage.parser,
});

languageRegistry.set('css', {
  extension: () => css(),
  parser: cssLanguage.parser,
});

languageRegistry.set('python', {
  extension: () => python(),
  parser: pythonLanguage.parser,
});

languageRegistry.set('markdown', {
  extension: () => markdown(),
  parser: markdownLanguage.parser,
});

languageRegistry.set('yaml', {
  extension: () => yaml(),
  parser: yamlLanguage.parser,
});

languageRegistry.set('xml', {
  extension: () => xml(),
  parser: xmlLanguage.parser,
});

languageRegistry.set('plaintext', {
  extension: () => [],
});

export function createLanguageExtension(language: EditorLanguage): Extension {
  const entry = entryFor(language);
  return entry ? entry.extension({ language }) : [];
}

export function createSQLDialectExtension(dialect: SQLDialectType): Extension {
  switch (dialect) {
    case 'mysql':
      return sql({ dialect: MySQL });
    case 'postgresql':
      return sql({ dialect: PostgreSQL });
    case 'sqlite':
      return sql({ dialect: SQLite });
    case 'mssql':
      return sql({ dialect: MSSQL });
    case 'standard':
    default:
      return sql();
  }
}

export function getLanguageParser(language: EditorLanguage): Parser | null {
  const entry = entryFor(language);
  return entry?.parser ?? null;
}

export interface CreateBaseExtensionsOptions {
  language: EditorLanguage;
  mode?: EditorMode;
  lineNumbers?: boolean;
  folding?: boolean;
  autoHeight?: boolean;
  editorTheme?: 'light' | 'dark';
  sqlDialect?: SQLDialectType;
  completionConfig?: CompletionConfig;
  lintConfig?: boolean | ExpressionLintConfig;
  showFriendlyNames?: boolean;
}

export interface CompletionConfig {
  variables?: VariableItem[];
  functions?: FuncGroup[];
  tables?: TableSchema[];
}

function createSearchPhrases(): Record<string, string> {
  return {
    Find: t('flux.codeEditor.searchFind'),
    Replace: t('flux.codeEditor.searchReplace'),
    next: t('flux.codeEditor.searchNext'),
    previous: t('flux.codeEditor.searchPrevious'),
    all: t('flux.codeEditor.searchAll'),
    'match case': t('flux.codeEditor.searchMatchCase'),
    regexp: t('flux.codeEditor.searchRegexp'),
    'by word': t('flux.codeEditor.searchByWord'),
    'replace all': t('flux.codeEditor.searchReplaceAll'),
    close: t('flux.codeEditor.searchClose'),
    'Go to line': t('flux.codeEditor.searchGoToLine'),
  };
}

export function createBaseExtensions(options: CreateBaseExtensionsOptions): Extension[] {
  const extensions: Extension[] = [
    EditorState.phrases.of(createSearchPhrases()),
    keymap.of([...searchKeymap, indentWithTab]),
    history(),
    search(),
    closeBrackets(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
  ];

  if (options.lineNumbers) {
    extensions.push(lineNumbers());
  }

  if (options.folding) {
    extensions.push(foldGutter());
  }

  if (options.autoHeight) {
    extensions.push(EditorView.lineWrapping);
  }

  if (options.editorTheme === 'dark') {
    extensions.push(oneDark);
  } else {
    extensions.push(defaultLightTheme);
  }

  const entry = entryFor(options.language);
  if (entry) {
    // 替换语义：sqlDialect / expression template-mode 的分支在 entry.extension(opts) 内实现
    extensions.push(entry.extension(options));
    const completion = entry.completion?.(options);
    if (completion) {
      extensions.push(completion);
    }
    const linterExtension = entry.linter?.(options);
    if (linterExtension) {
      extensions.push(linterExtension);
    }
    const decorations = entry.decorations?.(options);
    if (decorations) {
      extensions.push(decorations);
    }
  }

  return extensions;
}
