import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const sizeVariants = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      align: 'center',
      gap: 4,
      body: [
        { type: 'icon', icon: 'Star', size: 16 },
        { type: 'icon', icon: 'Star', size: 20 },
        { type: 'icon', icon: 'Star', size: 32 },
        { type: 'icon', icon: 'Star', size: 48 }
      ]
    }
  ]
};

const colorVariants = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      align: 'center',
      gap: 3,
      body: [
        { type: 'icon', icon: 'CheckCircle', size: 24, color: '#22c55e' },
        { type: 'icon', icon: 'AlertCircle', size: 24, color: '#f59e0b' },
        { type: 'icon', icon: 'XCircle', size: 24, color: '#ef4444' },
        { type: 'icon', icon: 'Info', size: 24, color: '#6366f1' }
      ]
    }
  ]
};

const inlineWithText = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 2,
      body: [
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'User', size: 16 },
            { type: 'text', text: 'Alice Johnson' }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'Mail', size: 16 },
            { type: 'text', text: 'alice@example.com' }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'MapPin', size: 16 },
            { type: 'text', text: 'San Francisco, CA' }
          ]
        }
      ]
    }
  ]
};

export function IconLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a named Lucide icon with configurable size and optional color. Use inline alongside text for labelled icon rows."
      scenarios={[
        {
          title: 'Size variants',
          description: 'The same icon rendered at 16, 20, 32, and 48px. Size is in pixels.',
          schema: sizeVariants
        },
        {
          title: 'Color variants',
          description: 'Pass a CSS color string to the color prop to tint the icon.',
          schema: colorVariants
        },
        {
          title: 'Inline with text labels',
          description: 'Icons are commonly used inline in flex rows next to text for labelled list items.',
          schema: inlineWithText
        }
      ]}
    />
  );
}
