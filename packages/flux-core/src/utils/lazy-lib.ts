/**
 * 统一的重库延迟加载原语（lazy heavy-lib loading）。
 *
 * 引入外部大库（three / leafer / ol / echarts / codemirror / vtable / zxing 等）的控件
 * 必须延迟加载，且模块级动态 import 的 promise 记忆化统一走本工具，不再各自手写缓存：
 * - 首次调用发起加载，并发/后续调用共享同一 promise（in-flight 去重）；
 * - 加载失败清除缓存，下一次调用重试（失败不永久锁定）；
 * - 错误向调用方传播（错误占位/dev warn 降级是调用方职责），本工具不吞错。
 *
 * 组件级延迟加载（React.lazy + Suspense）统一走 flux-react `createLazyRendererComponent`；
 * 本工具负责 chunk 内部对重库模块本身的按需装载。
 */
export type LazyLibLoader<T> = () => Promise<T>;

export function createLazyLibLoader<T>(load: () => Promise<T>): LazyLibLoader<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) {
      promise = load().catch((error: unknown) => {
        promise = null;
        throw error;
      });
    }
    return promise;
  };
}
