import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const withShowToggle = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'passwordToggleForm',
      body: [
        {
          type: 'input-password',
          name: 'password',
          label: 'Password',
          required: true,
          showToggle: true
        }
      ],
      actions: [
        { type: 'button', label: 'Continue', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const confirmPassword = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'passwordForm',
      body: [
        {
          type: 'input-password',
          name: 'password',
          label: 'New Password',
          required: true,
          showToggle: true,
          minLength: 8
        },
        {
          type: 'input-password',
          name: 'confirmPassword',
          label: 'Confirm Password',
          required: true,
          showToggle: true,
          validations: [
            { rule: 'custom', expression: '${confirmPassword === password}', message: 'Passwords must match' }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Set Password', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function InputPasswordLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Password input with masked characters. Supports showToggle to reveal the password and custom validations for confirmation checks."
      scenarios={[
        {
          title: 'Password field with show/hide toggle',
          description: 'With showToggle: true, a visibility button appears so users can reveal their password while typing.',
          schema: withShowToggle
        },
        {
          title: 'New password with confirm-password validator',
          description: 'Both fields have showToggle enabled. The confirm field has a custom validation that requires it to match the password field.',
          schema: confirmPassword
        }
      ]}
    />
  );
}
