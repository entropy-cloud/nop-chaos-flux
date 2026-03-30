import { describe, it, expect } from 'vitest';
import { mapCellStyle } from './cell-style-map.js';
describe('mapCellStyle', () => {
    it('returns ss-cell with empty style when input is undefined', () => {
        const result = mapCellStyle(undefined);
        expect(result.className).toBe('ss-cell');
        expect(result.style).toEqual({});
    });
    it('returns ss-cell with empty style when all properties are Excel defaults', () => {
        const style = {
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            verticalAlign: 'middle',
            wrapText: false,
        };
        const result = mapCellStyle(style);
        expect(result.className).toBe('ss-cell');
        expect(result.style).toEqual({});
    });
    it('maps bold to ss-bold', () => {
        const result = mapCellStyle({ fontWeight: 'bold' });
        expect(result.className).toContain('ss-bold');
    });
    it('maps italic to ss-italic', () => {
        const result = mapCellStyle({ fontStyle: 'italic' });
        expect(result.className).toContain('ss-italic');
    });
    it('maps underline to ss-underline', () => {
        const result = mapCellStyle({ textDecoration: 'underline' });
        expect(result.className).toContain('ss-underline');
    });
    it('maps line-through to ss-strike', () => {
        const result = mapCellStyle({ textDecoration: 'line-through' });
        expect(result.className).toContain('ss-strike');
    });
    it('maps textAlign center to ss-align-center', () => {
        const result = mapCellStyle({ textAlign: 'center' });
        expect(result.className).toContain('ss-align-center');
    });
    it('maps textAlign right to ss-align-right', () => {
        const result = mapCellStyle({ textAlign: 'right' });
        expect(result.className).toContain('ss-align-right');
    });
    it('maps verticalAlign top to ss-valign-top', () => {
        const result = mapCellStyle({ verticalAlign: 'top' });
        expect(result.className).toContain('ss-valign-top');
    });
    it('maps verticalAlign bottom to ss-valign-bottom', () => {
        const result = mapCellStyle({ verticalAlign: 'bottom' });
        expect(result.className).toContain('ss-valign-bottom');
    });
    it('maps wrapText true to ss-wrap', () => {
        const result = mapCellStyle({ wrapText: true });
        expect(result.className).toContain('ss-wrap');
    });
    it('maps fontSize to inline style in px', () => {
        const result = mapCellStyle({ fontSize: 14 });
        expect(result.style.fontSize).toBe('14px');
    });
    it('maps fontFamily to inline style', () => {
        const result = mapCellStyle({ fontFamily: 'SimSun' });
        expect(result.style.fontFamily).toBe('SimSun');
    });
    it('maps fontColor to inline style color', () => {
        const result = mapCellStyle({ fontColor: '#FF5733' });
        expect(result.style.color).toBe('#FF5733');
    });
    it('maps backgroundColor to inline style', () => {
        const result = mapCellStyle({ backgroundColor: '#e8f0fe' });
        expect(result.style.backgroundColor).toBe('#e8f0fe');
    });
    it('maps textIndent to inline style in px', () => {
        const result = mapCellStyle({ textIndent: 8 });
        expect(result.style.textIndent).toBe('8px');
    });
    it('maps borderWidth to inline style in px', () => {
        const result = mapCellStyle({ borderWidth: 2 });
        expect(result.style.borderWidth).toBe('2px');
    });
    it('maps borderColor to inline style', () => {
        const result = mapCellStyle({ borderColor: '#333333' });
        expect(result.style.borderColor).toBe('#333333');
    });
    it('maps per-side border to inline style', () => {
        const result = mapCellStyle({
            borderTop: { color: '#ff0000', style: 'solid', width: 1 },
        });
        expect(result.style.borderTopWidth).toBe('1px');
        expect(result.style.borderTopStyle).toBe('solid');
        expect(result.style.borderTopColor).toBe('#ff0000');
        expect(result.style.borderColor).toBeUndefined();
    });
    it('per-side borders take precedence over borderColor/borderWidth', () => {
        const result = mapCellStyle({
            borderColor: '#000000',
            borderWidth: 2,
            borderBottom: { color: '#00ff00', style: 'dashed', width: 3 },
        });
        expect(result.style.borderBottomWidth).toBe('3px');
        expect(result.style.borderBottomStyle).toBe('dashed');
        expect(result.style.borderBottomColor).toBe('#00ff00');
        expect(result.style.borderColor).toBeUndefined();
        expect(result.style.borderWidth).toBeUndefined();
    });
    it('combines multiple classes and inline styles', () => {
        const result = mapCellStyle({
            fontWeight: 'bold',
            fontStyle: 'italic',
            textAlign: 'center',
            fontSize: 16,
            backgroundColor: '#f0f0f0',
        });
        expect(result.className).toContain('ss-bold');
        expect(result.className).toContain('ss-italic');
        expect(result.className).toContain('ss-align-center');
        expect(result.style.fontSize).toBe('16px');
        expect(result.style.backgroundColor).toBe('#f0f0f0');
    });
    it('always includes ss-cell as baseline', () => {
        const result = mapCellStyle({
            fontWeight: 'bold',
            fontSize: 20,
            fontColor: 'red',
        });
        expect(result.className).toContain('ss-cell');
    });
});
//# sourceMappingURL=cell-style-map.test.js.map