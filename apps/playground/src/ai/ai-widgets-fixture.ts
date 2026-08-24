/**
 * Rich markdown fixtures for the `# /ai-widgets` showcase (D1).
 *
 * Content contract: `docs/components/flux-renderers-ai/product-spec.md` §4
 * (D0 product standard). Six presets dispatched by case-insensitive keyword
 * match on the last user message; no match falls back to `default`.
 *
 * 11-element coverage matrix (product-spec §4.2, "each element >= 1 across
 * the six presets"; numbers follow spec §4.1):
 *
 * | element           | weather | code | formula | reasoning | citation | default |
 * | ----------------- | ------- | ---- | ------- | --------- | -------- | ------- |
 * | 1 heading         | y       | y    | y       | y         | y        | y       |
 * | 2 paragraph       | y       | y    | y       | y         | y        | y       |
 * | 3 bullet list     | y       | .    | y       | y         | .        | y       |
 * | 4 ordered list    | y       | y    | .       | .         | y        | .       |
 * | 5 task list (GFM) | .       | .    | .       | y         | .        | .       |
 * | 6 blockquote      | .       | .    | y       | y         | y        | .       |
 * | 7 fenced code     | .       | y    | .       | .         | .        | .       |
 * | 8 inline code     | y       | y    | .       | .         | y        | y       |
 * | 9 link            | y       | .    | .       | .         | y        | y       |
 * | 10 table (GFM)    | y       | .    | .       | .         | .        | .       |
 * | 11 horizontal rule| .       | .    | .       | .         | y        | y       |
 *
 * Constraints honored here:
 * - `default` body starts with the word `Hello` (keeps the existing
 *   `ai-widgets-demo.spec.ts` assertion `toContainText('Hello')` green) and
 *   stays compact (<= ~42 chunks): that assertion allows 10s and the bubble
 *   content currently lands when the stream finishes (see docs/bugs/166 —
 *   ai-chat context does not re-render per chunk), so at 200ms/chunk the
 *   whole default preset must stream in well under 10s.
 * - Keywords never appear in the first sentence of any other preset or of
 *   `default` (echo-collision avoidance, product-spec §4.2).
 * - The math preset keyword is `formula`, never `math` (product-spec §4.3);
 *   `formula` carries LaTeX SOURCE delimiters (`$...$` / `$$...$$`) which
 *   render as KaTeX only after D6.
 */

export type AiWidgetsFixtureId = 'default' | 'weather' | 'code' | 'formula' | 'reasoning' | 'citation';

export interface AiWidgetsFixture {
  id: AiWidgetsFixtureId;
  content: string;
}

export const AI_WIDGETS_FIXTURES: Record<AiWidgetsFixtureId, AiWidgetsFixture> = {
  default: {
    id: 'default',
    content: `Hello! I'm the Flux assistant.

## What I can do

- Stream **rich markdown** token by token
- Format [links](https://example.com/docs) and \`inline code\`

### Ask me

- forecasts, walkthroughs, equations, or quotes

---

*Live from the mock connector.*
`,
  },
  weather: {
    id: 'weather',
    content: `Here's the 7-day outlook for Hangzhou.

## 7-Day Forecast

| Day | Sky | High | Low | Rain |
| --- | --- | --- | --- | --- |
| Mon | Sunny | 32°C | 24°C | 10% |
| Tue | Cloudy | 30°C | 23°C | 25% |
| Wed | Showers | 28°C | 22°C | 70% |
| Thu | Storms | 27°C | 21°C | 90% |

### How to prepare

- Umbrella from Wednesday onward
- Hydrate early in the week

1. Check the \`uv-index\` bulletin first.
2. Radar maps: [city portal](https://example.com/weather).
`,
  },
  code: {
    id: 'code',
    content: `Let's fix the stale-state bug in that counter component.

## Root cause

The interval callback captures \`count\` from the render where it was created, so every tick reads a stale snapshot and the display freezes at zero.

## Fix

\`\`\`tsx
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <span>{count}</span>;
}
\`\`\`

## Next steps

1. Swap the direct read for the functional update.
2. Re-run the component test suite.
3. Ship it — the cleanup also plugs the leak you noticed.
`,
  },
  formula: {
    id: 'formula',
    content: `Let's unpack mass–energy equivalence.

## Block form

$$
E = mc^2
$$

## Where it shows up

- Rest energy scales with mass via $E = mc^2$
- The constant $c \\approx 3 \\times 10^8$ m/s sets the universal speed limit
- Divide by $c^2$ to convert joules to kilograms

> "Imagination is more important than knowledge." — Albert Einstein
`,
  },
  reasoning: {
    id: 'reasoning',
    content: `Working through the routing failure step by step.

## Thought excerpt

> First hypothesis: the request never left the browser. The network panel shows a preflight rejection, which points at custom headers rather than routing.

## Verification checklist

- [x] Reproduce with a minimal payload
- [x] Confirm the failing request is the preflight call
- [ ] Retry with the allowlist mock enabled
- [ ] Inspect the gateway rules for the custom headers

The **most likely cause** is a missing allowlist entry; the checklist above closes the remaining doubt.
`,
  },
  citation: {
    id: 'citation',
    content: `Here's a synthesis of the three sources you shared.

## Key findings

1. Streaming parsers must hold back partial tokens — see [Stream Parsing Patterns](https://example.com/papers/stream-parsing)
2. Back-pressure keeps memory flat under burst — see [Back-pressure Notes](https://example.com/papers/back-pressure)
3. The same principles apply to UI buffers — see [Rendering Streams](https://example.com/papers/rendering-streams)

> "Latency is a product feature; buffers are how you buy it."

---

Each numbered point links to the section that supports it — check \`ref-3\` for the full argument.
`,
  },
};

const KEYWORD_ORDER: ReadonlyArray<{ keyword: string; id: Exclude<AiWidgetsFixtureId, 'default'> }> = [
  { keyword: 'weather', id: 'weather' },
  { keyword: 'code', id: 'code' },
  { keyword: 'formula', id: 'formula' },
  { keyword: 'reasoning', id: 'reasoning' },
  { keyword: 'citation', id: 'citation' },
];

/** Case-insensitive keyword dispatch; unmatched text falls back to `default`. */
export function pickAiWidgetsFixture(lastUserText: string): AiWidgetsFixture {
  const text = lastUserText.toLowerCase();
  for (const { keyword, id } of KEYWORD_ORDER) {
    if (text.includes(keyword)) return AI_WIDGETS_FIXTURES[id];
  }
  return AI_WIDGETS_FIXTURES.default;
}
