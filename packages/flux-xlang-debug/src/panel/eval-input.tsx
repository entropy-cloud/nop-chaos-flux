import { useState } from 'react';
import type { DebugClient } from '../client/debug-client.js';
import { t } from '@nop-chaos/flux-i18n';

export interface EvalInputProps {
  client: DebugClient;
  threadId: number;
  frameIndex: number;
  disabled: boolean;
}

interface EvalResult {
  v?: { value?: string };
  error?: string;
}

/** 表达式求值输入（plan 620）：getExprValue 直查；非挂起态禁用。 */
export function EvalInput({ client, threadId, frameIndex, disabled }: EvalInputProps) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<EvalResult | null>(null);

  const submit = async () => {
    if (!expr.trim() || disabled) {
      return;
    }
    try {
      const r = await client.query<{ v?: { value?: string } }>('debugger.getExprValue', {
        threadId,
        frameIndex,
        expr,
      });
      setResult({ v: { value: r?.v?.value } });
    } catch (e) {
      setResult({ error: String((e as Error).message ?? e) });
    }
  };

  return (
    <div className="xlang-debug-eval" data-testid="xlang-debug-eval">
      <input
        type="text"
        value={expr}
        disabled={disabled}
        placeholder={t('flux.xlangDebug.evalPlaceholder')}
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            void submit();
          }
        }}
      />
      <button type="button" disabled={disabled} onClick={() => void submit()}>
        {t('flux.xlangDebug.evaluate')}
      </button>
      {result?.error && <div className="xlang-debug-error">{result.error}</div>}
      {result?.v && <div className="xlang-debug-eval-result">{result.v.value ?? ''}</div>}
    </div>
  );
}
