import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const withTitleAndFooter = {
  type: 'page',
  title: 'Team Dashboard',
  header: [
    {
      type: 'flex',
      body: [
        { type: 'text', text: 'Acme Corp' },
        { type: 'badge', text: 'v2.4.1', level: 'info' },
      ],
    },
  ],
  body: [
    { type: 'text', text: 'Welcome to the team dashboard. Select a section to get started.' },
    {
      type: 'flex',
      body: [
        { type: 'badge', text: 'Active Members: 12', level: 'success' },
        { type: 'badge', text: 'Open Tasks: 5', level: 'danger' },
      ],
    },
  ],
  footer: [{ type: 'text', text: 'Last updated: 2026-04-12' }],
};

const bodyOnly = {
  type: 'page',
  body: [
    { type: 'text', text: 'A minimal page with only a body region.' },
    {
      type: 'text',
      text: 'Header and footer are optional — omit them to get a plain content container.',
    },
  ],
};

export function PageLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Root page container that provides the top-level scope, title, header, body, and footer regions. Always the outermost node in a schema tree."
      scenarios={[
        {
          title: 'Page with title, header, body, and footer',
          description:
            'Shows all four regions populated: a nav-bar header, body content with badges, and a footer timestamp.',
          schema: withTitleAndFooter,
        },
        {
          title: 'Body-only page',
          description:
            'Header and footer regions are optional. Omit them for a minimal content wrapper.',
          schema: bodyOnly,
        },
      ]}
    />
  );
}
