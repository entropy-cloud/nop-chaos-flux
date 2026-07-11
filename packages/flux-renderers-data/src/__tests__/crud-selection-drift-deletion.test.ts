import { describe, expect, it } from 'vitest';
import crudSchemaSource from '../crud-schema.js?raw';

describe('CRUD selection drift — maxKeepSelectionLength removed from schema source', () => {
  it('CrudSelectionConfig source no longer declares maxKeepSelectionLength', () => {
    expect(crudSchemaSource).not.toContain('maxKeepSelectionLength');
  });

  it('CrudSelectionConfig source still declares the implemented drift fields', () => {
    expect(crudSchemaSource).toContain('keepOnPageChange');
    expect(crudSchemaSource).toContain('maxSelectionLength');
    expect(crudSchemaSource).toContain('checkableWhen');
  });

  it('CrudSelectionConfig declares exactly 6 documented selection fields', () => {
    const selectionBlockMatch = crudSchemaSource.match(
      /export interface CrudSelectionConfig[\s\S]*?\n}/,
    );
    expect(selectionBlockMatch).not.toBeNull();
    const selectionBlock = selectionBlockMatch![0];
    const fieldLines = selectionBlock
      .split('\n')
      .filter((line) => line.trim().startsWith('//') === false && line.includes('?:'))
      .map((line) => line.trim().replace(/\??:.*$/, '').replace(/^[a-z]/, (c) => c));
    expect(fieldLines).toEqual([
      'type',
      'keepOnPageChange',
      'maxSelectionLength',
      'checkableWhen',
      'toggleOnRowClick',
      'labelTpl',
    ]);
    expect(fieldLines).not.toContain('maxKeepSelectionLength');
  });
});
