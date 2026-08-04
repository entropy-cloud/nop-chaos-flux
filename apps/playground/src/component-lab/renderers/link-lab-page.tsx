import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c1LinkHostSchema } from './data-c6c1-host';

const basicLink = {
  type: 'page',
  body: [
    {
      type: 'link',
      testid: 'demo-link-lab',
      label: 'External docs',
      href: 'https://example.com/',
      target: '_blank',
    },
  ],
};

const disabledLink = {
  type: 'page',
  body: [
    {
      type: 'link',
      testid: 'demo-link-lab-disabled',
      label: 'Disabled link',
      href: '/#/lab/link',
      disabled: true,
    },
  ],
};

export function LinkLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Semantic navigation link: label (value-or-region), href/target/rel, onClick dispatching alongside native navigation (action can preventDefault to block). href is URL-protocol guarded — javascript:/data:/vbscript: drop the href."
      scenarios={[
        {
          title: 'Basic link display',
          description: 'Label + href + target=_blank with auto noopener rel.',
          schema: basicLink,
          data: {},
        },
        {
          title: 'Host link onClick + href coexist + javascript: href stripped (C6.1)',
          description:
            'C6.1 Phase 3: the navigable link fires its onClick (setValue) while keeping the href; a javascript: href renders WITHOUT an href attribute and never executes script.',
          schema: c6c1LinkHostSchema,
          data: {},
        },
        {
          title: 'Disabled link',
          description: 'disabled drops the href, blocks onClick and sets aria-disabled.',
          schema: disabledLink,
          data: {},
        },
      ]}
    />
  );
}
