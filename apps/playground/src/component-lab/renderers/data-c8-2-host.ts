import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';
import type { ChatToolCall } from '@nop-chaos/flux-renderers-ai';

/**
 * C8.2 Phase 3 host-scenario schemas + probe registration (real-browser
 * surfaces). Extracted to keep the lab pages within the lint max-lines budget
 * (data-c8-1-host.ts precedent).
 *
 * Covers the plan failure paths:
 *   host-tool-dialog  — ai-tool-call inside an openDialog surface (bug 73
 *                       pattern): host-driven status transition running →
 *                       success + args expand/collapse in the dialog.
 *   host-hitl-dead    — HITL dead-click special: a pending approval with a
 *                       WIRED handler → rapid double click dispatches exactly
 *                       once, the host-owned state flips to decided (badge
 *                       replaces buttons); a NO-handler card stays disabled.
 *   host-attach-dialog— ai-attachments inside an openDialog surface (bug 73
 *                       pattern): real file pick → image thumbnail renders in
 *                       the dialog, remove works, too-large fires onError.
 *   host-attach-safety— attachment URL/file-name safety: a controlled value
 *                       with a `javascript:` URL never becomes an anchor; a
 *                       malicious file name renders as escaped text.
 *   host-citation-clk — ai-citations inline: `[N]` markers render, the
 *                       popover source card shows the title, onSourceClick
 *                       payload `${index}|${source.title}` resolves via ctx.
 *   host-feedback     — ai-feedback: like/dislike local echo (data-active
 *                       presence toggles) + onAction payload
 *                       `${action}|${message.id}` resolves via ctx.
 *   host-token-usage  — ai-token-usage: metadata.usage renders
 *                       total/prompt/completion, data-empty placeholder when
 *                       missing, onClick `${usage.total_tokens}` resolves.
 */

const TOOL_CALL: ChatToolCall = {
  index: 0,
  id: 'call_c8_2',
  type: 'function',
  function: { name: 'get_weather', arguments: '{"city":"Hangzhou"}' },
};

export function registerC82Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as Record<string, string | number | undefined>;
      const key = `__c82${method[0].toUpperCase()}${method.slice(1)}`;
      const countKey = `${key}Count`;
      w[key] = value;
      w[countKey] = ((w[countKey] as number | undefined) ?? 0) + 1;
      return { ok: true, data: value };
    },
  });
}

export const c82ToolDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open tool-call dialog',
      testid: 'c82-tool-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Tool host',
          body: {
            type: 'page',
            data: { toolStatus: 'running' },
            body: [
              {
                type: 'ai-tool-call',
                testid: 'c82-tool-in-dialog',
                toolCall: TOOL_CALL,
                defaultOpen: false,
                // `open` is intentionally NOT part of the controlled state:
                // state.open !== undefined would pin the toggle closed
                // (controlled mode — host must wire onToggle instead).
                state: { status: '${toolStatus}' },
              },
              {
                type: 'button',
                label: 'Mark success',
                testid: 'c82-tool-success',
                onClick: { action: 'setValue', args: { path: 'toolStatus', value: 'success' } },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c82HitlSchema = {
  type: 'page',
  data: { approval: 'pending' },
  body: [
    {
      type: 'ai-tool-call',
      testid: 'c82-hitl-wired',
      toolCall: TOOL_CALL,
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
      testid: 'c82-hitl-no-handler',
      toolCall: { ...TOOL_CALL, id: 'call_c8_2_nohandler' },
      defaultOpen: true,
      state: { status: 'running', open: true, approval: 'pending' },
    },
  ],
} as unknown as BaseSchema;

export const c82AttachDialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open attachments dialog',
      testid: 'c82-attach-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Attachments host',
          body: {
            type: 'page',
            body: [
              {
                type: 'ai-attachments',
                testid: 'c82-attach-in-dialog',
                accept: 'image/*',
                multiple: true,
                maxSize: 5242880,
                onError: {
                  action: 'probe:attachError',
                  args: { value: '${reason}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c82AttachSafetySchema = {
  type: 'page',
  data: {
    evilImage: [
      {
        id: 's1',
        url: 'javascript:alert(1)',
        name: 'evil.png',
        contentType: 'image/png',
      },
    ],
    evilCard: [
      {
        id: 's2',
        url: 'javascript:alert(1)',
        name: '<img src=x onerror=alert(1)>.pdf',
        contentType: 'application/pdf',
      },
    ],
  },
  body: [
    {
      type: 'ai-attachments',
      testid: 'c82-attach-safety-img',
      value: '${evilImage}',
    },
    {
      type: 'ai-attachments',
      testid: 'c82-attach-safety-card',
      value: '${evilCard}',
    },
  ],
} as unknown as BaseSchema;

export const c82CitationsSchema = {
  type: 'page',
  data: {
    msg: {
      id: 'm_cit',
      role: 'assistant',
      content: 'See [1] and [2] for details',
      metadata: {
        sources: [
          { index: 1, title: 'Doc A', url: 'https://source-a.example' },
          { index: 2, title: 'Doc B' },
        ],
      },
    },
  },
  body: [
    {
      type: 'ai-citations',
      testid: 'c82-citations',
      message: '${msg}',
      onSourceClick: {
        action: 'probe:citation',
        args: { value: '${index}|${source.title}' },
      },
    },
  ],
} as unknown as BaseSchema;

export const c82FeedbackSchema = {
  type: 'page',
  body: [
    {
      type: 'ai-feedback',
      testid: 'c82-feedback',
      actions: ['like', 'dislike', 'copy'],
      message: { id: 'm_fb', role: 'assistant', content: 'hello world' },
      onAction: {
        action: 'probe:feedback',
        args: { value: '${action}|${message.id}' },
      },
    },
  ],
} as unknown as BaseSchema;

export const c82TokenUsageSchema = {
  type: 'page',
  data: {
    msg: {
      id: 'm_tok',
      role: 'assistant',
      content: '',
      metadata: { usage: { total_tokens: 42, prompt_tokens: 40, completion_tokens: 2 } },
    },
    emptyMsg: { id: 'm_empty', role: 'assistant', content: '' },
  },
  body: [
    {
      type: 'ai-token-usage',
      testid: 'c82-token',
      message: '${msg}',
      contextLimit: 1000,
      onClick: {
        action: 'probe:token',
        args: { value: '${usage.total_tokens}' },
      },
    },
    {
      type: 'ai-token-usage',
      testid: 'c82-token-empty',
      message: '${emptyMsg}',
    },
  ],
} as unknown as BaseSchema;
