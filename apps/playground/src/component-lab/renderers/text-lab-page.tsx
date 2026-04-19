import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const interpolation = {
  type: 'page',
  body: [
    { type: 'text', text: 'Plain string text — no interpolation.' },
    { type: 'text', text: 'Hello, ${name}! You have ${count} messages.' }
  ]
};

const expressionOnly = {
  type: 'page',
  body: [
    { type: 'text', text: 'Score: ${score}' },
    { type: 'text', text: 'Grade: ${score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F"}' },
    { type: 'text', text: 'Pass: ${score >= 50 ? "Yes" : "No"}' }
  ]
};

const htmlMode = {
  type: 'page',
  body: [
    { type: 'text', html: true, text: 'This is <strong>bold</strong> and <em>italic</em> text.' },
    { type: 'text', html: true, text: 'Styled: <span style="color:#6366f1;font-weight:600">Indigo highlight</span>' }
  ]
};

export function TextLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a text string from a literal value or scope expression. Supports template interpolation and optional HTML mode."
      scenarios={[
        {
          title: 'Literal and interpolated text',
          description: 'Use ${expression} inside the text string to embed scope values.',
          schema: interpolation,
          data: { name: 'Alice', count: 3 }
        },
        {
          title: 'Expression-only computed display',
          description: 'The text value can be a pure expression that computes a derived result from scope data.',
          schema: expressionOnly,
          data: { score: 82 }
        },
        {
          title: 'HTML mode',
          description: 'Set html: true to render the text as HTML. Use sparingly — only for trusted content.',
          schema: htmlMode
        }
      ]}
    />
  );
}
