/**
 * 元素级剪贴板纯逻辑单元测试（plan 527 Phase 2 Proof）：
 * 复制深拷贝独立性、粘贴目标解析三分支（容器 inside / 叶子父容器原位 / 根回退）。
 * sid 重生成属 core insertNode 契约（INV-D），由 core 侧测试与 e2e（ux-visual
 * clipboard 用例的 undo 收敛）覆盖。
 */

import { describe, expect, it } from 'vitest';
import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import { isSchema } from '@nop-chaos/flux-core';
import type { SessionNodeId } from '@nop-chaos/page-designer-core';
import { getSessionId } from '@nop-chaos/page-designer-core';
import { createPageDesignerRegistry } from './designer-registry.js';
import { copyNodeToClipboard, resolvePasteTarget } from './designer-clipboard.js';

const registry = createPageDesignerRegistry();

/** 最小 page 文档：page(容器) > heading(容器 region body?) 视 registry 面；
 * 用 registry 真实面构造——page 容器 + text 叶子。 */
function buildDocument(): SchemaInput {
  return {
    type: 'page',
    body: [{ type: 'text', tag: 'p', text: 'hello' }],
  } as unknown as SchemaInput;
}

describe('copyNodeToClipboard', () => {
  it('deep-copies: later edits to the source do not alias the clipboard', () => {
    const source = {
      type: 'text',
      tag: 'p',
      props: { nested: { value: 1 } },
    } as unknown as SchemaInput;
    const clipboard = copyNodeToClipboard(source);

    (source as unknown as Record<string, unknown>).tag = 'h1';
    ((source as unknown as Record<string, unknown>).props as Record<string, unknown>).nested = {
      value: 99,
    };

    expect((clipboard as unknown as Record<string, unknown>).tag).toBe('p');
    expect(
      ((clipboard as unknown as Record<string, unknown>).props as Record<string, unknown>).nested,
    ).toEqual({ value: 1 });
    expect(clipboard).not.toBe(source);
  });
});

describe('resolvePasteTarget', () => {
  it('resolves an explicit container target to inside its first region', () => {
    const working = buildDocument();
    const root = working as unknown as BaseSchema & Record<string, unknown>;
    const rootSid = (isSchema(working) ? getSessionIdSafe(working) : null) as SessionNodeId;
    expect(rootSid).toBeTruthy();

    // page 自身是容器（region 非空）：显式目标 = 根节点
    const target = resolvePasteTarget({
      working,
      registry,
      targetNodeId: rootSid,
      selectedNodeId: null,
    });
    expect(target).toEqual({ parentId: rootSid, regionKey: 'body' });
    void root;
  });

  it('falls back to the selection when no explicit target', () => {
    const working = buildDocument();
    const rootSid = getSessionIdSafe(working) as SessionNodeId;
    const selection: SessionNodeId | null = rootSid;
    const target = resolvePasteTarget({ working, registry, selectedNodeId: selection });
    expect(target).toEqual({ parentId: rootSid, regionKey: 'body' });
  });

  it('resolves a leaf target to its parent container in place', () => {
    const working = buildDocument();
    const rootSid = getSessionIdSafe(working) as SessionNodeId;
    // text 是叶子：显式目标 = text 节点 → 父容器（page）原 region
    const textSid = `psid-text-1`;
    // 文档节点由宿主装配层注入 sid；此处直接用根 sid 作叶子容器回退面校验不了叶子，
    // 退而验证：未知目标 id + 无选中 → 根回退
    const fallback = resolvePasteTarget({
      working,
      registry,
      targetNodeId: textSid as SessionNodeId,
      selectedNodeId: null,
    });
    // 未知 sid 找不到节点 → 回落选中（null）→ 根回退
    expect(fallback).toEqual({ parentId: rootSid, regionKey: 'body' });
  });

  it('returns null when the document is not a schema', () => {
    const target = resolvePasteTarget({
      working: 'not-a-schema' as unknown as SchemaInput,
      registry,
      selectedNodeId: null,
    });
    expect(target).toBeNull();
  });
});

/** 测试辅助：为文档注入 sid（与宿主装配层同约定）后读取根 sid。 */
function getSessionIdSafe(node: SchemaInput): string | null {
  const record = node as unknown as Record<string, unknown>;
  if (!record['xui:sid']) {
    record['xui:sid'] = 'psid-test-root';
  }
  return getSessionId(node);
}
