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
      // Plan 552 / IS-lab-input-password-001: the confirm-password rule was a
      // dead declaration — field-level `validations: [{rule: 'custom', ...}]`
      // is not a supported contract in any package, so mismatched submits
      // passed silently. Use the supported form-level cross-field rule
      // (`rules` + equalsField) so the validator actually fires.
      rules: [
        {
          rule: 'equalsField',
          field: 'confirmPassword',
          target: 'password',
          message: 'Passwords must match',
        },
      ],
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

const strengthForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { password: '' },
      body: [
        {
          type: 'input-password',
          name: 'password',
          label: 'Password with strength meter',
          placeholder: 'Type to see the strength meter',
          showStrength: true,
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputPasswordLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Password input with masked characters. Supports the reveal toggle (E2a-bis) and the four-level showStrength meter (weak/fair/good/strong); confirmation affordances remain separate enhancements."
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
            'Two password fields are rendered together and a form-level equalsField rule blocks mismatched submits with an inline "Passwords must match" error on the confirm field.',
          schema: confirmPassword,
        },
        {
          title: 'Reveal password toggle',
          description:
            'revealPassword: true renders the show/hide toggle. Clicking it switches the input between type=password and type=text without changing the committed form value.',
          schema: revealPasswordForm,
        },
        {
          title: 'Strength meter',
          description:
            'showStrength: true renders a four-segment meter below the input (weak/fair/good/strong) driven by length and character-class rules. It is display-only feedback and does not participate in validation.',
          schema: strengthForm,
        },
      ]}
    />
  );
}
