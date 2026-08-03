import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const rolesTransfer = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'transferForm',
      data: { roles: ['editor'] },
      body: [
        {
          type: 'transfer',
          name: 'roles',
          label: 'Roles',
          multiple: true,
          searchable: true,
          valueKey: 'id',
          labelKey: 'title',
          options: [
            { id: 'admin', title: 'Admin' },
            { id: 'editor', title: 'Editor' },
            { id: 'viewer', title: 'Viewer' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const controlledEcho = {
  type: 'page',
  data: { roles: ['editor'] },
  body: [
    {
      type: 'transfer',
      name: 'roles',
      label: 'Roles',
      multiple: true,
      valueKey: 'id',
      labelKey: 'title',
      options: [
        { id: 'admin', title: 'Admin' },
        { id: 'editor', title: 'Editor' },
        { id: 'viewer', title: 'Viewer' },
      ],
    },
    { type: 'button', label: 'Set admin', onClick: { action: 'setValue', args: { path: 'roles', value: ['admin'] } } },
    { type: 'button', label: 'Set viewer', onClick: { action: 'setValue', args: { path: 'roles', value: ['viewer'] } } },
    { type: 'text', testid: 'transfer-echo', text: 'T:${$JSON.stringify(roles)}' },
  ],
};

const selectAllEvent = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { roles: [], selectAllFlag: false },
      body: [
        {
          type: 'transfer',
          name: 'roles',
          label: 'Roles',
          multiple: true,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
          onSelectAll: { action: 'setValue', args: { path: 'selectAllFlag', value: true } },
        },
        { type: 'text', testid: 'transfer-sa-echo', text: 'SA:${selectAllFlag}' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function TransferLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Two-pane shuttle selection field. valueKey/labelKey option normalization helper + searchable candidate/selected panes. Does not reuse select's dropdown protocol."
      scenarios={[
        {
          title: 'Role assignment with search',
          description:
            'Shuttle candidates to selected and back. valueKey/labelKey map arbitrary option records to the canonical {label,value} form.',
          schema: rolesTransfer,
        },
        {
          title: 'Controlled value echo + onSelectAll (external scope update)',
          description:
            'Scope-bound transfer: external setValue actions echo into the selected pane without stale values or loops. The toggle-all checkbox fires onSelectAll into the scope flag.',
          schema: controlledEcho,
        },
        {
          title: 'Toggle-all fires onSelectAll',
          description:
            'toggle-all selects every candidate and dispatches the onSelectAll event (scope flag flips to true).',
          schema: selectAllEvent,
        },
      ]}
    />
  );
}
