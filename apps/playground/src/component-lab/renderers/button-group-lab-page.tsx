import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c5c2ButtonGroupSchema } from './data-c5c2-host';

const basicButtonGroup = {
  type: 'page',
  body: [
    {
      type: 'button-group',
      testid: 'demo-button-group-basic',
      items: [
        {
          label: 'Save',
          action: { action: 'setValue', args: { path: 'bgClicked', value: true } },
        },
        { label: 'Cancel' },
      ],
    },
    { type: 'text', text: 'clicked:${bgClicked ? "yes" : "no"}' },
  ],
};

const multipleButtonGroup = {
  type: 'page',
  body: [
    {
      type: 'button-group',
      testid: 'demo-button-group-multiple',
      selectionMode: 'multiple',
      items: [
        { key: 't1', label: 'Tag 1' },
        { key: 't2', label: 'Tag 2' },
        { key: 't3', label: 'Tag 3' },
      ],
    },
  ],
};

export function ButtonGroupLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Action button group with none/single/multiple selection modes. Selection is local controlled state seeded once from value/defaultValue (non-reactive); onChange reports {value, selectedKeys, selectionMode}; each item can carry an action."
      scenarios={[
        {
          title: 'Basic button group with actions',
          description: 'Pure action group: item actions dispatch on click; static items stay inert.',
          schema: basicButtonGroup,
          data: {},
        },
        {
          title: 'Multiple selection toggle group',
          description: 'selectionMode=multiple: keys toggle independently.',
          schema: multipleButtonGroup,
          data: {},
        },
        {
          title: 'Host button-group selection + onChange payload (C5.2 Phase 3)',
          description:
            'C5.2 Phase 3: selectionMode=single; clicking toggles data-selected with mutual exclusion; onChange reports the payload through the host report text ({value, selectedKeys, selectionMode}).',
          schema: c5c2ButtonGroupSchema,
          data: {},
        },
      ]}
    />
  );
}
