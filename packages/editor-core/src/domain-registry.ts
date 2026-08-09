import type { EditorDomainAdapter } from './types.js';

/**
 * 领域适配器注册表（机制蓝本：flow-designer-core `tree-domain.ts`）。
 *
 * 与 tree-domain 的差异（裁定记录于 docs/architecture/editor-core.md §3）：
 * **重复注册覆盖**（`registerEditorDomain` 再次注册同 kind 时以新 adapter 覆盖旧 adapter，
 * 不抛错）——editor-core 是领域适配层，测试/示例/多实例场景允许重注册以最新实现为准。
 */
const adapters = new Map<string, EditorDomainAdapter>();

export function registerEditorDomain(adapter: EditorDomainAdapter): void {
  adapters.set(adapter.kind, adapter);
}

export function getEditorDomain(kind: string): EditorDomainAdapter | undefined {
  return adapters.get(kind);
}

export function listEditorDomains(): string[] {
  return Array.from(adapters.keys());
}

export function clearEditorDomains(): void {
  adapters.clear();
}
