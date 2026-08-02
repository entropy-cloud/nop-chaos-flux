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
        },
      ],
      actions: [{ type: 'button', label: 'Continue', onClick: { action: 'submitForm' } }],
    },
  ],
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
          minLength: 8,
        },
        {
          type: 'input-password',
          name: 'confirmPassword',
          label: 'Confirm Password',
          required: true,
          validations: [
            {
              rule: 'custom',
              expression: '${confirmPassword === password}',
              message: 'Passwords must match',
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Set Password', onClick: { action: 'submitForm' } }],
    },
  ],
};

const revealPasswordForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { password: '' },
      body: [
        {
          type: 'input-password',
          name: 'password',
          label: 'Reveal Password',
          placeholder: 'Type a password',
          revealPassword: true,
        },
        { type: 'text', testid: 'password-live', text: '${password ? "Set: " + password : ""}' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputPasswordLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Password input with masked characters. The current live baseline matches the standard input contract plus password semantics; confirmation and richer reveal/strength affordances are separate future enhancements."
      scenarios={[
        {
          title: 'Basic password field',
          description:
            'A standard masked password field. The current runtime keeps it as a normal password input.',
          schema: withShowToggle,
        },
        {
          title: 'New password with confirm-password validator',
          description:
            'Two password fields are rendered together so authoring can express confirm-password rules. The current lab validates stable masked input behavior rather than overclaiming richer validation UI.',
          schema: confirmPassword,
        },
        {
          title: 'Reveal password toggle',
          description:
            'revealPassword: true renders the show/hide toggle. Clicking it switches the input between type=password and type=text without changing the committed form value.',
          schema: revealPasswordForm,
        },
      ]}
    />
  );
}
