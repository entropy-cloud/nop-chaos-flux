import { describe, expect, it } from 'vitest';
import {
  parseTableAliases,
  sqlCompletionSource,
  SQL_KEYWORDS,
} from './completion';
import type { TableSchema } from '../../types';

describe('parseTableAliases', () => {
  const tables: TableSchema[] = [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'BIGINT' },
        { name: 'username', type: 'VARCHAR(64)' },
      ],
    },
    {
      name: 'orders',
      alias: 'o',
      columns: [
        { name: 'id', type: 'BIGINT' },
        { name: 'user_id', type: 'BIGINT' },
        { name: 'amount', type: 'DECIMAL(10,2)' },
      ],
    },
  ];

  it('maps table names to their schemas', () => {
    const map = parseTableAliases('SELECT * FROM users', tables);
    expect(map.get('users')).toBeTruthy();
    expect(map.get('users')!.name).toBe('users');
  });

  it('maps configured aliases', () => {
    const map = parseTableAliases('SELECT * FROM orders o', tables);
    expect(map.get('o')).toBeTruthy();
    expect(map.get('o')!.name).toBe('orders');
  });

  it('extracts aliases from FROM clause', () => {
    const map = parseTableAliases('SELECT * FROM users u JOIN orders o ON u.id = o.user_id', tables);
    expect(map.get('u')).toBeTruthy();
    expect(map.get('u')!.name).toBe('users');
    expect(map.get('o')).toBeTruthy();
    expect(map.get('o')!.name).toBe('orders');
  });

  it('handles AS keyword in alias', () => {
    const map = parseTableAliases('SELECT * FROM users AS u', tables);
    expect(map.get('u')).toBeTruthy();
    expect(map.get('u')!.name).toBe('users');
  });

  it('handles case-insensitive FROM matching', () => {
    const map = parseTableAliases('select * from Users u', tables);
    expect(map.get('u')).toBeTruthy();
  });
});

describe('SQL_KEYWORDS', () => {
  it('contains essential SQL keywords', () => {
    expect(SQL_KEYWORDS).toContain('SELECT');
    expect(SQL_KEYWORDS).toContain('FROM');
    expect(SQL_KEYWORDS).toContain('WHERE');
    expect(SQL_KEYWORDS).toContain('JOIN');
    expect(SQL_KEYWORDS).toContain('ORDER');
    expect(SQL_KEYWORDS).toContain('GROUP');
  });
});
