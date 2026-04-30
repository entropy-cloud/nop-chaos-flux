import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const variantShowcase = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'row',
      gap: 2,
      body: [
        { type: 'badge', text: 'Info' },
        { type: 'badge', text: 'Success', level: 'success' },
        { type: 'badge', text: 'Warning', level: 'warning' },
        { type: 'badge', text: 'Danger', level: 'danger' },
      ],
    },
  ],
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
        { type: 'badge', text: '${status}' },
      ],
    },
  ],
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
            { type: 'badge', text: 'active' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'pending →' },
            { type: 'badge', text: 'pending', level: 'warning' },
          ],
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          align: 'center',
          body: [
            { type: 'text', text: 'error →' },
            { type: 'badge', text: 'error', level: 'danger' },
          ],
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
              text: '${userStatus}',
              level:
                '${userStatus === "active" ? "success" : userStatus === "error" ? "danger" : "warning"}',
            },
          ],
        },
      ],
    },
  ],
};

export function BadgeLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Renders a styled badge or tag from text and semantic level. Both text and level can be driven by scope expressions."
      scenarios={[
        {
          title: 'All badge variants',
          description:
            'The live badge renderer maps semantic levels to visual variants: info, success, warning, and danger.',
          schema: variantShowcase,
        },
        {
          title: 'Expression-driven label from scope',
          description:
            'The text prop accepts a ${...} expression, so the badge content can be dynamic.',
          schema: expressionLabel,
          data: { status: 'Active' },
        },
        {
          title: 'Status-to-level mapping',
          description:
            'Both text and level can be expressions. The bottom row dynamically picks the semantic level based on the userStatus scope variable.',
          schema: statusVariantMapping,
          data: { userStatus: 'error' },
        },
      ]}
    />
  );
}
