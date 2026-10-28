import type { MallGoodsProduct } from '../../api/product-api';
import { parseProductSpecifications } from '../../api/product-api';
import type { MallGoodsSpecificationEntry } from '../../api/catalog-api';

export interface SpecAxis {
  id: string;
  name: string;
  values: string[];
}

export interface SkuMatrix {
  axes: SpecAxis[];
  products: MallGoodsProduct[];
}

export function buildSkuMatrix(
  products: MallGoodsProduct[],
  goodsSpecs?: MallGoodsSpecificationEntry[],
): SkuMatrix {
  if (!products || products.length === 0) return { axes: [], products: [] };

  const parsed = products.map((p) => ({
    product: p,
    values: parseProductSpecifications(p.specifications),
  }));

  const axisCount = parsed.reduce((m, x) => Math.max(m, x.values.length), 0);
  if (axisCount === 0) {
    return { axes: [], products };
  }

  const axes: SpecAxis[] = [];
  for (let i = 0; i < axisCount; i++) {
    const name = resolveAxisName(i, axisCount, goodsSpecs);
    const valueSet: string[] = [];
    for (const { values } of parsed) {
      const v = values[i];
      if (v && !valueSet.includes(v)) valueSet.push(v);
    }
    axes.push({ id: `axis-${i}`, name, values: valueSet });
  }

  return { axes, products };
}

function resolveAxisName(
  index: number,
  total: number,
  goodsSpecs?: MallGoodsSpecificationEntry[],
): string {
  if (goodsSpecs && goodsSpecs.length > 0) {
    const byName = new Map<string, Set<number>>();
    goodsSpecs.forEach((s, idx) => {
      const key = s.specification || `规格${index + 1}`;
      if (!byName.has(key)) byName.set(key, new Set());
      byName.get(key)!.add(idx);
    });
    const orderedNames = Array.from(byName.keys());
    if (orderedNames.length === total) {
      return orderedNames[index] || `规格${index + 1}`;
    }
    if (orderedNames.length > 0 && index < orderedNames.length) {
      return orderedNames[index];
    }
  }
  if (total === 1) return '规格';
  return `规格${index + 1}`;
}

export type SpecSelection = (string | null)[];

export function emptySelection(matrix: SkuMatrix): SpecSelection {
  return matrix.axes.map(() => null);
}

export function isSelectionComplete(selection: SpecSelection): boolean {
  return selection.length > 0 && selection.every((v) => v !== null && v !== '');
}

export function resolveProduct(
  matrix: SkuMatrix,
  selection: SpecSelection,
): { product: MallGoodsProduct; index: number } | null {
  if (!isSelectionComplete(selection)) return null;
  const target = selection as string[];
  for (let i = 0; i < matrix.products.length; i++) {
    const product = matrix.products[i];
    const values = parseProductSpecifications(product.specifications);
    if (values.length === target.length && values.every((v: string, idx: number) => v === target[idx])) {
      return { product, index: i };
    }
  }
  return null;
}

export function isProductAvailable(product: MallGoodsProduct): boolean {
  const n = product.number;
  return typeof n === 'number' ? n > 0 : true;
}

export function optionHasStock(
  matrix: SkuMatrix,
  axisIndex: number,
  optionValue: string,
): boolean {
  for (const product of matrix.products) {
    const values = parseProductSpecifications(product.specifications);
    if (values[axisIndex] === optionValue && isProductAvailable(product)) {
      return true;
    }
  }
  return false;
}
