import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const interpolation = {
  type: 'page',
  body: [
    { type: 'text', text: 'Plain string text — no interpolation.' },
    { type: 'text', text: 'Hello, ${name}! You have ${count} messages.' },
  ],
};

const expressionOnly = {
  type: 'page',
  body: [
    { type: 'text', text: 'Score: ${score}' },
    {
      type: 'text',
      text: 'Grade: ${score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "F"}',
    },
    { type: 'text', text: 'Pass: ${score >= 50 ? "Yes" : "No"}' },
  ],
};

const tagVariants = {
  type: 'page',
  body: [
    { type: 'text', tag: 'h3', text: 'Section heading rendered via tag prop' },
    { type: 'text', tag: 'p', text: 'Body copy remains plain text even when the tag changes.' },
    { type: 'text', tag: 'label', text: 'Compact label-style text renderer output.' },
  ],
};

export function TextLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a text string from a literal value or scope expression. Supports template interpolation and semantic tag selection."
      scenarios={[
        {
          title: 'Literal and interpolated text',
          description: 'Use ${expression} inside the text string to embed scope values.',
          schema: interpolation,
          data: { name: 'Alice', count: 3 },
        },
        {
          title: 'Expression-only computed display',
          description:
            'The text value can be a pure expression that computes a derived result from scope data.',
          schema: expressionOnly,
          data: { score: 82 },
        },
        {
          title: 'Semantic tag variants',
          description:
            'The tag prop changes the semantic wrapper element while preserving plain-text rendering.',
          schema: tagVariants,
        },
      ]}
    />
  );
}
