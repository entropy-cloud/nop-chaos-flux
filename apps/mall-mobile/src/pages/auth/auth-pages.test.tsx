import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from './login';
import { RegisterPage } from './register';
import { installFetchMock, envelope } from '../../test-support';
import { useMallStore } from '../../store';

function resetStore() {
  useMallStore.getState().reset();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetStore();
});

describe('LoginPage', () => {
  it('validates empty input without calling the api', async () => {
    const fetchMock = installFetchMock(() => ({ status: 200, body: envelope({}) }));
    const onLoggedIn = vi.fn();
    render(<LoginPage onBack={() => {}} navigateAuth={() => {}} onLoggedIn={onLoggedIn} />);
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(screen.getByRole('alert').textContent).toBe('请输入用户名和密码');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits credentials with returnTo and calls onLoggedIn on success', async () => {
    installFetchMock((url) => {
      if (url === '/r/LoginApi__login')
        return { status: 200, body: envelope({ accessToken: 't', userInfo: { userId: '1', userName: 'u' } }) };
      return { status: 200, body: envelope(null) };
    });
    const onLoggedIn = vi.fn();
    render(
      <LoginPage returnTo="/tab/cart" onBack={() => {}} navigateAuth={() => {}} onLoggedIn={onLoggedIn} />,
    );
    fireEvent.input(screen.getByLabelText('用户名'), { target: { value: 'alice' } });
    fireEvent.input(screen.getByLabelText('密码'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith('/tab/cart'));
    expect(useMallStore.getState().accessToken).toBe('t');
  });

  it('surfaces server error message and keeps the store logged out', async () => {
    installFetchMock(() => ({ status: 200, body: envelope(null, 1002, '用户名或密码错误') }));
    render(<LoginPage onBack={() => {}} navigateAuth={() => {}} onLoggedIn={() => {}} />);
    fireEvent.input(screen.getByLabelText('用户名'), { target: { value: 'a' } });
    fireEvent.input(screen.getByLabelText('密码'), { target: { value: 'b' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('用户名或密码错误'));
    expect(useMallStore.getState().accessToken).toBeNull();
  });
});

describe('RegisterPage', () => {
  it('validates mobile format before posting', async () => {
    const fetchMock = installFetchMock(() => ({ status: 200, body: envelope({}) }));
    render(<RegisterPage onBack={() => {}} navigateAuth={() => {}} onLoggedIn={() => {}} />);
    fireEvent.input(screen.getByLabelText('用户名'), { target: { value: 'bob' } });
    fireEvent.input(screen.getByLabelText('密码'), { target: { value: 'pw1' } });
    fireEvent.input(screen.getByLabelText('手机号'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /注册并登录/ }));
    expect(screen.getByRole('alert').textContent).toBe('请输入有效的手机号');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts signUp payload then auto-logs-in and calls onLoggedIn', async () => {
    installFetchMock((url) => {
      if (url === '/r/LoginApi__signUp') return { status: 200, body: envelope({ userId: 'u9' }) };
      if (url === '/r/LoginApi__login')
        return { status: 200, body: envelope({ accessToken: 'rt', userInfo: { userId: 'u9', userName: 'bob' } }) };
      return { status: 200, body: envelope(null) };
    });
    const onLoggedIn = vi.fn();
    render(<RegisterPage onBack={() => {}} navigateAuth={() => {}} onLoggedIn={onLoggedIn} />);
    fireEvent.input(screen.getByLabelText('用户名'), { target: { value: 'bob' } });
    fireEvent.input(screen.getByLabelText('密码'), { target: { value: 'pw1' } });
    fireEvent.input(screen.getByLabelText('手机号'), { target: { value: '13800000000' } });
    fireEvent.click(screen.getByRole('button', { name: /注册并登录/ }));
    await waitFor(() => expect(onLoggedIn).toHaveBeenCalled());
    expect(useMallStore.getState().accessToken).toBe('rt');
    expect(useMallStore.getState().userInfo?.userName).toBe('bob');
  });
});
