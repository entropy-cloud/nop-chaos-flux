import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { sendResetCode, resetPassword, GraphQLError } from '../../api/login-api';

interface ForgotPasswordPageProps {
  onBack: () => void;
  navigateAuth: (auth: 'login' | 'register' | 'forgot') => void;
  onReset: () => void;
}

const MOBILE_PATTERN = /^1[3-9]\d{9}$/;
const RESEND_COOLDOWN_MS = 60_000;

export function ForgotPasswordPage({ onBack, navigateAuth, onReset }: ForgotPasswordPageProps) {
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  const mob = mobile.trim();
  const canSendCode = MOBILE_PATTERN.test(mob) && !sendingCode && now < cooldownUntil === false;

  async function handleSendCode() {
    if (!MOBILE_PATTERN.test(mob)) {
      setError('请输入有效的手机号');
      return;
    }
    setSendingCode(true);
    setError(null);
    setInfo(null);
    try {
      await sendResetCode(mob);
      const next = Date.now() + RESEND_COOLDOWN_MS;
      setCooldownUntil(next);
      setInfo('验证码已发送，5 分钟内有效');
    } catch (err) {
      const msg = err instanceof GraphQLError ? err.message : '验证码发送失败';
      setError(msg);
    } finally {
      setSendingCode(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!MOBILE_PATTERN.test(mob)) {
      setError('请输入有效的手机号');
      return;
    }
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }
    if (!newPassword) {
      setError('请输入新密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      await resetPassword({ mobile: mob, code: code.trim(), newPassword });
      onReset();
    } catch (err) {
      const msg = err instanceof GraphQLError ? err.message : '重置失败，请检查验证码';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  return (
    <main className="mall-page">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
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
        <label className="flex flex-col gap-1">
          <span className="text-sm">验证码</span>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              className="mall-touch-target flex-1 rounded border px-3 text-base"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 位验证码"
              aria-label="验证码"
            />
            <button
              type="button"
              disabled={!canSendCode || cooldownLeft > 0}
              onClick={handleSendCode}
              className="mall-touch-target rounded border px-3 text-sm disabled:opacity-50"
            >
              {cooldownLeft > 0 ? `${cooldownLeft}s` : sendingCode ? '发送中' : '获取验证码'}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm">新密码</span>
          <input
            type="password"
            className="mall-touch-target rounded border px-3 text-base"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="请输入新密码"
            aria-label="新密码"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        {info ? <p role="status" className="text-sm text-green-600">{info}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mall-touch-target rounded bg-[#ff5000] px-3 text-white disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          重置密码
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <button type="button" className="mall-touch-target" onClick={() => navigateAuth('login')}>
          想起密码？去登录
        </button>
      </div>
      <button
        type="button"
        className="mall-touch-target mt-4 text-sm text-gray-500"
        onClick={() => {
          setNow(Date.now());
          onBack();
        }}
      >
        返回
      </button>
    </main>
  );
}
