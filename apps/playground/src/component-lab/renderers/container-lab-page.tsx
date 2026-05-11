import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const withHeaderBodyFooter = {
  type: 'page',
  body: [
    {
      type: 'container',
      className: 'rounded-xl border bg-card',
      headerClassName: 'px-4 pt-4',
      bodyClassName: 'px-4',
      footerClassName: 'px-4 pb-4',
      header: [{ type: 'text', text: 'User Account', className: 'font-semibold text-base' }],
      body: [
        { type: 'text', text: 'Name: Alice Johnson' },
        { type: 'text', text: 'Role: Administrator' },
        { type: 'text', text: 'Email: alice@example.com' },
      ],
      footer: [{ type: 'badge', label: 'Active', variant: 'default' }],
    },
  ],
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
            { type: 'badge', label: 'New', variant: 'secondary' },
          ],
        },
        {
          type: 'container',
          className: 'border rounded-lg p-3 bg-[var(--nop-hero-bg)]',
          body: [
            { type: 'text', text: 'Card B' },
            { type: 'badge', label: 'Featured', variant: 'default' },
          ],
        },
      ],
    },
  ],
};

export function ContainerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Generic content shell with optional header, body, and footer regions. Container provides slot structure and default body flow; card chrome and padding stay explicit through root or slot className props."
      scenarios={[
        {
          title: 'Container with header, body, and footer',
          description:
            'Each region is independently populated. This example keeps the container baseline honest by adding padding explicitly through header/body/footer className props instead of relying on any hidden default.',
          schema: withHeaderBodyFooter,
        },
        {
          title: 'Card layout via className',
          description:
            'Container emits no card styling itself. Pass explicit className values to create bordered card shells around the body content.',
          schema: withClassNameCard,
        },
      ]}
    />
  );
}
