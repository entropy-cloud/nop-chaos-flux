import { useRef, useState, useEffect, useCallback } from 'react';

interface UseBarcodeTorchOptions {
  getStream?: () => MediaStream | null;
  onRestartStream?: () => Promise<void>;
}

interface UseBarcodeTorchReturn {
  isAvailable: boolean;
  isOn: boolean;
  toggle: () => Promise<void>;
}

export function useBarcodeTorch(options?: UseBarcodeTorchOptions): UseBarcodeTorchReturn {
  const [isOn, setIsOn] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const checkedRef = useRef(false);
  const isOnRef = useRef(isOn);
  const getStreamRef = useRef(options?.getStream);
  const onRestartStreamRef = useRef(options?.onRestartStream);

  useEffect(() => { isOnRef.current = isOn; });
  useEffect(() => { getStreamRef.current = options?.getStream; }, [options?.getStream]);
  useEffect(() => { onRestartStreamRef.current = options?.onRestartStream; }, [options?.onRestartStream]);

  // 1-6: 可用性检查对「流就绪」响应——相机流在挂载后异步就绪（start() 完成前
  // getStream() 返回 null）。旧实现 effect deps 依赖稳定 ref + 无流时 early
  // return 且不置 checkedRef → effect 永不重跑 → isAvailable 恒 false →
  // torch 按钮生产流程永不出现。改为自重试链：流未就绪时周期重查，流就绪后
  // 执行真实检查并置位 checkedRef（真实检查完成前不置位）。
  useEffect(() => {
    if (checkedRef.current) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const check = () => {
      if (cancelled || checkedRef.current) return;
      const stream = getStreamRef.current?.() ?? null;
      if (!stream) {
        timer = setTimeout(check, 250);
        return;
      }
      checkedRef.current = true;

      const track = stream.getVideoTracks()[0];
      let available = false;
      if (track) {
        try {
          const capabilities = track.getCapabilities?.() as Record<string, unknown> | undefined;
          if (capabilities?.torch) {
            available = true;
          }
        } catch {
          /* torch not supported */
        }
      }
      setIsAvailable(available);
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [getStreamRef]);

  const toggle = useCallback(async () => {
    const stream = getStreamRef.current?.() ?? null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    if (!isOnRef.current) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: true }] as any,
        });
        setIsOn(true);
      } catch (err) {
        console.error('[useBarcodeTorch] Torch toggle failed:', err);
        setIsOn(false);
      }
    } else {
      if (onRestartStreamRef.current) {
        try {
          await onRestartStreamRef.current();
        } catch {
          /* stream restart failed — torch is already transitioning off */
        }
        setIsOn(false);
      }
    }
  }, []);

  return { isAvailable, isOn, toggle };
}
