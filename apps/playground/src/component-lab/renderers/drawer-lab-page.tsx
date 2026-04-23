import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const rightDrawer = {
  type: 'page',
  body: [
    { type: 'text', text: 'Submitted message: ${savedNote ?? "(none)"}' },
    {
      type: 'button',
      label: 'Open Right Drawer',
      onClick: {
        action: 'openDrawer',
        args: {
          title: 'Add Note',
          side: 'right',
          body: [
            {
              type: 'form',
              name: 'noteForm',
              body: [
                { type: 'textarea', name: 'note', label: 'Note', placeholder: 'Write something...', required: true }
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Save',
                  onClick: [
                    { action: 'submit', formName: 'noteForm' },
                    { action: 'setValue', args: { path: 'savedNote', value: '${noteForm.note}' } },
                    { action: 'closeDrawer' }
                  ]
                },
                { type: 'button', label: 'Cancel', variant: 'outline', onClick: { action: 'closeDrawer' } }
              ]
            }
          ]
        }
      }
    }
  ]
};

const leftDrawer = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open Left Drawer',
      variant: 'outline',
      onClick: {
        action: 'openDrawer',
        args: {
          title: 'Navigation',
          side: 'left',
          body: [
            { type: 'text', text: 'Dashboard' },
            { type: 'text', text: 'Reports' },
            { type: 'text', text: 'Settings' }
          ],
          actions: [
            { type: 'button', label: 'Close', variant: 'outline', onClick: { action: 'closeDrawer' } }
          ]
        }
      }
    }
  ]
};

export function DrawerLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Side-panel drawer with configurable side (left/right) and body/actions regions. Triggered via the drawer action."
      scenarios={[
        {
          title: 'Right drawer with form and writeback',
          description: 'Click "Open Right Drawer" to slide in a panel from the right with a form. Saving writes the note back to the parent scope.',
          schema: rightDrawer
        },
        {
          title: 'Left drawer as a navigation panel',
          description: 'Click "Open Left Drawer" to slide in a panel from the left. Use side: left for nav menus or context panels.',
          schema: leftDrawer
        }
      ]}
    />
  );
}
