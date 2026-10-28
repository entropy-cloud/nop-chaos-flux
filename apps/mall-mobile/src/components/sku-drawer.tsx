import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { MallGoodsProduct } from '../api/product-api';
import type { MallGoodsSpecificationEntry } from '../api/catalog-api';
import {
  buildSkuMatrix,
  emptySelection,
  isProductAvailable,
  isSelectionComplete,
  optionHasStock,
  resolveProduct,
  type SpecSelection,
} from '../pages/goods/sku-matrix';

export interface SkuDrawerProps {
  open: boolean;
  onClose: () => void;
  products: MallGoodsProduct[];
  goodsSpecs?: MallGoodsSpecificationEntry[];
  goodsName?: string;
  picUrl?: string;
  onConfirm: (product: MallGoodsProduct, number: number) => void;
  confirmLabel?: string;
  requireLogin?: boolean;
}

export function SkuDrawer({
  open,
  onClose,
  products,
  goodsSpecs,
  goodsName,
  picUrl,
  onConfirm,
  confirmLabel = '加入购物车',
  requireLogin = false,
}: SkuDrawerProps) {
  const matrix = useMemo(() => buildSkuMatrix(products, goodsSpecs), [products, goodsSpecs]);
  const [selection, setSelection] = useState<SpecSelection>(() => emptySelection(matrix));
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setSelection(emptySelection(matrix));
  }, [matrix]);

  useEffect(() => {
    if (open) setQty(1);
  }, [open]);

  const resolved = useMemo(() => resolveProduct(matrix, selection), [matrix, selection]);
  const selectedProduct = resolved?.product;
  const complete = isSelectionComplete(selection);
  const hasAxes = matrix.axes.length > 0;
  const singleAvailableProduct =
    products.length === 1 && isProductAvailable(products[0]) ? products[0] : null;

  const effectiveProduct = selectedProduct ?? singleAvailableProduct ?? undefined;
  const displayPrice = effectiveProduct?.price;
  const displayPic = effectiveProduct?.url || picUrl;

  const canConfirm = (() => {
    if (requireLogin) return true;
    if (!hasAxes) return singleAvailableProduct !== null;
    return complete && selectedProduct !== undefined && isProductAvailable(selectedProduct);
  })();

  const handleConfirm = () => {
    const target = hasAxes ? selectedProduct : singleAvailableProduct;
    if (!target) return;
    if (!isProductAvailable(target)) return;
    onConfirm(target, Math.max(1, qty));
  };

  const selectValue = (axisIndex: number, value: string) => {
    setSelection((prev) => {
      const next = [...prev];
      next[axisIndex] = next[axisIndex] === value ? null : value;
      return next;
    });
  };

  const changeQty = (delta: number) => {
    setQty((q) => Math.max(1, q + delta));
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          className="mall-drawer-mask"
          data-testid="sku-drawer-mask"
          aria-label="关闭规格选择"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`mall-sku-drawer${open ? ' is-open' : ''}`}
        data-testid="sku-drawer"
        aria-hidden={!open}
      >
        <div className="mall-sku-drawer-header">
          <div className="mall-sku-drawer-thumb">
            {displayPic ? <img src={displayPic} alt={goodsName ?? ''} /> : <span>无图</span>}
          </div>
          <div className="mall-sku-drawer-summary">
            <div className="mall-sku-drawer-price">
              {displayPrice !== undefined && displayPrice !== null ? (
                <span>¥{formatPrice(displayPrice)}</span>
              ) : (
                <span className="mall-sku-drawer-price-hint">请选择规格</span>
              )}
            </div>
            {goodsName ? <div className="mall-sku-drawer-name">{goodsName}</div> : null}
            {selectedProduct && !isProductAvailable(selectedProduct) ? (
              <div className="mall-sku-drawer-out">已售罄</div>
            ) : null}
          </div>
          <button
            type="button"
            className="mall-touch-target mall-sku-drawer-close"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mall-sku-drawer-body">
          {matrix.axes.length === 0 ? (
            <div className="mall-sku-empty">
              {products.length === 0 ? '暂无可选规格' : singleAvailableProduct ? '该商品仅有一种规格' : '暂无可选规格'}
            </div>
          ) : (
            matrix.axes.map((axis, ai) => (
              <div className="mall-sku-axis" key={axis.id}>
                <div className="mall-sku-axis-name">{axis.name}</div>
                <div className="mall-sku-axis-values">
                  {axis.values.map((value) => {
                    const selected = selection[ai] === value;
                    const inStock = optionHasStock(matrix, ai, value);
                    return (
                      <button
                        type="button"
                        key={value}
                        className={`mall-touch-target mall-sku-pill${selected ? ' is-selected' : ''}${
                          inStock ? '' : ' is-disabled'
                        }`}
                        disabled={!inStock}
                        onClick={() => selectValue(ai, value)}
                      >
                        {value}
                        {!inStock ? <span className="mall-sku-pill-out">缺货</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mall-sku-drawer-qty">
          <span className="mall-sku-qty-label">数量</span>
          <div className="mall-sku-stepper">
            <button
              type="button"
              className="mall-touch-target mall-sku-stepper-btn"
              onClick={() => changeQty(-1)}
              disabled={qty <= 1}
              aria-label="减少"
            >
              −
            </button>
            <span className="mall-sku-stepper-num">{qty}</span>
            <button
              type="button"
              className="mall-touch-target mall-sku-stepper-btn"
              onClick={() => changeQty(1)}
              aria-label="增加"
            >
              +
            </button>
          </div>
        </div>

        <div className="mall-sku-drawer-footer">
          {requireLogin ? (
            <button
              type="button"
              className="mall-touch-target mall-sku-confirm mall-btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              登录后{confirmLabel}
            </button>
          ) : (
            <button
              type="button"
              className="mall-touch-target mall-sku-confirm mall-btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
              data-testid="sku-confirm"
            >
              {complete && selectedProduct && !isProductAvailable(selectedProduct)
                ? '已售罄'
                : confirmLabel}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

function formatPrice(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return String(value);
  return n.toFixed(2);
}
