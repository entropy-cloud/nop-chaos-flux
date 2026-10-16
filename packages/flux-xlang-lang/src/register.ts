import {
  createLanguageExtension,
  registerLanguage,
  type LanguageRegistryEntry,
} from '@nop-chaos/flux-code-editor';
import { xlang } from './language.js';

/**
 * 注册 'xlang' 语言到 flux-code-editor registry（plan 616 / D5 §3.2 半开放语义）。
 * 幂等：重复注册后条目覆盖并 console.warn（registry 契约）。
 * 诊断 linter 不进 registry——由宿主经 extensions 注入点独立组合（D5 §3.5）。
 */
export function registerXlangLanguage(): void {
  registerLanguage('xlang', {
    extension: () => xlang(),
  } satisfies LanguageRegistryEntry);
}

export function createXlangExtension() {
  return createLanguageExtension('xlang');
}
