import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { TableSchema } from '../../types';

export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
  'LIKE', 'IS', 'NULL', 'AS', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
  'OUTER', 'CROSS', 'FULL', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC',
  'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP',
  'ALTER', 'ADD', 'COLUMN', 'INDEX', 'VIEW', 'DISTINCT', 'COUNT',
  'SUM', 'AVG', 'MIN', 'MAX', 'EXISTS', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'CHECK', 'UNIQUE',
];

export function parseTableAliases(
  sql: string,
  tables: TableSchema[],
): Map<string, TableSchema> {
  const aliasMap = new Map<string, TableSchema>();

  for (const table of tables) {
    if (table.alias) {
      aliasMap.set(table.alias, table);
    }
    aliasMap.set(table.name, table);
  }

  const fromPattern = /\bFROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
  let match: RegExpExecArray | null;
  while ((match = fromPattern.exec(sql)) !== null) {
    const tableName = match[1];
    const alias = match[2];
    const table = tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    if (table && alias) {
      aliasMap.set(alias, table);
    }
  }

  const joinPattern = /\bJOIN\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
  while ((match = joinPattern.exec(sql)) !== null) {
    const tableName = match[1];
    const alias = match[2];
    const table = tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
    if (table && alias) {
      aliasMap.set(alias, table);
    }
  }

  return aliasMap;
}

export function sqlCompletionSource(tables: TableSchema[]) {
  return function contextCompletion(
    context: CompletionContext,
  ): CompletionResult | null {
    const doc = context.state.doc.toString();
    const textBefore = doc.slice(0, context.pos);
    const aliasMap = parseTableAliases(textBefore, tables);

    const dotMatch = textBefore.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
      const prefix = dotMatch[1];
      const partial = dotMatch[2];
      const table = aliasMap.get(prefix);
      if (table) {
        const options = table.columns
          .filter((c) => c.name.toLowerCase().startsWith(partial.toLowerCase()))
          .map((c) => ({
            label: c.name,
            detail: `${c.type}${c.nullable ? ' (nullable)' : ''}`,
            info: c.description,
            type: 'property' as const,
          }));

        if (options.length === 0) return null;

        return {
          from: context.pos - partial.length,
          options,
        };
      }
    }

    const word = context.matchBefore(/\w+/);
    if (!word) return null;

    const partial = word.text.toLowerCase();

    const tableOptions = tables.map((t) => ({
      label: t.name,
      detail: t.description || 'table',
      type: 'type' as const,
    }));

    const keywordOptions = SQL_KEYWORDS.filter((kw) =>
      kw.toLowerCase().startsWith(partial),
    ).map((kw) => ({
      label: kw,
      type: 'keyword' as const,
    }));

    const options = [...tableOptions, ...keywordOptions];
    if (options.length === 0) return null;

    return { from: word.from, options };
  };
}
