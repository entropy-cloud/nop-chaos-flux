import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      orientation: 'horizontal',
      items: [
        {
          title: 'Overview',
          body: [
            {
              type: 'text',
              text: 'Default horizontal tabs render the tab list above the active panel.',
            },
            { type: 'text', text: 'Project status: In Progress' },
            {
              type: 'flex',
              direction: 'row',
              gap: 2,
              body: [
                { type: 'badge', text: 'On Track', level: 'success' },
                { type: 'badge', text: '3 blockers', level: 'danger' },
              ],
            },
          ],
        },
        {
          title: 'Team',
          body: [
            { type: 'text', text: 'Alice Johnson — Lead' },
            { type: 'text', text: 'Bob Smith — Developer' },
            { type: 'text', text: 'Carol White — Designer' },
          ],
        },
        {
          title: 'Settings',
          disabled: true,
          body: [{ type: 'text', text: 'Settings are not available yet.' }],
        },
      ],
    },
  ],
};

const lineTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      variant: 'line',
      items: [
        {
          title: 'Overview',
          body: [{ type: 'text', text: 'Line-style tab with underline indicator.' }],
        },
        {
          title: 'Details',
          body: [{ type: 'text', text: 'Content for details tab.' }],
        },
        {
          title: 'Archive',
          body: [{ type: 'text', text: 'Content for archive tab.' }],
        },
      ],
    },
  ],
};

const verticalTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      orientation: 'vertical',
      items: [
        {
          title: 'Overview',
          body: [
            { type: 'text', text: 'Vertical tabs with nav on the left side.' },
            { type: 'text', text: 'Content area fills the remaining space.' },
          ],
        },
        {
          title: 'Team',
          body: [
            { type: 'text', text: 'Alice Johnson — Lead' },
            { type: 'text', text: 'Bob Smith — Developer' },
            { type: 'text', text: 'Carol White — Designer' },
          ],
        },
        {
          title: 'Settings',
          body: [{ type: 'text', text: 'Settings content goes here.' }],
        },
      ],
    },
  ],
};

const sidebarLeftTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      orientation: 'vertical',
      items: [
        {
          title: 'Dashboard',
          body: [{ type: 'text', text: 'Sidebar on the left with Dashboard content.' }],
        },
        {
          title: 'Analytics',
          body: [{ type: 'text', text: 'Analytics content displayed here.' }],
        },
        {
          title: 'Reports',
          body: [{ type: 'text', text: 'Report viewer content.' }],
        },
      ],
    },
  ],
};

const sidebarRightTabs = {
  type: 'page',
  body: [
    {
      type: 'tabs',
      orientation: 'vertical',
      items: [
        {
          title: 'Dashboard',
          body: [{ type: 'text', text: 'Sidebar on the right with Dashboard content.' }],
        },
        {
          title: 'Analytics',
          body: [{ type: 'text', text: 'Analytics content displayed here.' }],
        },
        {
          title: 'Reports',
          body: [{ type: 'text', text: 'Report viewer content.' }],
        },
      ],
    },
  ],
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
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
              ],
              actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
            },
          ],
        },
        {
          title: 'Contact',
          body: [
            {
              type: 'form',
              name: 'contactForm',
              body: [
                { type: 'input-email', name: 'email', label: 'Email', required: true },
                { type: 'input-text', name: 'phone', label: 'Phone' },
              ],
              actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
            },
          ],
        },
      ],
    },
  ],
};

export function TabsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Tabbed navigation container with multiple display modes. Compare the default horizontal layout (tabs above, panel below) with left-side vertical navigation and sidebar-style layouts on both sides."
      scenarios={[
        {
          title: 'Horizontal tabs (top)',
          description:
            'Default horizontal layout. The tab list stays on top and the active panel renders underneath.',
          schema: basicTabs,
        },
        {
          title: 'Horizontal tabs (line style)',
          description: 'Still top-aligned, but with an underline indicator (`variant: "line"`).',
          schema: lineTabs,
        },
        {
          title: 'Vertical tabs (left nav)',
          description: 'Navigation on the left and content on the right (`orientation: "vertical"`).',
          schema: verticalTabs,
        },
        {
          title: 'Sidebar tabs (left)',
          description:
            'Sidebar-style navigation on the left side using the vertical orientation baseline.',
          schema: sidebarLeftTabs,
        },
        {
          title: 'Sidebar tabs (right)',
          description:
            'Sidebar-style navigation on the right side shown against the same vertical tabs baseline.',
          schema: sidebarRightTabs,
        },
        {
          title: 'Tabs with forms',
          description:
            'Each tab panel can host a full form, which is useful for multi-section editors.',
          schema: formTabs,
        },
      ]}
    />
  );
}
