import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { lineNumbers } from '@codemirror/view';
import { foldGutter } from '@codemirror/language';
import { indentWithTab, history } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { sql, MySQL, PostgreSQL, SQLite, MSSQL } from '@codemirror/lang-sql';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { linter } from '@codemirror/lint';
import type { EditorLanguage, SQLDialect as SQLDialectType } from '../types';

const defaultLightTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    border: '1px solid var(--nop-field-border, #d1d5db)',
    borderRadius: '6px',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  '.cm-focused': {
    outline: '1px solid var(--nop-field-focus-ring, #3b82f6)',
    outlineOffset: '-1px',
  },
  '&.cm-readOnly': {
    backgroundColor: 'var(--nop-field-disabled-bg, #f3f4f6)',
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

export interface CreateBaseExtensionsOptions {
  language: EditorLanguage;
  lineNumbers?: boolean;
  folding?: boolean;
  autoHeight?: boolean;
  editorTheme?: 'light' | 'dark';
  sqlDialect?: SQLDialectType;
}

export function createBaseExtensions(options: CreateBaseExtensionsOptions): Extension[] {
  const extensions: Extension[] = [
    keymap.of([indentWithTab]),
    history(),
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
  } else {
    extensions.push(createLanguageExtension(options.language));
  }

  return extensions;
}
