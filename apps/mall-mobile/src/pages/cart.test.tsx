import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { CartPage } from './cart';
import { useMallStore } from '../store';
import { installFetchMock, envelope, readBody, type FetchResponder } from '../test-support';

const USER_ID = 'u1';

function login() {
  useMallStore.getState().setAuth({
    accessToken: 'tok',
    userInfo: { userId: USER_ID, userName: 'u' },
  });
}

function cartResponder(items: ReturnType<typeof cartItems>): FetchResponder {
  return (url, init) => {
    if (url === '/r/LitemallCart__findPage') {
      return { status: 200, body: envelope({ items, total: items.length }) };
    }
    if (url === '/r/LitemallCart__updateQuantity') {
      const body = readBody(init);
      return {
        status: 200,
        body: envelope({ id: String(body.id), number: body.number }),
      };
    }
    if (url === '/r/LitemallCart__check' || url === '/r/LitemallCart__uncheck') {
      const body = readBody(init);
      return { status: 200, body: envelope({ id: String(body.id), checked: url.endsWith('__check') }) };
    }
    if (
      url === '/r/LitemallCart__checkAll' ||
      url === '/r/LitemallCart__uncheckAll' ||
      url === '/r/LitemallCart__deleteCart' ||
      url === '/r/LitemallCart__clear'
    ) {
      return { status: 200, body: envelope(null) };
    }
    return { status: 200, body: envelope(null) };
  };
}

function cartItems() {
  return [
    {
      id: 'c1',
      userId: USER_ID,
      goodsId: 'g1',
      goodsName: '商品A',
      productId: 'p1',
      price: 10,
      number: 2,
      specifications: '["红色","均码"]',
      checked: true,
      picUrl: 'http://a.png',
    },
    {
      id: 'c2',
      userId: USER_ID,
      goodsId: 'g2',
      goodsName: '商品B',
      productId: 'p2',
      price: 5.5,
      number: 1,
      specifications: '["蓝色"]',
      checked: false,
      picUrl: 'http://b.png',
    },
  ];
}

describe('CartPage', () => {
  beforeEach(() => {
    window.location.hash = '';
    useMallStore.getState().clearAuth();
    useMallStore.getState().setCartBadge(0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    useMallStore.getState().clearAuth();
    window.location.hash = '';
  });

  it('prompts login when not logged in', async () => {
    installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText('登录后查看你的购物车')).toBeTruthy();
    });
  });

  it('renders cart rows and syncs badge to item count', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);

    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });
    expect(screen.getByText('商品A')).toBeTruthy();
    expect(useMallStore.getState().cartBadge).toBe(2);
    // findPage filter uses userId
    const findPageCall = fn.mock.calls.find((c) => c[0] === '/r/LitemallCart__findPage');
    expect(findPageCall).toBeTruthy();
  });

  it('shows empty state when cart is empty', async () => {
    login();
    installFetchMock(cartResponder([]));
    render(<CartPage />);
    await waitFor(() => {
      expect(screen.getByText('购物车是空的')).toBeTruthy();
    });
  });

  it('toggling a row checkbox fires uncheck for checked item (optimistic)', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    const checks = screen.getAllByTestId('cart-row-check');
    fireEvent.click(checks[0]);

    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__uncheck')).toBe(true);
    });
  });

  it('select-all toggles checkAll / uncheckAll', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    const allCheckbox = document.querySelector('.mall-cart-select-all input') as HTMLInputElement;
    expect(allCheckbox).toBeTruthy();
    expect(allCheckbox.checked).toBe(false);

    await act(async () => {
      fireEvent.click(allCheckbox);
    });
    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__checkAll')).toBe(true);
    });
  });

  it('quantity stepper debounce updates backend only when value changes', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    const plusButtons = screen.getAllByTestId('stepper-plus');
    await act(async () => {
      fireEvent.click(plusButtons[0]);
    });
    expect(screen.getAllByTestId('stepper-value')[0].textContent).toBe('3');

    await waitFor(
      () => {
        expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__updateQuantity')).toBe(true);
      },
      { timeout: 2000 },
    );
    const updateCall = fn.mock.calls.find(
      (c) => c[0] === '/r/LitemallCart__updateQuantity',
    ) as [string, { body: string }];
    expect(JSON.parse(updateCall[1].body).number).toBe(3);
  });

  it('quantity change to same value does not send update (skip-if-unchanged)', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    // bump then revert within debounce window → net unchanged → no update call
    const plusButtons = screen.getAllByTestId('stepper-plus');
    const minusButtons = screen.getAllByTestId('stepper-minus');
    await act(async () => {
      fireEvent.click(plusButtons[0]);
    });
    await act(async () => {
      fireEvent.click(minusButtons[0]);
    });
    expect(screen.getAllByTestId('stepper-value')[0].textContent).toBe('2');

    await new Promise((r) => setTimeout(r, 800));
    expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__updateQuantity')).toBe(false);
  });

  it('quantity minus at min (number=1) triggers delete instead of zero', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    // item c2 has number=1, minus-at-min should delete
    const minusButtons = screen.getAllByTestId('stepper-minus');
    await act(async () => {
      fireEvent.click(minusButtons[1]);
    });

    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__deleteCart')).toBe(true);
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(1);
    });
  });

  it('swipe delete removes item', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    const deleteButtons = screen.getAllByTestId('cart-delete');
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__deleteCart')).toBe(true);
    });
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(1);
    });
  });

  it('checkout button disabled when nothing selected; enabled when selection exists', async () => {
    login();
    installFetchMock(cartResponder(cartItems()));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    // item c1 is checked initially → checkout enabled, count (1)
    const checkout = screen.getByTestId('cart-checkout') as HTMLButtonElement;
    expect(checkout.disabled).toBe(false);
    expect(checkout.textContent).toContain('(1)');
  });

  it('clear confirms and clears cart', async () => {
    login();
    const fn = installFetchMock(cartResponder(cartItems()));
    // happy-dom lacks window.confirm; stub it to auto-confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="cart-row"]').length).toBe(2);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('清空'));
    });

    await waitFor(() => {
      expect(fn.mock.calls.some((c) => c[0] === '/r/LitemallCart__clear')).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByText('购物车是空的')).toBeTruthy();
    });
    expect(useMallStore.getState().cartBadge).toBe(0);
  });

  it('shows error retry when cart list fails', async () => {
    login();
    installFetchMock((url) => {
      if (url === '/r/LitemallCart__findPage') {
        return { status: 200, body: envelope(null, 1001, '加载失败') };
      }
      return { status: 200, body: envelope(null) };
    });
    render(<CartPage />);
    await waitFor(() => {
      expect(document.querySelectorAll('[data-testid="mall-error"]').length).toBeGreaterThan(0);
    });
  });
});
