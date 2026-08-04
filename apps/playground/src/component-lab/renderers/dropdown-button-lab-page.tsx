import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c5c2CrudRowDropdownSchema, c5c2CrudRowFetcher } from './data-c5c2-host';

const basicDropdown = {
  type: 'page',
  body: [
    {
      type: 'dropdown-button',
      testid: 'demo-dropdown-button-basic',
      label: 'Actions',
      variant: 'outline',
      items: [
        {
          label: 'Set Flag',
          action: { action: 'setValue', args: { path: 'ddClicked', value: true } },
        },
        { label: 'View Details' },
        { label: 'Delete', destructive: true },
      ],
    },
    { type: 'text', text: 'dropdown:${ddClicked ? "clicked" : "idle"}' },
  ],
};

const hoverDropdown = {
  type: 'page',
  body: [
    {
      type: 'dropdown-button',
      testid: 'demo-dropdown-button-hover',
      label: 'Hover Menu',
      trigger: 'hover',
      items: [{ label: 'Item A' }, { label: 'Item B' }],
    },
  ],
};

export function DropdownButtonLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Button with a dropdown menu of actions (click or hover trigger). Menu items carry action/onClick event fields (compiler-preserved); item clicks dispatch in the item scope and close the menu."
      scenarios={[
        {
          title: 'Basic dropdown menu actions',
          description: 'Click trigger opens the menu; item actions dispatch and close.',
          schema: basicDropdown,
          data: {},
        },
        {
          title: 'Hover-triggered dropdown menu',
          description: 'trigger=hover opens the menu on mouse enter.',
          schema: hoverDropdown,
          data: {},
        },
        {
          title: 'Host CRUD row dropdown-button menu (C5.2 bug 73 pattern)',
          description:
            'C5.2 Phase 3 bug 73 pattern: a CRUD operation column hosts a dropdown-button whose "Edit Row" item opens a dialog form preloaded per row; editing and submitting must deliver the CURRENT row id and the EDITED value (re-verifies the 08-02 row-scope isolation fix — a stale-row submit would deliver row 1 data from row 2).',
          schema: c5c2CrudRowDropdownSchema,
          data: {},
          env: { fetcher: c5c2CrudRowFetcher },
        },
      ]}
    />
  );
}
