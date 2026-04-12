import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'detailViewForm',
      data: {
        summary: { title: 'Annual Report 2025', author: 'Finance Team', pages: 48 }
      },
      body: [
        {
          type: 'detail-view',
          name: 'summary',
          label: 'Report Summary',
          display: [
            { type: 'text', text: 'Title: ${summary.title}' },
            { type: 'text', text: 'Author: ${summary.author}' },
            { type: 'text', text: 'Pages: ${summary.pages}' }
          ],
          content: [
            { type: 'input-text', name: 'title', label: 'Title', required: true },
            { type: 'input-text', name: 'author', label: 'Author' },
            { type: 'input-text', name: 'pages', label: 'Pages' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function DetailViewLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Read-only display of a nested object that expands to a dialog for inline editing."
      notes="The display region shows the current value; clicking expand opens a dialog with the content edit form."
    />
  );
}
