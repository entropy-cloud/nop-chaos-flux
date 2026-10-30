import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RendererEnv, SchemaInput } from '@nop-chaos/flux-core';
import { useConversation, type MessageEngine } from '@nop-chaos/flux-renderers-ai';
import { createActionScope } from '@nop-chaos/flux-runtime';
import { PageFrame } from '../shared/page-frame';
import { ShowcaseSchemaHost } from '../shared/render-host';
import { mockToolExecutor, mockToolSchemas } from '../../ai/tool-mock';
import { replAiHostSeedConversations } from '../shared/mock-backend-repl-ai';
import {
  createReplAiConnector,
  loadReplAiConversationHistory,
} from '../shared/mock-backend-repl-ai-connector';
import aiKnowledgeChatSchema from '../page-schemas/ai-knowledge-chat.json';

const ENGINE_WAIT_POLL_MS = 25;
const ENGINE_WAIT_TIMEOUT_MS = 2_000;

/**
 * M3-K1 AI 知识库对话页 host override (D3 §2.1 实现形态裁决块 / D6 开放审计
 * MAJ-B)。ai-chat 的 `conversationController` / `engine` 是 host 注入的
 * resolved prop——host objects，非 schema 表达式可产生的值
 * (flux-renderers-ai/schemas.ts L11-16)，所以本页不能走纯 JSON SchemaPage：
 * registry 特例覆盖通用 entry（pih-workspace 先例），schema JSON 由本 host
 * 直接 import（ai-conversations-demo 直接 import 先例）。
 *
 * 选中态经 host namespace action（plan 633 UR-4 同构：activeId 所有权归
 * host store——schema setValue 只写 scope、下一次 pageData replace 会把高亮
 * 回退）：onItemClick → `replAi:setActive` → `switchConversation(id)`，历史
 * 消息由 host 经 `ReplAi__messageFindPage` 取回后灌入引擎回显（仅对空引擎
 * 灌入，镜像 useConversation 的 `stored.length > 0` 水合语义）；CRUD ajax
 * （conversationSave 等）保留为持久化副写（schema 动作链）。
 *
 * Host seeds the page-scope variables the schema expressions read before the
 * first write (pih-workspace 数据种子先例) — 每个表达式都有定义初值
 * （`activeAnswer: null` 是 onResponseComplete 写回前的占位）。
 */
export function AiKnowledgeChatHost({ env }: { env: RendererEnv }) {
  const connector = useMemo(() => createReplAiConnector(), []);
  const conversations = useConversation({
    connector,
    initialConversations: replAiHostSeedConversations(),
    createEngineOptions: {
      tools: mockToolSchemas,
      toolExecutor: mockToolExecutor,
      maxToolRounds: 5,
    },
  });

  // plan 633 UR-4 ref-mirror 同构：activeId 所有权归 host store。The scope is
  // created once (stable renderer prop); the namespace is registered in a
  // layout effect keyed on the scope (ai-chat useNamespaceRegistration
  // precedent) so the invoke closure reads the ref mirror only from inside a
  // callback — never during render (react-hooks/refs).
  const activeEngineRef = useRef<MessageEngine | null>(conversations.activeEngine);
  useEffect(() => {
    activeEngineRef.current = conversations.activeEngine;
  });

  const [actionScope] = useState(() => createActionScope({ id: 'ai-knowledge-chat-action-scope' }));
  useLayoutEffect(() => {
    actionScope.registerNamespace('replAi', {
      kind: 'host',
      listMethods() {
        return ['setActive'];
      },
      async invoke(method: string, payload: unknown) {
        if (method !== 'setActive') {
          return { ok: false, error: new Error(`Unknown replAi method: ${method}`) };
        }
        const id = (payload as { id?: unknown } | undefined)?.id;
        if (typeof id !== 'string') {
          return { ok: false, error: new Error('setActive requires string id') };
        }
        const waitForActiveEngine = async (): Promise<MessageEngine | null> => {
          const deadline = Date.now() + ENGINE_WAIT_TIMEOUT_MS;
          while (!activeEngineRef.current && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, ENGINE_WAIT_POLL_MS));
          }
          return activeEngineRef.current;
        };
        try {
          await conversations.switchConversation(id);
          const engine = await waitForActiveEngine();
          if (engine && engine.getMessages().length === 0) {
            const history = await loadReplAiConversationHistory(env, id);
            if (history.length > 0) engine.setMessages(history);
          }
          return { ok: true };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error : new Error(String(error), { cause: error }),
            cause: error,
          };
        }
      },
    });
    // `conversations` is a fresh object identity per render; the
    // registerNamespace replace is idempotent (same semantics as ai-chat's
    // useNamespaceRegistration re-subscribe), so re-running on it is safe and
    // keeps the invoke closure's captured switchConversation current.
  }, [actionScope, conversations, env]);

  const data = useMemo(
    () => ({
      connector,
      controller: conversations.controller,
      activeEngine: conversations.activeEngine,
      conversations: conversations.conversations,
      activeConversationId: conversations.activeConversationId,
      tools: mockToolSchemas,
      toolExecutor: mockToolExecutor,
      // onResponseComplete 写回前的占位（afterMessages 三件套 + G11 alert 的
      // 表达式都有定义初值）。形状化占位而非 null：runtime 的 null-member
      // 守卫会把「null 基底的成员访问」判为 scope 未就绪并整节点跳过
      // （afterMessages_1 citations 因此不渲染），pih 种子先例同理——每个被
      // 表达式读取的根都给非 null 初值。
      activeAnswer: { refused: false, sources: [] },
    }),
    [
      connector,
      conversations.controller,
      conversations.activeEngine,
      conversations.conversations,
      conversations.activeConversationId,
    ],
  );

  return (
    <PageFrame testid="ai-knowledge-chat-frame">
      <ShowcaseSchemaHost
        schemaUrl="showcase://ai-knowledge-chat/page"
        schema={aiKnowledgeChatSchema as unknown as SchemaInput}
        env={env}
        data={data}
        actionScope={actionScope}
      />
    </PageFrame>
  );
}
