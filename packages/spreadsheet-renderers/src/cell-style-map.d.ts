import type { CellStyle } from '@nop-chaos/spreadsheet-core';
export interface CellStyleResult {
    className: string;
    style: Record<string, string>;
}
export declare function mapCellStyle(style: CellStyle | undefined): CellStyleResult;
