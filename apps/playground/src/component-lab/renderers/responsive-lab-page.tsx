import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const breakpointVariants = {
  type: 'page',
  body: [
    {
      type: 'responsive',
      testid: 'demo-responsive-breakpoints',
      variants: [
        { key: 'mobile', max: 'lg', body: [{ type: 'text', text: 'MOBILE TREE (max lg)' }] },
        { key: 'desktop', body: [{ type: 'text', text: 'DESKTOP TREE (default)' }] },
      ],
    },
  ],
};

const numericVariants = {
  type: 'page',
  body: [
    {
      type: 'responsive',
      testid: 'demo-responsive-numeric',
      variants: [
        { key: 'tablet', min: 768, max: 1024, body: [{ type: 'text', text: 'TABLET TREE (768-1023px)' }] },
        { key: 'wide', min: 1024, body: [{ type: 'text', text: 'WIDE TREE (>=1024px)' }] },
        { key: 'default', body: [{ type: 'text', text: 'DEFAULT TREE (<768px)' }] },
      ],
    },
  ],
};

export function ResponsiveLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Structural responsive container: renders exactly one variant subtree per viewport. min is inclusive, max is exclusive; the first matching bound variant wins, otherwise the first variant without bounds (default tree) renders. Switching variants rebuilds the whole subtree while page-scope data is preserved."
      scenarios={[
        {
          title: 'Named breakpoint variants',
          description:
            'Default tree (desktop) renders in environments without matchMedia; a max:"lg" variant replaces it below 1024px.',
          schema: breakpointVariants,
          data: {},
        },
        {
          title: 'Numeric bounds variants',
          description:
            'min/max accept arbitrary px values (Sundial-style custom breakpoints like 900/720/760).',
          schema: numericVariants,
          data: {},
        },
      ]}
    />
  );
}
