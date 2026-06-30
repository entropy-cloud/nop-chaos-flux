import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useMallStore } from '../store';
import { hashNavigate } from '../env-instance';
import {
  checkAllCart,
  checkCart,
  clearCart,
  deleteCart,
  fetchCartList,
  uncheckAllCart,
  uncheckCart,
  updateCartQuantity,
  type MallCart,
} from '../api/cart-api';
import { useAsync } from '../hooks/use-async';
import { Skeleton, EmptyState, ErrorRetry } from '../components/state-views';
import { SwipeCell } from '../components/swipe-cell';
import { QuantityStepper } from '../components/quantity-stepper';
import { parseProductSpecifications } from '../api/product-api';

const QTY_DEBOUNCE_MS = 500;

export interface CartPageProps {
  onLogin?: () => void;
}

export function CartPage({ onLogin }: CartPageProps) {
  const isLoggedIn = useMallStore((s) => !!s.accessToken);
  const userInfo = useMallStore((s) => s.userInfo);
  const setCartBadge = useMallStore((s) => s.setCartBadge);

  const userId = userInfo?.userId ?? '';
  const list = useAsync(() => fetchCartList(userId), userId);
  const [items, setItems] = useState<MallCart[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingQtyRef = useRef<Map<string, { original: number; timer: ReturnType<typeof setTimeout> }>>(
    new Map(),
  );

  useEffect(() => {
    setItems(list.data ?? []);
    setCartBadge(list.data?.length ?? 0);
  }, [list.data, setCartBadge]);

  const refresh = useCallback(async () => {
    await list.refetch();
  }, [list]);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 2500);
  }, []);

  const updateLocal = useCallback((id: string, patch: Partial<MallCart>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const onToggleCheck = useCallback(
    async (item: MallCart) => {
      const nextChecked = !item.checked;
      updateLocal(item.id, { checked: nextChecked });
      try {
        if (nextChecked) await checkCart(item.id);
        else await uncheckCart(item.id);
      } catch (err) {
        updateLocal(item.id, { checked: !nextChecked });
        showError(toMessage(err, '操作失败'));
      }
    },
    [showError, updateLocal],
  );

  const allChecked = useMemo(
    () => items.length > 0 && items.every((it) => it.checked),
    [items],
  );

  const onToggleAll = useCallback(async () => {
    const next = !allChecked;
    setItems((prev) => prev.map((it) => ({ ...it, checked: next })));
    try {
      if (next) await checkAllCart();
      else await uncheckAllCart();
    } catch (err) {
      showError(toMessage(err, '操作失败'));
      await refresh();
    }
  }, [allChecked, refresh, showError]);

  const onQuantityChange = useCallback(
    (item: MallCart, next: number) => {
      if (next < 1) return;
      updateLocal(item.id, { number: next });
      const entry = pendingQtyRef.current.get(item.id);
      const original = entry?.original ?? item.number ?? next;
      if (entry) clearTimeout(entry.timer);
      const timer = setTimeout(async () => {
        pendingQtyRef.current.delete(item.id);
        if (next === original) return; // 不变不发（D2 §3.3 新蜂模式）
        setBusy(true);
        try {
          await updateCartQuantity(item.id, next);
        } catch (err) {
          updateLocal(item.id, { number: original });
          showError(toMessage(err, '库存不足或更新失败'));
        } finally {
          setBusy(false);
        }
      }, QTY_DEBOUNCE_MS);
      pendingQtyRef.current.set(item.id, { original, timer });
    },
    [showError, updateLocal],
  );

  const onDelete = useCallback(
    async (item: MallCart) => {
      const snapshot = items;
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setCartBadge(Math.max(0, items.length - 1));
      try {
        await deleteCart(item.id);
      } catch (err) {
        setItems(snapshot);
        setCartBadge(snapshot.length);
        showError(toMessage(err, '删除失败'));
      }
    },
    [items, setCartBadge, showError],
  );

  const onClear = useCallback(async () => {
    if (items.length === 0) return;
    if (!window.confirm(`清空购物车？共 ${items.length} 件商品`)) return;
    const snapshot = items;
    setItems([]);
    setCartBadge(0);
    try {
      await clearCart();
    } catch (err) {
      setItems(snapshot);
      setCartBadge(snapshot.length);
      showError(toMessage(err, '清空失败'));
    }
  }, [items, setCartBadge, showError]);

  const selectedItems = useMemo(() => items.filter((it) => it.checked), [items]);
  const selectedCount = selectedItems.length;
  const totalAmount = useMemo(
    () =>
      selectedItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.number || 0), 0),
    [selectedItems],
  );

  const goCheckout = () => {
    if (selectedCount === 0) return;
    showError('结算功能将在 M4 上线');
  };

  const goLogin = () => {
    if (onLogin) onLogin();
    else hashNavigate('/auth/login?returnTo=/tab/cart');
  };

  if (!isLoggedIn) {
    return (
      <div className="mall-tab-page mall-cart-page" data-testid="cart-page">
        <header className="mall-category-header">
          <span className="mall-navbar-title">购物车</span>
        </header>
        <div className="mall-cart-login-prompt">
          <ShoppingCart size={48} />
          <p>登录后查看你的购物车</p>
          <button type="button" className="mall-touch-target mall-btn-primary mall-cart-login-btn" onClick={goLogin}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mall-tab-page mall-cart-page" data-testid="cart-page">
      <header className="mall-category-header mall-cart-header">
        <span className="mall-navbar-title">购物车</span>
        {items.length > 0 ? (
          <button
            type="button"
            className="mall-touch-target mall-cart-clear-btn"
            onClick={onClear}
            disabled={busy}
          >
            清空
          </button>
        ) : null}
      </header>

      {error ? <div className="mall-cart-toast" role="alert">{error}</div> : null}

      {list.loading ? (
        <Skeleton lines={4} />
      ) : list.error ? (
        <ErrorRetry message={list.error} onRetry={refresh} />
      ) : items.length === 0 ? (
        <EmptyState message="购物车是空的" />
      ) : (
        <div className="mall-cart-list" data-testid="cart-list">
          {items.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              busy={busy}
              onToggleCheck={() => onToggleCheck(item)}
              onQuantityChange={(n) => onQuantityChange(item, n)}
              onDelete={() => onDelete(item)}
            />
          ))}
        </div>
      )}

      <footer className="mall-cart-footer" data-testid="cart-footer">
        <label className="mall-cart-select-all" htmlFor="cart-select-all">
          <input
            id="cart-select-all"
            type="checkbox"
            checked={allChecked}
            onChange={onToggleAll}
            disabled={items.length === 0}
          />
          <span>全选</span>
        </label>
        <div className="mall-cart-total">
          合计：<span className="mall-cart-total-amount">¥{totalAmount.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="mall-touch-target mall-cart-checkout mall-btn-primary"
          onClick={goCheckout}
          disabled={selectedCount === 0}
          data-testid="cart-checkout"
        >
          结算{selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </footer>
    </div>
  );
}

