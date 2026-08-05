import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C7 Phase 3 host-scenario schemas + probe registration (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-pr-dialog — pull-refresh inside an openDialog surface (bug 73 pattern):
 *                    a downward pull past the threshold dispatches onRefresh
 *                    with the args resolving ${direction}|${threshold} from the
 *                    event payload (P1 evaluationBindings proof).
 *   host-is-dialog — infinite-scroll inside an openDialog surface (bug 73
 *                    pattern): immediateCheck fires onLoadMore with
 *                    ${source} resolving to 'immediate'.
 *   host-is-retry — infinite-scroll load failure: error state text + retry
 *                    button resumes loading (${source} = 'retry').
 *   host-sw-action — swipe-cell rows: swipe reveals the left action region,
 *                    clicking the action button dispatches onAction with
 *                    ${side}|${index} resolving (payload + row scope).
 *   host-cd-finish — countdown reaches zero: data-finished flips and onFinish
 *                    dispatches ${type} = 'finish' exactly once.
 *   host-nb-close — closable notice-bar close dispatches onClose + unmounts.
 *   host-nb-click — notice-bar with onClick is role=button and clickable.
 */

const DIALOG_ITEMS = '第一页数据项\n第二页数据项\n第三页数据项';

export function registerC7Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as Record<string, string | undefined>;
      w[`__c7${method}`] = value;
      return { ok: true, data: value };
    },
  });
}

export const c7DialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open mobile host dialog',
      testid: 'c7-dialog-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Mobile host',
          body: {
            type: 'page',
            body: [
              {
                type: 'pull-refresh',
                testid: 'c7-dialog-pr',
                threshold: 50,
                onRefresh: {
                  action: 'probe:refresh',
                  args: { value: '${direction}|${threshold}' },
                },
                body: [
                  {
                    type: 'text',
                    text: 'Dialog pull-refresh body — pull down to refresh',
                    testid: 'c7-dialog-pr-body',
                  },
                ],
              },
              {
                type: 'infinite-scroll',
                testid: 'c7-dialog-is',
                immediateCheck: true,
                onLoadMore: {
                  action: 'probe:loadMore',
                  args: { value: '${source}' },
                },
                body: [
                  {
                    type: 'text',
                    text: DIALOG_ITEMS,
                    testid: 'c7-dialog-is-body',
                  },
                ],
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c7RetrySchema = {
  type: 'page',
  body: [
    {
      type: 'infinite-scroll',
      testid: 'c7-retry',
      immediateCheck: false,
      hasMore: true,
      error: true,
      errorText: '加载失败，点击重试',
      onLoadMore: {
        action: 'probe:loadMore',
        args: { value: '${source}' },
      },
      body: [
        {
          type: 'text',
          text: '失败重试宿主 — 点击重试按钮恢复加载',
          testid: 'c7-retry-body',
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c7SwipeSchema = {
  type: 'page',
  data: { rows: ['消息一', '消息二', '消息三'] },
  body: [
    {
      type: 'loop',
      items: '${rows}',
      body: [
        {
          type: 'swipe-cell',
          testid: 'c7-swipe-row',
          threshold: 30,
          onAction: {
            action: 'probe:action',
            args: { value: '${side}|${$slot.index}' },
          },
          body: [
            {
              type: 'text',
              text: '${$slot.item}',
              testid: 'c7-swipe-body',
            },
          ],
          left: [
            {
              type: 'button',
              label: '归档',
              variant: 'outline',
              size: 'sm',
              testid: 'c7-swipe-archive',
            },
          ],
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c7CountdownSchema = {
  type: 'page',
  body: [
    {
      type: 'countdown',
      testid: 'c7-countdown',
      time: 1_500,
      format: 'ss',
      prefix: '剩余 ',
      suffix: ' 结束',
      onFinish: {
        action: 'probe:finish',
        args: { value: '${type}' },
      },
    },
    {
      type: 'text',
      text: '倒计时结束宿主 — 归零后 data-finished=true 且 onFinish 派发一次',
      testid: 'c7-countdown-note',
    },
  ],
} as unknown as BaseSchema;

export const c7NoticeSchema = {
  type: 'page',
  body: [
    {
      type: 'notice-bar',
      testid: 'c7-notice-close',
      text: '可关闭通知 — 点击关闭按钮后消失',
      variant: 'info',
      closable: true,
      onClose: {
        action: 'probe:noticeClose',
        args: { value: 'closed' },
      },
    },
    {
      type: 'notice-bar',
      testid: 'c7-notice-click',
      text: '可点击通知 — 点击整条触发 onClick',
      variant: 'warning',
      onClick: {
        action: 'probe:noticeClick',
        args: { value: 'clicked' },
      },
    },
    {
      type: 'notice-bar',
      testid: 'c7-notice-static',
      text: '静态公告 — role=status 不可聚焦',
      variant: 'success',
    },
  ],
} as unknown as BaseSchema;
