import { useFluxTranslation } from '@nop-chaos/flux-i18n';

export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts: string[] = [error.message];
  // plan 2026-08-08-0900-1 Phase 2 / P2 #16：保留 Error.cause 链（防 chained error 上下文丢失）。
  let cause: unknown = (error as Error & { cause?: unknown }).cause;
  while (cause instanceof Error) {
    parts.push(`caused by: ${cause.message}`);
    cause = (cause as Error & { cause?: unknown }).cause;
  }
  if (cause !== undefined && cause !== null) {
    parts.push(`caused by: ${String(cause)}`);
  }
  // plan 2026-08-08-0900-1 Phase 2 / P2 #16：保留截断 stack 帧（诊断用，限首 3 帧，防超长 + 去重复 header）。
  if (typeof error.stack === 'string') {
    const frames = error.stack
      .split('\n')
      .filter((line) => line.trim().startsWith('at'))
      .slice(0, 3);
    if (frames.length > 0) parts.push(frames.join('\n'));
  }
  return parts.join('\n');
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * scada-canvas 错误码注册表（plan 2026-08-04-1558-2 Phase 4 WD-6）：集中定义全部错误码 +
 * code→i18n key 映射。新增码必须在此登记并通过单测固化（防散落字符串）。
 *
 * 错误码语义对齐 `design-renderer.md §8.1`：
 * - `config-parse`/`config-invalid`/`config-build-failed`/`engine-create-failed` 升级画布 error
 *   并派发 `scada:error`；
 * - `flux-compile-failed`/`flux-evaluate-failed`/`flux-deps-empty`/`handler-error` 不升级画布 status
 *   （P1-8 降级契约），经去重数据通道上报；
 * - `not-visible`/`not-mounted`/`symbol-not-found`/`point-not-found`/`invalid-config` 为命令句柄
 *   失败路径（不升级画布 status）。
 */
export const SCADA_ERROR_CODES = [
  'config-parse',
  'config-invalid',
  'config-build-failed',
  'engine-create-failed',
  'flux-compile-failed',
  'flux-evaluate-failed',
  'flux-deps-empty',
  'handler-error',
  'not-visible',
  'not-mounted',
  'symbol-not-found',
  'point-not-found',
  'invalid-config',
] as const;

export type ScadaErrorCode = (typeof SCADA_ERROR_CODES)[number];

const I18N_KEY_PREFIX = 'industrial.scada.error';

/** 错误码 → i18n key 映射（统一前缀，locale 文件维护各语言文案）。 */
export function scadaErrorI18nKey(code: string): string {
  return SCADA_ERROR_CODES.includes(code as ScadaErrorCode)
    ? `${I18N_KEY_PREFIX}.${code}`
    : `${I18N_KEY_PREFIX}.unknown`;
}

export interface ScadaErrorInfo {
  code: string;
  message: string;
}

/**
 * 错误区本地化文案解析（plan 2026-08-04-1558-2 Phase 4 WD-6）：错误码经注册表 + i18n 映射后
 * 上屏为本地化文案；未知码 fallback 到原始 message（向后兼容）。返回 `[localizedMessage, fallback]`：
 * `fallback` 为 i18n 缺失时的兜底文案（错误码原始 message）。
 */
export function resolveScadaErrorText(
  error: ScadaErrorInfo | undefined,
  t: (key: string) => string,
): string {
  if (!error) return '';
  const i18nKey = scadaErrorI18nKey(error.code);
  const localized = t(i18nKey);
  // i18n 缺失时 i18next 返回 key 本身——回退到原始 message（向后兼容未登记 key 的调用方）
  return localized === i18nKey || !localized ? error.message : localized;
}

/**
 * React hook：错误码经 i18n 映射为本地化文案（plan 2026-08-04-1558-2 Phase 4 WD-6）。
 * scada-canvas 错误区经此 hook 渲染；未知码 fallback 原始 message。
 */
export function useScadaErrorText(): (error: ScadaErrorInfo | undefined) => string {
  const { t } = useFluxTranslation();
  return (error: ScadaErrorInfo | undefined) => resolveScadaErrorText(error, t as (key: string) => string);
}
