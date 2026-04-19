import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const variantShowcase = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        { type: 'badge', label: 'Default' },
        { type: 'badge', label: 'Secondary', variant: 'secondary' },
        { type: 'badge', label: 'Outline', variant: 'outline' },
        { type: 'badge', label: 'Destructive', variant: 'destructive' }
      ]
    }
  ]
};

const expressionLabel = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 3,
      align: 'center',
      body: [
        { type: 'text', text: 'User status:' },
        { type: 'badge', label: '${status}' }
      ]
    }
  ]
};

const statusVariantMapping = {
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
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'active →' },
            {
              type: 'badge',
              label: 'active',
              variant: 'default'
            }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'pending →' },
            {
              type: 'badge',
              label: 'pending',
              variant: 'secondary'
            }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'error →' },
            {
              type: 'badge',
              label: 'error',
              variant: 'destructive'
            }
          ]
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'Dynamic from scope: ${userStatus} →' },
            {
              type: 'badge',
              label: '${userStatus}',
              variant: '${userStatus === "active" ? "default" : userStatus === "error" ? "destructive" : "secondary"}'
            }
          ]
        }
      ]
    }
  ]
};

export function BadgeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a styled badge or tag with label and optional variant. Label and variant can be driven by scope expressions."
      scenarios={[
        {
          title: 'All badge variants',
          description: 'The four built-in variants: default, secondary, outline, and destructive.',
          schema: variantShowcase
        },
        {
          title: 'Expression-driven label from scope',
          description: 'The label prop accepts a ${...} expression, so the badge content can be dynamic.',
          schema: expressionLabel,
          data: { status: 'Active' }
        },
        {
          title: 'Status-to-variant mapping',
          description: 'Both label and variant can be expressions. The bottom row dynamically picks the variant based on the userStatus scope variable.',
          schema: statusVariantMapping,
          data: { userStatus: 'error' }
        }
      ]}
    />
  );
}
