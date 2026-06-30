import { useCallback, useEffect, useRef, useState } from 'react';
import { useMallStore } from '../../store';
import { getAppEnv, hashNavigate } from '../../env-instance';
import { requireAuth } from '../../guards/require-auth';
import { addCollect, isCollected, removeCollect } from '../../api/collect-api';
import { recordFootprint } from '../../api/footprint-api';
import { addGoodsToCart } from '../../api/cart-api';
import type { MallGoodsProduct } from '../../api/product-api';
import type { AuthPageKey } from '../../route-model';

export interface GoodsActionsOptions {
  notify?: (kind: 'success' | 'error', message: string) => void;
}

export function useGoodsActions(goodsId: string, options: GoodsActionsOptions = {}) {
  const isLoggedIn = useMallStore((s) => !!s.accessToken);
  const incCartBadge = useMallStore((s) => s.incCartBadge);
  const [collected, setCollected] = useState(false);
  const footprintRecorded = useRef<string | null>(null);

  const notify = options.notify ?? defaultNotify;

  // React's documented "adjust state when a prop changes" pattern: detect a version
  // change via stored previous state (not an effect, not a ref) and reset derived state
  // during render. This avoids cascading renders and keeps the lint rules satisfied.
  const resetKey = `${goodsId}|${isLoggedIn ? '1' : '0'}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setCollected(false);
  }

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    isCollected(goodsId)
      .then((result: boolean) => {
        if (active) setCollected(result);
      })
      .catch(() => {
        // collecting status is non-blocking; default to false
      });
    return () => {
      active = false;
    };
  }, [goodsId, isLoggedIn]);

  const recordFootprintAction = useCallback(() => {
    if (!isLoggedIn) return; // 未登录静默跳过不阻塞浏览
    if (footprintRecorded.current === goodsId) return; // already recorded for this goods
    footprintRecorded.current = goodsId;
    recordFootprint(goodsId).catch(() => {
      // 足迹记录失败不应阻塞浏览；允许重试一次下次挂载
      footprintRecorded.current = null;
    });
  }, [goodsId, isLoggedIn]);

  const ensureAuth = useCallback(
    (action: Parameters<typeof requireAuth>[0]) => {
      const guard = requireAuth(action, (auth: AuthPageKey, returnTo?: string) => {
        hashNavigate(`/auth/${auth}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`);
      });
      return guard.allowed;
    },
    [],
  );

  const toggleCollect = useCallback(() => {
    if (!ensureAuth('collect')) return;
    if (collected) {
      removeCollect(goodsId)
        .then(() => {
          setCollected(false);
          notify('success', '已取消收藏');
        })
        .catch((err: unknown) => notify('error', toMessage(err, '取消收藏失败')));
    } else {
      addCollect(goodsId)
        .then(() => {
          setCollected(true);
          notify('success', '已收藏');
        })
        .catch((err: unknown) => notify('error', toMessage(err, '收藏失败')));
    }
  }, [collected, ensureAuth, goodsId, notify]);

  const addToCart = useCallback(
    (product: MallGoodsProduct, number: number, onSuccess?: () => void) => {
      if (!ensureAuth('add-to-cart')) return;
      addGoodsToCart({ goodsId, productId: product.id, number })
        .then(() => {
          incCartBadge(1);
          notify('success', '已加入购物车');
          onSuccess?.();
        })
        .catch((err: unknown) => notify('error', toMessage(err, '加入购物车失败')));
    },
    [ensureAuth, goodsId, incCartBadge, notify],
  );

  const buyNow = useCallback(
    (product: MallGoodsProduct, number: number, onSuccess?: () => void) => {
      if (!ensureAuth('checkout')) return;
      addGoodsToCart({ goodsId, productId: product.id, number })
        .then(() => {
          incCartBadge(1);
          onSuccess?.();
          hashNavigate('/page/checkout?from=buynow');
        })
        .catch((err: unknown) => notify('error', toMessage(err, '操作失败')));
    },
    [ensureAuth, goodsId, incCartBadge, notify],
  );

  return {
    collected,
    requireLoginForSku: !isLoggedIn,
    recordFootprint: recordFootprintAction,
    toggleCollect,
    addToCart,
    buyNow,
  };
}

function defaultNotify(kind: 'success' | 'error', message: string) {
  const env = getAppEnv();
  env.notify?.(kind === 'error' ? 'error' : 'success', message);
}

function toMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}
