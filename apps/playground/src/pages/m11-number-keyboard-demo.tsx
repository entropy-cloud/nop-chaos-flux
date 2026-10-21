import { useState } from 'react';
import { Button } from '@nop-chaos/ui';
import { NumberKeyboardRenderer } from '@nop-chaos/flux-renderers-mobile';

interface M11NumberKeyboardDemoPageProps {
  onBack: () => void;
}

function KeyboardHost() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  return (
    <div className="space-y-2">
      <div
        data-testid="m11-keyboard-input"
        className="min-h-11 rounded-md border px-3 py-2 text-right text-lg"
      >
        {input || <span className="text-zinc-500">点击下方键盘输入</span>}
      </div>
      <Button
        size="sm"
        variant="outline"
        data-testid="m11-keyboard-open"
        onClick={() => setOpen(true)}
      >
        打开数字键盘
      </Button>
      {open ? (
        <NumberKeyboardRenderer
          {...({
            schema: { type: 'number-keyboard' },
            props: { open: true, title: '安全键盘' },
            events: {
              onKey: (payload: { key: string }) => {
                if (payload.key === 'delete') {
                  setInput((prev) => prev.slice(0, -1));
                } else {
                  setInput((prev) => prev + payload.key);
                }
              },
              onConfirm: () => setOpen(false),
              onCancel: () => setOpen(false),
            },
            meta: { testid: 'm11-keyboard-panel', visible: true, hidden: false, disabled: false, changed: false },
            node: { scope: {} },
            id: 'm11-keyboard-panel',
            path: ['m11-keyboard-panel'],
          } as unknown as Parameters<typeof NumberKeyboardRenderer>[0])}
        />
      ) : null}
    </div>
  );
}

export function M11NumberKeyboardDemoPage({ onBack }: M11NumberKeyboardDemoPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center gap-3 px-6 py-3 bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-white">
          ← Back
        </Button>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Number Keyboard (M11)</p>
          <h1 className="text-sm font-semibold text-white m-0">M11 安全输入 — number-keyboard</h1>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center gap-8 p-6 lg:p-10">
        <div
          data-testid="m11-phone-frame"
          className="relative mx-auto overflow-hidden rounded-[2.5rem] border-[3px] border-zinc-800 bg-black shadow-2xl shrink-0"
          style={{ width: 390, height: 844 }}
        >
          <div className="relative w-full h-full overflow-y-auto bg-background p-3 space-y-3" style={{ transform: 'translateZ(0)' }}>
            <div className="rounded-xl border border-zinc-800 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 m-0">
                number-keyboard（M11a）
              </p>
              <KeyboardHost />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M11 特性</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              4 行数字网格 [1-9][. 0 ⌫] + confirm 右列；randomOrder 乱序防窥（1-9 每 mount 重洗，键集不变）；
              decimal 关闭隐去小数点；弹层壳复用（z-index 栈 + 滚动锁 + safe-bottom）。
            </p>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">M11b 对账</p>
            <p className="text-xs text-zinc-400 m-0 leading-relaxed">
              verification-code（form 包 InputOTP 域）经 form value 通道集成即可，不改造其内部；passcode 无既有实现。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
