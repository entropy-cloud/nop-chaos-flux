import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const rowWithJustify = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      justify: 'between',
      align: 'center',
      className: 'border rounded-lg p-3',
      body: [
        { type: 'text', text: 'User Profile' },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', text: 'Admin', level: 'success' },
            { type: 'badge', text: 'Active', level: 'info' },
          ],
        },
      ],
    },
  ],
};

const columnGap = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 3,
      body: [
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', text: 'Step 1: Fill form', level: 'info' },
            { type: 'text', text: 'Enter your details' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', text: 'Step 2: Review', level: 'info' },
            { type: 'text', text: 'Confirm before submitting' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', text: 'Step 3: Submit', level: 'info' },
            { type: 'text', text: 'Send to the server' },
          ],
        },
      ],
    },
  ],
};

const wrapVariants = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      wrap: true,
      gap: 2,
      body: [
        { type: 'badge', text: 'React', level: 'info' },
        { type: 'badge', text: 'TypeScript', level: 'info' },
        { type: 'badge', text: 'Zustand', level: 'info' },
        { type: 'badge', text: 'Tailwind', level: 'info' },
        { type: 'badge', text: 'Vite', level: 'info' },
        { type: 'badge', text: 'Vitest', level: 'info' },
        { type: 'badge', text: 'Recharts', level: 'info' },
        { type: 'badge', text: 'Lucide', level: 'info' },
      ],
    },
  ],
};

export function FlexLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Flexbox container for horizontal or vertical child layout. Supports direction, gap, justify, align, and wrap properties."
      scenarios={[
        {
          title: 'Row with space-between justify',
          description:
            'Items are distributed with space between them. Useful for header bars with title on the left and actions on the right.',
          schema: rowWithJustify,
        },
        {
          title: 'Column direction with gap',
          description:
            'Stacks items vertically with a consistent gap. Useful for step lists, form sections, or card stacks.',
          schema: columnGap,
        },
        {
          title: 'Wrapped row for tag clouds',
          description:
            'With wrap: true, items overflow into multiple rows. Useful for tag collections or badge lists.',
          schema: wrapVariants,
        },
      ]}
    />
  );
}
