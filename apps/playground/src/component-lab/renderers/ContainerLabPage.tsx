import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const withHeaderBodyFooter = {
  type: 'page',
  body: [
    {
      type: 'container',
      className: 'border rounded-xl overflow-hidden',
      header: [
        { type: 'text', text: 'User Account', className: 'font-semibold text-base' }
      ],
      body: [
        { type: 'text', text: 'Name: Alice Johnson' },
        { type: 'text', text: 'Role: Administrator' },
        { type: 'text', text: 'Email: alice@example.com' }
      ],
      footer: [
        { type: 'badge', label: 'Active', variant: 'default' }
      ]
    }
  ]
};

const withClassNameCard = {
  type: 'page',
  body: [
    {
      type: 'flex',
      body: [
        {
          type: 'container',
          className: 'border rounded-lg p-3 bg-[var(--nop-hero-bg)]',
          body: [
            { type: 'text', text: 'Card A' },
            { type: 'badge', label: 'New', variant: 'secondary' }
          ]
        },
        {
          type: 'container',
          className: 'border rounded-lg p-3 bg-[var(--nop-hero-bg)]',
          body: [
            { type: 'text', text: 'Card B' },
            { type: 'badge', label: 'Featured', variant: 'default' }
          ]
        }
      ]
    }
  ]
};

export function ContainerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Generic layout container with optional header, body, and footer regions. Use className to apply visual card styling or custom borders."
      scenarios={[
        {
          title: 'Container with header, body, and footer',
          description: 'Each region is independently populated. The header holds the title, the body holds main content, and the footer holds status badges.',
          schema: withHeaderBodyFooter
        },
        {
          title: 'Card layout via className',
          description: 'Container emits no visual styles itself. Pass className to wrap content in a styled card.',
          schema: withClassNameCard
        }
      ]}
    />
  );
}
