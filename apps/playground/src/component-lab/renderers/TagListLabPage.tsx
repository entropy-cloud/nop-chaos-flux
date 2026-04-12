import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'tagListForm',
      data: { tags: ['react', 'typescript'] },
      body: [
        { type: 'tag-list', name: 'tags', label: 'Tags' }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function TagListLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Editable list of free-text tags. Users type and press Enter to add; click a tag to remove it."
    />
  );
}
