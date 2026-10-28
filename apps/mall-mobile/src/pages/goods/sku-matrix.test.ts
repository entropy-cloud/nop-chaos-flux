import { describe, expect, it } from 'vitest';
import {
  buildSkuMatrix,
  emptySelection,
  isProductAvailable,
  isSelectionComplete,
  optionHasStock,
  resolveProduct,
} from './sku-matrix';
import type { MallGoodsProduct } from '../../api/product-api';

function product(id: string, specs: string, number: number, price = 9.9): MallGoodsProduct {
  return { id, specifications: specs, number, price };
}

describe('buildSkuMatrix', () => {
  it('returns empty axes when no products', () => {
    const m = buildSkuMatrix([]);
    expect(m.axes).toEqual([]);
    expect(m.products).toEqual([]);
  });

  it('builds single axis for one-spec products', () => {
    const m = buildSkuMatrix([
      product('p1', '["标准版"]', 5),
      product('p2', '["套装版"]', 0),
    ]);
    expect(m.axes).toHaveLength(1);
    expect(m.axes[0].name).toBe('规格');
    expect(m.axes[0].values).toEqual(['标准版', '套装版']);
  });

  it('builds multiple axes for multi-spec products and preserves distinct values', () => {
    const m = buildSkuMatrix([
      product('p1', '["全网通","8+128G"]', 5),
      product('p2', '["全网通","8+256G"]', 3),
      product('p3', '["运营商版","8+128G"]', 0),
    ]);
    expect(m.axes).toHaveLength(2);
    expect(m.axes[0].values).toEqual(['全网通', '运营商版']);
    expect(m.axes[1].values).toEqual(['8+128G', '8+256G']);
  });

  it('tolerates comma-separated specifications when not JSON', () => {
    const m = buildSkuMatrix([product('p1', '黑色,大', 1)]);
    expect(m.axes).toHaveLength(2);
    expect(m.axes[0].values).toEqual(['黑色']);
    expect(m.axes[1].values).toEqual(['大']);
  });
});

describe('resolveProduct', () => {
  const products = [
    product('p1', '["全网通","8+128G"]', 5),
    product('p2', '["全网通","8+256G"]', 3),
    product('p3', '["运营商版","8+128G"]', 0),
  ];
  const matrix = buildSkuMatrix(products);

  it('resolves to the matching product when selection complete', () => {
    const resolved = resolveProduct(matrix, ['全网通', '8+256G']);
    expect(resolved?.product.id).toBe('p2');
  });

  it('returns null when selection incomplete', () => {
    expect(resolveProduct(matrix, ['全网通', null])).toBeNull();
    expect(resolveProduct(matrix, [])).toBeNull();
  });

  it('returns null when combo does not exist', () => {
    expect(resolveProduct(matrix, ['运营商版', '8+256G'])).toBeNull();
  });
});

describe('isSelectionComplete', () => {
  it('true only when every axis has a non-empty value', () => {
    expect(isSelectionComplete(['a', 'b'])).toBe(true);
    expect(isSelectionComplete(['a', null])).toBe(false);
    expect(isSelectionComplete(['a', ''])).toBe(false);
    expect(isSelectionComplete([])).toBe(false);
  });
});

describe('emptySelection', () => {
  it('produces one null per axis', () => {
    const matrix = buildSkuMatrix([product('p1', '["x","y"]', 1)]);
    expect(emptySelection(matrix)).toEqual([null, null]);
  });
});

describe('stock helpers', () => {
  const products = [
    product('p1', '["全网通","8+128G"]', 5),
    product('p2', '["全网通","8+256G"]', 0),
  ];
  const matrix = buildSkuMatrix(products);

  it('isProductAvailable treats number<=0 as unavailable', () => {
    expect(isProductAvailable(products[0])).toBe(true);
    expect(isProductAvailable(products[1])).toBe(false);
  });

  it('optionHasStock reflects whether any matching SKU has stock', () => {
    expect(optionHasStock(matrix, 0, '全网通')).toBe(true);
    expect(optionHasStock(matrix, 1, '8+128G')).toBe(true);
    expect(optionHasStock(matrix, 1, '8+256G')).toBe(false);
  });
});
