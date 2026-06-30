import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { login, GraphQLError } from '../../api/login-api';

interface LoginPageProps {
  returnTo?: string;
  onBack: () => void;
  navigateAuth: (auth: 'login' | 'register' | 'forgot') => void;
  onLoggedIn: (returnTo?: string) => void;
}

export function LoginPage({ returnTo, onBack, navigateAuth, onLoggedIn }: LoginPageProps) {
  const [principalId, setPrincipalId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pid = principalId.trim();
    if (!pid || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login({ principalId: pid, principalSecret: password });
      onLoggedIn(returnTo);
    } catch (err) {
      const msg = err instanceof GraphQLError ? err.message : '登录失败，请稍后重试';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mall-page">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1">
          <span className="text-sm">用户名</span>
          <input
            className="mall-touch-target rounded border px-3 text-base"
            autoCapitalize="none"
            autoCorrect="off"
            value={principalId}
            onChange={(e) => setPrincipalId(e.target.value)}
            placeholder="请输入用户名"
            aria-label="用户名"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">密码</span>
          <input
            type="password"
            className="mall-touch-target rounded border px-3 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            aria-label="密码"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mall-touch-target rounded bg-[#ff5000] px-3 text-white disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          登录
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button type="button" className="mall-touch-target" onClick={() => navigateAuth('register')}>
          注册新账号
        </button>
        <button type="button" className="mall-touch-target" onClick={() => navigateAuth('forgot')}>
          忘记密码
        </button>
      </div>
      <button type="button" className="mall-touch-target mt-4 text-sm text-gray-500" onClick={onBack}>
        返回
      </button>
    </main>
  );
}
