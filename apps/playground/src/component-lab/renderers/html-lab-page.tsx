import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c1HtmlSanitizeSchema } from './data-c6c1-host';

const basicHtml = {
  type: 'page',
  body: [
    {
      type: 'html',
      testid: 'demo-html-lab',
      content:
        '<p>Sanitized <strong>HTML</strong> — the script tag below is stripped at render.</p><script>window.__C6C1_HTML_XSS_BASIC__ = true;</script>',
    },
  ],
};

const emptyHtml = {
  type: 'page',
  body: [
    {
      type: 'html',
      testid: 'demo-html-lab-empty',
      content: '',
      empty: 'No HTML content',
    },
  ],
};

export function HtmlLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Raw HTML renderer through dangerouslySetInnerHTML. sanitize defaults ON (DOMPurify strips <script>/event handlers/javascript: URIs); sanitize:false is an explicit trusted escape hatch."
      scenarios={[
        {
          title: 'Basic html with sanitize gate',
          description: 'Safe tags survive; the embedded script is stripped and never executes.',
          schema: basicHtml,
          data: {},
        },
        {
          title: 'Host dynamic html content + sanitize re-verification (C6.1 bug 73 pattern)',
          description:
            'C6.1 Phase 3: the content prop is scope-bound; updating it with a <script> payload must be stripped on the UPDATE path — XSS never executes.',
          schema: c6c1HtmlSanitizeSchema,
          data: { htmlContent: '<p>Safe <strong>html</strong></p>' },
        },
        {
          title: 'Empty state',
          description: 'Empty content renders the empty slot.',
          schema: emptyHtml,
          data: {},
        },
      ]}
    />
  );
}
