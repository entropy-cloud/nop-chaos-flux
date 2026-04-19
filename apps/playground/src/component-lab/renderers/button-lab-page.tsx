import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const variantShowcase = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        { type: 'button', label: 'Default' },
        { type: 'button', label: 'Secondary', variant: 'secondary' },
        { type: 'button', label: 'Outline', variant: 'outline' },
        { type: 'button', label: 'Ghost', variant: 'ghost' },
        { type: 'button', label: 'Destructive', variant: 'destructive' },
        { type: 'button', label: 'Disabled', disabled: true }
      ]
    }
  ]
};

const sizeVariants = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      align: 'center',
      gap: 3,
      body: [
        { type: 'button', label: 'Small', size: 'sm' },
        { type: 'button', label: 'Default' },
        { type: 'button', label: 'Large', size: 'lg' }
      ]
    }
  ]
};

const clickCounter = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      align: 'center',
      gap: 4,
      body: [
        { type: 'text', text: 'Clicks: ${clickCount ?? 0}' },
        {
          type: 'button',
          label: 'Increment',
          onClick: { action: 'setValue', args: { path: 'clickCount', value: '${(clickCount ?? 0) + 1}' } }
        },
        {
          type: 'button',
          label: 'Reset',
          variant: 'outline',
          onClick: { action: 'setValue', args: { path: 'clickCount', value: 0 } }
        }
      ]
    }
  ]
};

export function ButtonLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Action button with configurable variant, size, disabled state, and onClick handler. Supports all standard interaction actions."
      scenarios={[
        {
          title: 'All button variants',
          description: 'Default, secondary, outline, ghost, destructive, and disabled states.',
          schema: variantShowcase
        },
        {
          title: 'Size variants',
          description: 'Small (sm), default, and large (lg) sizes.',
          schema: sizeVariants
        },
        {
          title: 'onClick with visible scope side-effect (counter)',
          description: 'Click "Increment" to call setValue and update the clickCount scope variable. The text renderer reacts immediately. Click "Reset" to set it back to zero.',
          schema: clickCounter
        }
      ]}
    />
  );
}
