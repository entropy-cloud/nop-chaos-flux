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

const nameBinding = {
  type: 'page',
  data: { userName: 'Initial' },
  body: [
    { type: 'text', name: 'userName', text: 'fallback', testid: 'bound-name-text' },
    {
      type: 'button',
      label: 'Change Name',
      onClick: {
        action: 'setValue',
        args: { path: 'userName', value: 'Updated' },
      },
    },
  ],
};

const maxLineClamp = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'A'.repeat(400),
      maxLine: 5,
      testid: 'clamped-text',
    },
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
        {
          title: 'Name binding to scope value (write-through echo)',
          description:
            'With a name prop the text binds to the scope variable and re-renders when the scope changes via an action.',
          schema: nameBinding,
        },
        {
          title: 'maxLine clamps in a real browser (CSS variable mechanism)',
          description:
            'maxLine: 5 clamps the text to 5 lines via the line-clamp CSS variable utility.',
          schema: maxLineClamp,
        },
      ]}
    />
  );
}
