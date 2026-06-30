import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { signUp, login, GraphQLError } from '../../api/login-api';

interface RegisterPageProps {
  onBack: () => void;
  navigateAuth: (auth: 'login' | 'register' | 'forgot') => void;
  onLoggedIn: () => void;
}

const MOBILE_PATTERN = /^1[3-9]\d{9}$/;

export function RegisterPage({ onBack, navigateAuth, onLoggedIn }: RegisterPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const uname = username.trim();
    const mob = mobile.trim();
    if (uname.length < 2 || uname.length > 63) {
      setError('用户名长度需为 2-63 个字符');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (!MOBILE_PATTERN.test(mob)) {
      setError('请输入有效的手机号');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signUp({ username: uname, password, mobile: mob });
      await login({ principalId: uname, principalSecret: password });
      onLoggedIn();
    } catch (err) {
      const msg = err instanceof GraphQLError ? err.message : '注册失败，请稍后重试';
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
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="2-63 个字符"
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
        <label className="flex flex-col gap-1">
          <span className="text-sm">手机号</span>
          <input
            type="tel"
            inputMode="numeric"
            className="mall-touch-target rounded border px-3 text-base"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="11 位手机号"
            aria-label="手机号"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mall-touch-target rounded bg-[#ff5000] px-3 text-white disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          注册并登录
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button type="button" className="mall-touch-target" onClick={() => navigateAuth('login')}>
          已有账号？去登录
        </button>
      </div>
      <button type="button" className="mall-touch-target mt-4 text-sm text-gray-500" onClick={onBack}>
        返回
      </button>
    </main>
  );
}
