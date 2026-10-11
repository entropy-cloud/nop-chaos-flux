/**
 * WA-pivot-001 (plan 568): single vocabulary source for the pivot schema
 * value sets. These used to live as a TS union in schemas.ts plus two
 * hand-copied runtime lists (validator + option normalizer) and two inline
 * literal checks — five touch points for one new aggregation type. The
 * drift consequence is asymmetric: the validator would accept a value the
 * normalizer silently downgrades to NONE/'text' in prod builds (devWarn is
 * stripped), leaving the schema author with no signal.
 */
export const PIVOT_AGGREGATION_TYPES = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'NONE'] as const;
export type PivotAggregationType = (typeof PIVOT_AGGREGATION_TYPES)[number];

export const PIVOT_CELL_TYPES = ['text', 'progressbar', 'sparkline'] as const;
export type PivotCellType = (typeof PIVOT_CELL_TYPES)[number];

export const PIVOT_CORNER_TITLE_VALUES = ['row', 'column', 'none', 'all'] as const;
export type PivotCornerTitleOnDimension = (typeof PIVOT_CORNER_TITLE_VALUES)[number];
