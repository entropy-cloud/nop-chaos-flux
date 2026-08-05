import type { ActionScope, BaseSchema, RendererEnv } from '@nop-chaos/flux-core';
import { createMockAiConnector, createMockAiEnv } from '../../ai/mock-ai-env.js';
import type { ChatToolCall } from '@nop-chaos/flux-renderers-ai';

/**
 * C8.1 Phase 3 host-scenario schemas + probe registration (real-browser
 * surfaces). Extracted to keep the lab pages within the lint max-lines budget
 * (data-c7-host.ts precedent).
 *
 * Covers the plan failure paths:
 *   host-ai-dialog — ai-chat inside an openDialog surface (bug 73 pattern):
 *                    send a message inside the dialog, the mock connector
 *                    streams a reply and the assistant bubble renders
 *                    (data-role/data-slot stable in the dialog surface).
 *   host-ai-stream — streaming DOM contract: during an in-flight turn the
 *                    message list keeps stable data-role/data-slot markers,
 *                    the bubble carries data-streaming, and abort (cancel)
 *                    returns the sender to the enabled state.
 *   host-ai-hitl   — HITL dead-click special (roadmap C8.x Phase Details):
 *                    pending approval with a WIRED handler → a single approve
 *                    click dispatches once with the toolCallId and flips the
 *                    host-owned state to decided (badge replaces buttons), so
 *                    a rapid second click cannot double-submit; a NO-handler
 *                    card keeps its buttons disabled (dead-click prevention).
 *   host-ai-cc     — ai-conversations sidebar: item click dispatches
 *                    onItemClick with the conversation id/title payload and
 *                    ai-chat receives activeConversationId + fires
 *                    onConversationChange (C8.1 P1-1 real-browser proof).
 */

export const C8_MOCK_ENV: RendererEnv = createMockAiEnv();

// Module-level singleton (lab-only host): connector bound to the mock env.
export const C8_MOCK_CONNECTOR = createMockAiConnector(C8_MOCK_ENV);

const HITL_TOOL_CALL: ChatToolCall = {
  index: 0,
  id: 'call_c8_1',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"Ningbo"}' },
};

export function registerC8Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as {
        __c8Hitl?: string;
        __c8HitlCount?: number;
        __c8ConversationClick?: string;
        __c8ConversationChange?: string;
        __c8SenderSubmit?: string;
        __c8SenderChange?: string;
      };
      if (method === 'hitl') {
        w.__c8Hitl = value;
        w.__c8HitlCount = (w.__c8HitlCount ?? 0) + 1;
      } else if (method === 'conversationChange') {
        w.__c8ConversationChange = value;
      } else if (method === 'senderSubmit') {
        w.__c8SenderSubmit = value;
      } else if (method === 'senderChange') {
        w.__c8SenderChange = value;
      } else {
        w.__c8ConversationClick = value;
      }
      return { ok: true, data: value };
    },
  });
}

export const c8AiChatDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open AI chat dialog',
      testid: 'c8-dialog-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'AI host',
          body: {
            type: 'page',
            body: [
              {
                type: 'ai-chat',
                testid: 'c8-dialog-chat',
                connector: '${connector}',
                placeholder: 'Ask inside the dialog…',
                submitType: 'enter',
                showTimestamp: true,
                className: 'flex flex-col h-[420px] max-w-xl gap-3',
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c8AiStreamSchema = {
  type: 'page',
  body: [
    {
      type: 'ai-chat',
      testid: 'c8-stream-chat',
      connector: '${connector}',
      placeholder: 'Streaming contract…',
      submitType: 'enter',
      className: 'flex flex-col h-[420px] max-w-xl gap-3',
    },
  ],
} as unknown as BaseSchema;

export const c8HitlSchema = {
  type: 'page',
  data: { approval: 'pending' },
  body: [
    {
      type: 'ai-tool-call',
      testid: 'c8-hitl-wired',
      toolCall: HITL_TOOL_CALL,
      defaultOpen: true,
      state: { status: 'running', open: true, approval: '${approval}' },
      onApproval: {
        action: 'probe:hitl',
        args: { value: '${action}|${toolCallId}' },
        then: {
          action: 'setValue',
          args: { path: 'approval', value: '${action === "approve" ? "approved" : "rejected"}' },
        },
      },
    },
    {
      type: 'ai-tool-call',
      testid: 'c8-hitl-no-handler',
      toolCall: { ...HITL_TOOL_CALL, id: 'call_c8_2' },
      defaultOpen: true,
      state: { status: 'running', open: true, approval: 'pending' },
    },
  ],
} as unknown as BaseSchema;

export const c8ConversationsSchema = {
  type: 'page',
  data: {
    conversations: [
      { id: 'c1', title: 'First chat', createdAt: 1, updatedAt: 1 },
      { id: 'c2', title: 'Second chat', createdAt: 2, updatedAt: 2 },
    ],
    activeConversationId: 'c1',
  },
  body: [
    {
      type: 'flex',
      direction: 'row',
      className: 'items-start gap-4',
      body: [
        {
          type: 'ai-conversations',
          testid: 'c8-conversations',
          conversations: '${conversations}',
          activeId: '${activeConversationId}',
          onItemClick: {
            action: 'probe:conversationClick',
            args: { value: '${id}|${conversation.title}' },
            then: {
              action: 'setValue',
              args: { path: 'activeConversationId', value: '${id}' },
            },
          },
          onCreate: {
            action: 'probe:conversationClick',
            args: { value: 'create' },
          },
        },
        {
          type: 'ai-chat',
          testid: 'c8-cc-chat',
          connector: '${connector}',
          activeConversationId: '${activeConversationId}',
          placeholder: 'Conversation change…',
          className: 'flex flex-col h-[320px] w-[420px] gap-3',
          onConversationChange: {
            action: 'probe:conversationChange',
            args: { value: '${conversationId}' },
          },
        },
      ],
    },
  ],
} as unknown as BaseSchema;