interface CartRowProps {
  item: MallCart;
  busy: boolean;
  onToggleCheck: () => void;
  onQuantityChange: (next: number) => void;
  onDelete: () => void;
}

function CartRow({ item, busy, onToggleCheck, onQuantityChange, onDelete }: CartRowProps) {
  const specs = parseProductSpecifications(item.specifications);
  return (
    <SwipeCell
      rightAction={
        <button
          type="button"
          className="mall-touch-target mall-swipe-delete"
          onClick={onDelete}
          aria-label="删除"
          data-testid="cart-delete"
        >
          <Trash2 size={20} />
          <span>删除</span>
        </button>
      }
    >
      <div className="mall-cart-row" data-testid="cart-row">
        <div className="mall-cart-check">
          <input
            type="checkbox"
            checked={!!item.checked}
            onChange={onToggleCheck}
            aria-label={`选择 ${item.goodsName ?? '商品'}`}
            data-testid="cart-row-check"
          />
        </div>
        <div className="mall-cart-row-img">
          {item.picUrl ? <img src={item.picUrl} alt={item.goodsName ?? ''} /> : <span>无图</span>}
        </div>
        <div className="mall-cart-row-info">
          <div className="mall-cart-row-name">{item.goodsName ?? ''}</div>
          {specs.length > 0 ? (
            <div className="mall-cart-row-spec">{specs.join(' / ')}</div>
          ) : null}
          <div className="mall-cart-row-bottom">
            <span className="mall-cart-row-price">¥{formatPrice(item.price)}</span>
            <QuantityStepper
              value={item.number ?? 1}
              disabled={busy}
              onChange={onQuantityChange}
              onMinusAtMin={onDelete}
            />
          </div>
        </div>
      </div>
    </SwipeCell>
  );
}

function formatPrice(value: number | string | undefined): string {
  if (value === undefined || value === null) return '0.00';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return String(value);
  return n.toFixed(2);
}

function toMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}
