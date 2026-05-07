import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const iconGallery = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      align: 'center',
      gap: 4,
      body: [
        { type: 'icon', icon: 'star' },
        { type: 'icon', icon: 'heart' },
        { type: 'icon', icon: 'bell' },
        { type: 'icon', icon: 'settings' },
      ],
    },
  ],
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
            { type: 'icon', icon: 'user' },
            { type: 'text', text: 'Alice Johnson' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'mail' },
            { type: 'text', text: 'alice@example.com' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          align: 'center',
          gap: 2,
          body: [
            { type: 'icon', icon: 'map-pin' },
            { type: 'text', text: 'San Francisco, CA' },
          ],
        },
      ],
    },
  ],
};

export function IconLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a named Lucide icon. Use inline alongside text for labelled icon rows."
      scenarios={[
        {
          title: 'Named icon gallery',
          description:
            'Different Lucide icon names rendered with the current default icon presentation.',
          schema: iconGallery,
        },
        {
          title: 'Inline with text labels',
          description:
            'Icons are commonly used inline in flex rows next to text for labelled list items.',
          schema: inlineWithText,
        },
      ]}
    />
  );
}
