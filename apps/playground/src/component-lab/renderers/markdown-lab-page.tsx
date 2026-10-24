import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import {
  c6c1MarkdownSanitizeSchema,
  c6c1MarkdownSrcFetcher,
  c6c1MarkdownSrcSchema,
} from './data-c6c1-host';
import type { RendererEnv } from '@nop-chaos/flux-core';

const basicMarkdown = {
  type: 'page',
  body: [
    {
      type: 'markdown',
      testid: 'demo-md-lab',
      content: '## Release notes\n\n- GFM **table** below\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
    },
  ],
};

const codeHighlightSchema = {
  type: 'markdown',
  codeHighlight: true,
  content: [
    '## Code highlight',
    '',
    'Fenced blocks render through the CodeMirror colorize base:',
    '',
    '```js',
    'const answer = 42;',
    'export default answer;',
    '```',
    '',
    'Unknown languages fall back to a plain text pre:',
    '',
    '```whitespace',
    'v .v .v',
    '```',
  ].join('\n'),
};

export function MarkdownLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Markdown content renderer: react-markdown + remark-gfm; allowHtml defaults OFF (literal tags escaped), ON routes through the DOMPurify sanitize gate. Remote src loads through the host env.fetcher (INV-1)."
      scenarios={[
        {
          title: 'Basic markdown with GFM table',
          description: 'Headings, lists and a GFM table render through react-markdown.',
          schema: basicMarkdown,
          data: {},
        },
        {
          title: 'Host dynamic markdown content + sanitize re-verification (C6.1 bug 73 pattern)',
          description:
            'C6.1 Phase 3: the content prop is scope-bound; switching it to a payload containing <script> must be stripped on the UPDATE path too (allowHtml on) — no XSS executes in a real browser.',
          schema: c6c1MarkdownSanitizeSchema,
          data: { mdContent: '## Safe\n\n<b>bold ok</b>' },
        },
        {
          title: 'Code fence syntax highlighting (codeHighlight)',
          description:
            'codeHighlight: true renders fenced blocks through the shared colorize base (lazy-loaded); unknown languages fall back to a plain text pre. Inline code is unaffected.',
          schema: codeHighlightSchema,
        },
        {
          title: 'Host remote src markdown via env.fetcher (C6.1)',
          description:
            'C6.1 Phase 3: markdown src loads through env.fetcher (text response); a failing source shows the error state.',
          schema: c6c1MarkdownSrcSchema,
          data: {},
          env: { fetcher: c6c1MarkdownSrcFetcher } as Partial<RendererEnv>,
        },
      ]}
    />
  );
}
