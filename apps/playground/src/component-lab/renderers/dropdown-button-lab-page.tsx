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

const splitButton = {
  type: 'page',
  body: [
    {
      type: 'dropdown-button',
      testid: 'demo-dropdown-button-split',
      label: 'Save',
      variant: 'default',
      split: true,
      mainAction: { action: 'setValue', args: { path: 'splitSaved', value: true } },
      items: [{ label: 'Save as draft' }, { label: 'Save a copy', destructive: true }],
    },
    { type: 'text', text: 'split:${splitSaved ? "saved" : "idle"}' },
  ],
};

export function DropdownButtonLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Button with a dropdown menu of actions (click or hover trigger). Menu items carry action/onClick event fields (compiler-preserved); item clicks dispatch in the item scope and close the menu. split=true splits the control into a main action segment and a caret segment."
      scenarios={[
        {
          title: 'Basic dropdown menu actions',
          description: 'Click trigger opens the menu; item actions dispatch and close.',
          schema: basicDropdown,
          data: {},
        },
        {
          title: 'Split button (split + mainAction)',
          description:
            'split=true: clicking "Save" dispatches mainAction immediately; the caret segment opens the menu for secondary actions. Escape hatch: without mainAction the main segment opens the menu.',
          schema: splitButton,
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
