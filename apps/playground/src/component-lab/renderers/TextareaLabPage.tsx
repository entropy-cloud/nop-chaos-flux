import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'textareaForm',
      body: [
        { type: 'textarea', name: 'bio', label: 'Biography', placeholder: 'Tell us about yourself...', required: true }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function TextareaLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Multi-line text input bound to a form field."
    />
  );
}
