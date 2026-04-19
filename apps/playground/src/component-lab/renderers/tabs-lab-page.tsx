import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      items: [
        {
          title: 'Overview',
          icon: 'LayoutDashboard',
          body: [
            { type: 'text', text: 'Project status: In Progress' },
            {
              type: 'flex',
              direction: 'row',
              gap: 2,
              body: [
                { type: 'badge', label: 'On Track', variant: 'default' },
                { type: 'badge', label: '3 blockers', variant: 'destructive' }
              ]
            }
          ]
        },
        {
          title: 'Team',
          icon: 'Users',
          body: [
            { type: 'text', text: 'Alice Johnson — Lead' },
            { type: 'text', text: 'Bob Smith — Developer' },
            { type: 'text', text: 'Carol White — Designer' }
          ]
        },
        {
          title: 'Settings',
          icon: 'Settings',
          disabled: true,
          body: [
            { type: 'text', text: 'Settings are not available yet.' }
          ]
        }
      ]
    }
  ]
};

const formTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      items: [
        {
          title: 'Basic Info',
          body: [
            {
              type: 'form',
              name: 'infoForm',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true }
              ],
              actions: [
                { type: 'button', label: 'Save', onClick: { action: 'submit' } }
              ]
            }
          ]
        },
        {
          title: 'Contact',
          body: [
            {
              type: 'form',
              name: 'contactForm',
              body: [
                { type: 'input-email', name: 'email', label: 'Email', required: true },
                { type: 'input-text', name: 'phone', label: 'Phone' }
              ],
              actions: [
                { type: 'button', label: 'Save', onClick: { action: 'submit' } }
              ]
            }
          ]
        }
      ]
    }
  ]
};

export function TabsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Tabbed navigation container. Each tab has a title, optional icon, optional disabled flag, and a body region."
      scenarios={[
        {
          title: 'Tabs with icons and a disabled tab',
          description: 'The "Settings" tab is disabled and cannot be activated. Icons are shown next to tab titles.',
          schema: basicTabs
        },
        {
          title: 'Tabs containing form fields',
          description: 'Each tab panel can host a full form. Tabs are a natural way to organize multi-step or multi-section forms.',
          schema: formTabs
        }
      ]}
    />
  );
}
