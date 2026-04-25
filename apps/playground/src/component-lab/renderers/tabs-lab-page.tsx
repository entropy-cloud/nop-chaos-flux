import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      items: [
        {
          title: 'Overview',
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
          body: [
            { type: 'text', text: 'Alice Johnson — Lead' },
            { type: 'text', text: 'Bob Smith — Developer' },
            { type: 'text', text: 'Carol White — Designer' }
          ]
        },
        {
          title: 'Settings',
          disabled: true,
          body: [
            { type: 'text', text: 'Settings are not available yet.' }
          ]
        }
      ]
    }
  ]
};

const lineTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      tabsMode: 'line',
      items: [
        {
          title: 'Overview',
          body: [
            { type: 'text', text: 'Line-style tab with underline indicator.' }
          ]
        },
        {
          title: 'Details',
          body: [
            { type: 'text', text: 'Content for details tab.' }
          ]
        },
        {
          title: 'Archive',
          body: [
            { type: 'text', text: 'Content for archive tab.' }
          ]
        }
      ]
    }
  ]
};

const verticalTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      tabsMode: 'vertical',
      items: [
        {
          title: 'Overview',
          body: [
            { type: 'text', text: 'Vertical tabs with nav on the left side.' },
            { type: 'text', text: 'Content area fills the remaining space.' }
          ]
        },
        {
          title: 'Team',
          body: [
            { type: 'text', text: 'Alice Johnson — Lead' },
            { type: 'text', text: 'Bob Smith — Developer' },
            { type: 'text', text: 'Carol White — Designer' }
          ]
        },
        {
          title: 'Settings',
          body: [
            { type: 'text', text: 'Settings content goes here.' }
          ]
        }
      ]
    }
  ]
};

const sidebarLeftTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      tabsMode: 'sidebar',
      sidePosition: 'left',
      items: [
        {
          title: 'Dashboard',
          body: [
            { type: 'text', text: 'Sidebar on the left with Dashboard content.' }
          ]
        },
        {
          title: 'Analytics',
          body: [
            { type: 'text', text: 'Analytics content displayed here.' }
          ]
        },
        {
          title: 'Reports',
          body: [
            { type: 'text', text: 'Report viewer content.' }
          ]
        }
      ]
    }
  ]
};

const sidebarRightTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      tabsMode: 'sidebar',
      sidePosition: 'right',
      items: [
        {
          title: 'Dashboard',
          body: [
            { type: 'text', text: 'Sidebar on the right with Dashboard content.' }
          ]
        },
        {
          title: 'Analytics',
          body: [
            { type: 'text', text: 'Analytics content displayed here.' }
          ]
        },
        {
          title: 'Reports',
          body: [
            { type: 'text', text: 'Report viewer content.' }
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
      introDescription="Tabbed navigation container with multiple display modes: default, line, vertical, sidebar (left/right)."
      scenarios={[
        {
          title: 'Default tabs',
          description: 'Standard horizontal tabs with a disabled tab.',
          schema: basicTabs
        },
        {
          title: 'Line-style tabs',
          description: 'Horizontal tabs with an underline indicator (tabsMode: "line").',
          schema: lineTabs
        },
        {
          title: 'Vertical tabs',
          description: 'Navigation on the left, content on the right (tabsMode: "vertical").',
          schema: verticalTabs
        },
        {
          title: 'Sidebar left',
          description: 'Sidebar navigation on the left side (tabsMode: "sidebar", sidePosition: "left").',
          schema: sidebarLeftTabs
        },
        {
          title: 'Sidebar right',
          description: 'Sidebar navigation on the right side (tabsMode: "sidebar", sidePosition: "right").',
          schema: sidebarRightTabs
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
