/**
 * Schema for the `/#/ai-coverage` e2e page — every AI renderer surface that
 * the gantt/ai e2e coverage plan (docs/plans/2026-07-25-2) needs but the
 * focused demo pages do not host: chat states (slow/flaky/eof/no-connector/
 * null-engine), bubble content gallery, sender modes, widget edge states,
 * tool-call states, citations variants and attachment limits.
 *
 * Event probes write scalar page-scope values (`setValue`) that the spec
 * asserts through the `cov-probe-*` text nodes at the top.
 */

const TOOL_CALL = {
  index: 0,
  id: 'call_cov_demo',
  type: 'function',
  function: { name: 'get_weather', arguments: '{\n  "city": "Berlin",\n  "unit": "c"\n}' },
};

const USER_MSG = { id: 'cov-user-1', role: 'user', content: 'edit this message', metadata: { createdAt: 1750000000000 } };
const ASSISTANT_MSG = { id: 'cov-assistant-1', role: 'assistant', content: 'coverage assistant answer', metadata: { createdAt: 1750000001000 } };

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const COVERAGE_SCHEMA = {
  type: 'page',
  body: [
    { type: 'text', text: 'COMPLETE:${completeProbe}', testid: 'cov-probe-complete' },
    { type: 'text', text: 'ERROR:${errorProbe}', testid: 'cov-probe-error' },
    { type: 'text', text: 'PROMPT:${promptProbe}', testid: 'cov-probe-prompt' },
    { type: 'text', text: 'FEEDBACK:${feedbackProbe}', testid: 'cov-probe-feedback' },
    { type: 'text', text: 'TOKEN:${tokenProbe}', testid: 'cov-probe-token' },
    { type: 'text', text: 'SUGGESTION:${suggestionProbe}', testid: 'cov-probe-suggestion' },
    { type: 'text', text: 'TOOL:${toolProbe}', testid: 'cov-probe-tool' },
    { type: 'text', text: 'CITATION:${citationProbe}', testid: 'cov-probe-citation' },
    { type: 'text', text: 'ATTERR:${attachmentErrorProbe}', testid: 'cov-probe-att-error' },
    { type: 'text', text: 'SENDCTRL:${ctrlSendProbe}', testid: 'cov-probe-ctrl-send' },
    { type: 'text', text: 'SENDSHIFT:${shiftSendProbe}', testid: 'cov-probe-shift-send' },
    { type: 'text', text: 'CONVCREATE:${convCreateProbe}', testid: 'cov-probe-conv-create' },
    { type: 'text', text: 'CONVRENAME:${convRenameProbe}', testid: 'cov-probe-conv-rename' },
    { type: 'text', text: 'CONVDELETE:${convDeleteProbe}', testid: 'cov-probe-conv-delete' },
    { type: 'text', text: 'CONVCLICK:${convClickProbe}', testid: 'cov-probe-conv-click' },
    { type: 'text', text: 'VOICE:${voiceResultProbe}', testid: 'cov-probe-voice' },

    {
      type: 'ai-chat',
      testid: 'cov-chat-slow',
      connector: '${connectors.slow}',
      placeholder: 'Slow coverage chat',
      submitType: 'enter',
      className: 'border rounded-md p-2 h-[26rem] flex flex-col',
      header: { type: 'text', text: 'cov-header-content', testid: 'cov-header-text' },
      beforeMessages: { type: 'text', text: 'cov-before-content', testid: 'cov-before-text' },
      afterMessages: { type: 'ai-attachments', testid: 'cov-att-in-chat' },
      footer: { type: 'text', text: 'cov-footer-content', testid: 'cov-footer-text' },
      emptyState: { type: 'text', text: 'cov-empty-content', testid: 'cov-empty-text' },
      onResponseComplete: { action: 'setValue', args: { path: 'completeProbe', value: 'fired' } },
    },
    {
      type: 'ai-chat',
      testid: 'cov-chat-flaky',
      connector: '${connectors.flaky}',
      placeholder: 'Flaky chat',
      submitType: 'enter',
      className: 'border rounded-md p-2 h-80 flex flex-col',
      onError: { action: 'setValue', args: { path: 'errorProbe', value: 'fired' } },
    },
    {
      type: 'ai-chat',
      testid: 'cov-chat-eof',
      connector: '${connectors.eof}',
      placeholder: 'EOF chat',
      submitType: 'enter',
      className: 'border rounded-md p-2 h-80 flex flex-col',
    },
    { type: 'ai-chat', testid: 'cov-chat-noconnector', className: 'border rounded-md p-2 h-40' },
    {
      type: 'ai-chat',
      testid: 'cov-chat-nullengine',
      engine: '${engines.nullEngine}',
      emptyState: { type: 'text', text: 'cov-nullengine-empty-content', testid: 'cov-nullengine-empty' },
      className: 'border rounded-md p-2 h-40',
    },
    {
      type: 'ai-chat',
      testid: 'cov-edit-chat',
      connector: '${connectors.mock}',
      placeholder: 'Edit chat',
      showTimestamp: true,
      initialMessages: [USER_MSG, ASSISTANT_MSG],
      className: 'border rounded-md p-2 h-96 flex flex-col',
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-corner',
      message: { id: 'cov-b1', role: 'assistant', content: 'corner shaped' },
      shape: 'corner',
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-avatar',
      message: { id: 'cov-b2', role: 'assistant', content: 'with avatar', metadata: { createdAt: 1750000002000 } },
      showAvatar: true,
      showTimestamp: true,
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-markdown',
      message: {
        id: 'cov-b3',
        role: 'assistant',
        content: '# Coverage Heading\n\nSome **bold** text.\n\n```ts\nconst answer = 42;\n```',
      },
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-reasoning',
      message: { id: 'cov-b4', role: 'assistant', content: 'final answer', reasoning_content: 'coverage thinking trace' },
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-image',
      message: {
        id: 'cov-b5',
        role: 'assistant',
        content: [
          { type: 'text', text: 'two images' },
          { type: 'image_url', image_url: { url: TINY_PNG_DATA_URL } },
          { type: 'image_url', image_url: { url: TINY_PNG_DATA_URL } },
        ],
      },
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-datapart',
      message: {
        id: 'cov-b6',
        role: 'assistant',
        content: [{ type: 'data-chart', id: 'chart-1', data: { kind: 'bar', values: [1, 2, 3] } }],
      },
    },
    {
      type: 'ai-bubble',
      testid: 'cov-bubble-error',
      message: { id: 'cov-b7', role: 'assistant', content: '', metadata: { isError: true } },
    },
    { type: 'ai-sender', testid: 'cov-sender-ctrl', submitType: 'ctrlEnter', onSubmit: { action: 'setValue', args: { path: 'ctrlSendProbe', value: 'fired' } } },
    { type: 'ai-sender', testid: 'cov-sender-shift', submitType: 'shiftEnter', onSubmit: { action: 'setValue', args: { path: 'shiftSendProbe', value: 'fired' } } },
    { type: 'ai-sender', testid: 'cov-sender-limit', maxLength: 5, showWordLimit: true },
    { type: 'ai-sender', testid: 'cov-sender-loading', loading: true },
    {
      type: 'ai-welcome',
      testid: 'cov-welcome-left',
      icon: '🤖',
      title: 'Coverage Welcome',
      description: 'left aligned welcome panel',
      align: 'left',
      footer: { type: 'text', text: 'cov-welcome-footer-content', testid: 'cov-welcome-footer' },
    },
    {
      type: 'ai-welcome',
      testid: 'cov-welcome-right',
      title: 'Right Welcome',
      description: 'right aligned welcome panel',
      align: 'right',
    },
    {
      type: 'ai-prompts',
      testid: 'cov-prompts-vertical',
      layout: 'vertical',
      items: [
        { label: 'Prompt One', description: 'first description', badge: 'NEW' },
        { label: 'Prompt Two' },
      ],
      onSelect: { action: 'setValue', args: { path: 'promptProbe', value: 'fired' } },
    },
    { type: 'ai-prompts', testid: 'cov-prompts-empty', items: [] },
    { type: 'ai-prompts', testid: 'cov-prompts-horizontal', layout: 'horizontal', items: [{ label: 'H One' }, { label: 'H Two' }] },
    {
      type: 'ai-feedback',
      testid: 'cov-feedback-vote',
      actions: ['like', 'dislike'],
      message: { id: 'cov-fb1', role: 'assistant', content: 'feedback target message' },
      onAction: { action: 'setValue', args: { path: 'feedbackProbe', value: 'fired' } },
    },
    {
      type: 'ai-feedback',
      testid: 'cov-feedback-copy',
      message: { id: 'cov-fb2', role: 'assistant', content: 'copyable feedback message' },
    },
    { type: 'ai-token-usage', testid: 'cov-token-empty', message: { id: 'cov-t0', role: 'assistant', content: '' } },
    {
      type: 'ai-token-usage',
      testid: 'cov-token-ring',
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 250, cost: 0.0025 },
      contextLimit: 500,
      onClick: { action: 'setValue', args: { path: 'tokenProbe', value: 'fired' } },
    },
    {
      type: 'ai-suggestions',
      testid: 'cov-suggestions-scroll',
      overflowMode: 'scroll',
      items: [{ text: 'S1' }, { text: 'S2' }, { text: 'S3' }, { text: 'S4' }, { text: 'S5' }],
      onSelect: { action: 'setValue', args: { path: 'suggestionProbe', value: 'fired' } },
    },
    {
      type: 'ai-suggestions',
      testid: 'cov-suggestions-popover',
      overflowMode: 'popover',
      maxVisible: 2,
      items: [{ text: 'P1' }, { text: 'P2' }, { text: 'P3' }, { text: 'P4' }],
    },
    { type: 'ai-suggestions', testid: 'cov-suggestions-empty', items: [] },
    { type: 'ai-tool-call', testid: 'cov-tool-running', toolCall: TOOL_CALL, state: { status: 'running' } },
    { type: 'ai-tool-call', testid: 'cov-tool-success', toolCall: TOOL_CALL, state: { status: 'success' } },
    { type: 'ai-tool-call', testid: 'cov-tool-failed', toolCall: TOOL_CALL, state: { status: 'failed' } },
    { type: 'ai-tool-call', testid: 'cov-tool-args', toolCall: TOOL_CALL, defaultOpen: true, state: { status: 'success' } },
    { type: 'ai-tool-call', testid: 'cov-tool-pending-nohandler', toolCall: TOOL_CALL, state: { status: 'running', approval: 'pending' } },
    {
      type: 'ai-tool-call',
      testid: 'cov-tool-pending',
      toolCall: TOOL_CALL,
      state: { status: 'running', approval: 'pending', open: true },
      onApproval: { action: 'setValue', args: { path: 'toolProbe', value: 'fired' } },
    },
    { type: 'ai-tool-call', testid: 'cov-tool-approved', toolCall: TOOL_CALL, state: { status: 'success', approval: 'approved' } },
    { type: 'ai-tool-call', testid: 'cov-tool-rejected', toolCall: TOOL_CALL, state: { status: 'failed', approval: 'rejected' } },
    {
      type: 'ai-citations',
      testid: 'cov-citations-list',
      mode: 'list',
      sources: [
        { index: 1, title: 'Listed Source', snippet: 'list snippet', url: 'https://coverage.example.com/source-1' },
        { index: 2, title: 'No URL Source', snippet: 'no url snippet' },
      ],
      onSourceClick: { action: 'setValue', args: { path: 'citationProbe', value: 'fired' } },
    },
    {
      type: 'ai-citations',
      testid: 'cov-citations-inline',
      message: { id: 'cov-c1', role: 'assistant', content: 'Cites [1] plus [2] and missing [5].' },
      sources: [
        { index: 1, title: 'Inline One', snippet: 'first' },
        { index: 2, title: 'Inline Two', snippet: 'second' },
      ],
    },
    {
      type: 'ai-attachments',
      testid: 'cov-att-limits',
      maxSize: 100,
      maxFiles: 2,
      onError: { action: 'setValue', args: { path: 'attachmentErrorProbe', value: 'fired' } },
    },
    {
      type: 'ai-voice-input',
      testid: 'cov-voice',
      onResult: { action: 'setValue', args: { path: 'voiceResultProbe', value: 'fired' } },
    },
    {
      type: 'ai-conversations',
      testid: 'cov-convs-static',
      conversations: [
        { id: 'cs1', title: 'Active Conversation' },
        { id: 'cs2', title: 'Second Conversation' },
      ],
      activeId: 'cs1',
      showRenameControls: false,
    },
    {
      type: 'ai-conversations',
      testid: 'cov-convs',
      conversations: [
        { id: 'cc1', title: 'First Chat' },
        { id: 'cc2', title: 'Second Chat' },
        { id: 'cc3', title: 'Third Chat' },
      ],
      activeId: '${covActiveId}',
      onCreate: { action: 'setValue', args: { path: 'convCreateProbe', value: 'fired' } },
      onItemClick: { action: 'setValue', args: { path: 'covActiveId', value: '${id}' } },
      onItemRename: { action: 'setValue', args: { path: 'convRenameProbe', value: 'fired' } },
      onItemDelete: { action: 'setValue', args: { path: 'convDeleteProbe', value: 'fired' } },
    },
  ],
} as const;
