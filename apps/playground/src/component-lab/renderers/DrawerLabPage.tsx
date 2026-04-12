import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'Click the button below to open the drawer.'
    },
    {
      type: 'button',
      label: 'Open Drawer',
      onClick: {
        action: 'drawer',
        drawer: {
          type: 'drawer',
          title: 'Example Drawer',
          body: [
            { type: 'text', text: 'This is the drawer body content.' },
            { type: 'text', text: 'Drawers support body and actions regions, similar to dialogs.' }
          ],
          actions: [
            { type: 'button', label: 'Close', onClick: { action: 'closeDrawer' } }
          ]
        }
      }
    }
  ]
};

export function DrawerLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Side-panel drawer with body and actions regions."
      notes="Click 'Open Drawer' to see the drawer renderer in action."
    />
  );
}
