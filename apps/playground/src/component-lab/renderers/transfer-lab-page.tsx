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
      ]}
    />
  );
}
