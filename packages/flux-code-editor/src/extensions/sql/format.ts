import { format as sqlFormat } from 'sql-formatter';
import type { SQLFormatConfig, SQLDialect } from '../../types';

const DIALECT_MAP: Record<SQLDialect, 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'tsql'> = {
  standard: 'sql',
  mysql: 'mysql',
  postgresql: 'postgresql',
  sqlite: 'sqlite',
  mssql: 'tsql',
};

export function formatSQL(
  sql: string,
  config: boolean | SQLFormatConfig | undefined,
  dialect?: SQLDialect,
): string {
  if (!config) return sql;

  const resolved: SQLFormatConfig = config === true
    ? { enabled: true }
    : config;

  return sqlFormat(sql, {
    language: resolved.language ?? DIALECT_MAP[dialect ?? 'standard'] ?? 'sql',
    tabWidth: resolved.tabWidth ?? 2,
    keywordCase: resolved.keywordCase ?? 'upper',
    indentStyle: resolved.indentStyle ?? 'standard' as any,
    logicalOperatorNewline: resolved.logicalOperatorNewline ?? 'before',
  });
}
