import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { indentWithTab, history } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { search, searchKeymap } from '@codemirror/search';
import { closeBrackets } from '@codemirror/autocomplete';
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
import { autocompletion } from '@codemirror/autocomplete';
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

export function createLanguageExtension(language: EditorLanguage): Extension {
  switch (language) {
    case 'expression':
      return javascript();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'sql':
      return sql();
    case 'json':
      return [json(), linter(jsonParseLinter())];
    case 'html':
      return html();
    case 'css':
      return css();
    case 'python':
      return python();
    case 'markdown':
      return markdown();
    case 'yaml':
      return yaml();
    case 'xml':
      return xml();
    case 'plaintext':
    default:
      return [];
  }
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
  switch (language) {
    case 'expression':
    case 'javascript':
      return javascriptLanguage.parser;
    case 'typescript':
      return typescriptLanguage.parser;
    case 'sql':
      return StandardSQL.language.parser;
    case 'json':
      return jsonLanguage.parser;
    case 'html':
      return htmlLanguage.parser;
    case 'css':
      return cssLanguage.parser;
    case 'python':
      return pythonLanguage.parser;
    case 'markdown':
      return markdownLanguage.parser;
    case 'yaml':
      return yamlLanguage.parser;
    case 'xml':
      return xmlLanguage.parser;
    case 'plaintext':
    default:
      return null;
  }
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

  if (options.language === 'sql' && options.sqlDialect) {
    extensions.push(createSQLDialectExtension(options.sqlDialect));
  } else if (
    options.language === 'expression' &&
    options.mode === 'template' &&
    options.completionConfig
  ) {
    const { variables = [], functions = [] } = options.completionConfig;
    extensions.push(createTemplateModeExtension(variables, functions));
  } else {
    extensions.push(createLanguageExtension(options.language));
  }

  if (
    options.language === 'expression' &&
    options.mode !== 'template' &&
    options.completionConfig
  ) {
    const { variables = [], functions = [] } = options.completionConfig;
    extensions.push(
      autocompletion({
        override: [expressionCompletionSource(variables, functions)],
      }),
    );
  }

  if (options.language === 'sql' && options.completionConfig?.tables?.length) {
    extensions.push(
      autocompletion({
        override: [sqlCompletionSource(options.completionConfig.tables)],
      }),
    );
  }

  if (options.language === 'expression' && options.lintConfig) {
    const enabled = options.lintConfig === true || options.lintConfig.enabled;
    if (enabled) {
      extensions.push(createExpressionLinter(options.lintConfig));
    }
  }

  if (
    options.language === 'expression' &&
    options.showFriendlyNames &&
    options.completionConfig?.variables?.length
  ) {
    extensions.push(createFriendlyNameDecoration(options.completionConfig.variables));
  }

  return extensions;
}
