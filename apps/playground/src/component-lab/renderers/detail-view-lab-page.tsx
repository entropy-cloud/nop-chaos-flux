import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const reportSummary = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'detailViewForm',
      data: {
        summary: { title: 'Annual Report 2025', author: 'Finance Team', pages: 48 },
      },
      body: [
        {
          type: 'detail-view',
          name: 'summary',
          label: 'Report Summary',
          viewer: [
            { type: 'text', text: 'Title: ${summary.title}' },
            { type: 'text', text: 'Author: ${summary.author}' },
            { type: 'text', text: 'Pages: ${summary.pages}' },
          ],
          content: [
            { type: 'input-text', name: 'title', label: 'Title', required: true },
            { type: 'input-text', name: 'author', label: 'Author' },
            { type: 'input-text', name: 'pages', label: 'Pages' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submit' } }],
    },
  ],
};

const userDetailView = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'userDetailForm',
      data: {
        user: {
          name: 'Alice Johnson',
          role: 'Administrator',
          email: 'alice@example.com',
          department: 'Engineering',
        },
      },
      body: [
        {
          type: 'detail-view',
          name: 'user',
          label: 'User Account',
          viewer: [
            {
              type: 'flex',
              direction: 'row',
              gap: 2,
              align: 'center',
              body: [
                { type: 'icon', icon: 'user', size: 16 },
                { type: 'text', text: '${user.name}' },
                { type: 'badge', label: '${user.role}', variant: 'secondary' },
              ],
            },
            { type: 'text', text: 'Email: ${user.email}' },
            { type: 'text', text: 'Department: ${user.department}' },
          ],
          content: [
            { type: 'input-text', name: 'name', label: 'Full Name', required: true },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Administrator', value: 'Administrator' },
                { label: 'Editor', value: 'Editor' },
                { label: 'Viewer', value: 'Viewer' },
              ],
            },
            { type: 'input-email', name: 'email', label: 'Email', required: true },
            { type: 'input-text', name: 'department', label: 'Department' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submit' } }],
    },
  ],
};

export function DetailViewLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Read-only display of a nested object that expands to a dialog for inline editing. The viewer slot controls the summary preview; the content slot provides the edit form inside the dialog."
      scenarios={[
        {
          title: 'Report summary — text display with edit dialog',
          description:
            'The viewer slot shows title, author, and page count. Click the expand button to open the edit dialog.',
          schema: reportSummary,
        },
        {
          title: 'User account — rich display with icon, badge, and edit dialog',
          description:
            'The viewer slot shows name, role badge, email, and department. The edit dialog has a role select alongside text fields.',
          schema: userDetailView,
        },
      ]}
    />
  );
}
