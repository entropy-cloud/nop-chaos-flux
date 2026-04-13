import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

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
            { type: 'badge', label: 'Admin', variant: 'default' },
            { type: 'badge', label: 'Active', variant: 'secondary' }
          ]
        }
      ]
    }
  ]
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
            { type: 'badge', label: 'Step 1: Fill form' },
            { type: 'text', text: 'Enter your details' }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', label: 'Step 2: Review' },
            { type: 'text', text: 'Confirm before submitting' }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'badge', label: 'Step 3: Submit', variant: 'secondary' },
            { type: 'text', text: 'Send to the server' }
          ]
        }
      ]
    }
  ]
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
        { type: 'badge', label: 'React' },
        { type: 'badge', label: 'TypeScript' },
        { type: 'badge', label: 'Zustand' },
        { type: 'badge', label: 'Tailwind' },
        { type: 'badge', label: 'Vite' },
        { type: 'badge', label: 'Vitest' },
        { type: 'badge', label: 'Recharts', variant: 'secondary' },
        { type: 'badge', label: 'Lucide', variant: 'secondary' }
      ]
    }
  ]
};

export function FlexLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Flexbox container for horizontal or vertical child layout. Supports direction, gap, justify, align, and wrap properties."
      scenarios={[
        {
          title: 'Row with space-between justify',
          description: 'Items are distributed with space between them. Useful for header bars with title on the left and actions on the right.',
          schema: rowWithJustify
        },
        {
          title: 'Column direction with gap',
          description: 'Stacks items vertically with a consistent gap. Useful for step lists, form sections, or card stacks.',
          schema: columnGap
        },
        {
          title: 'Wrapped row for tag clouds',
          description: 'With wrap: true, items overflow into multiple rows. Useful for tag collections or badge lists.',
          schema: wrapVariants
        }
      ]}
    />
  );
}
