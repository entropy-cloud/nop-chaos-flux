import type { FieldSourceSnapshot } from '@nop-chaos/report-designer-core';

export function getFieldCount(fieldSources: FieldSourceSnapshot[]): number {
  return fieldSources.reduce((total: number, source) => {
    return (
      total +
      source.groups.reduce((groupTotal: number, group) => groupTotal + group.fields.length, 0)
    );
  }, 0);
}
