import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'selectForm',
      body: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          required: true,
          options: [
            { label: 'United States', value: 'us' },
            { label: 'United Kingdom', value: 'uk' },
            { label: 'Canada', value: 'ca' },
            { label: 'Australia', value: 'au' },
            { label: 'Germany', value: 'de' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const inlineOptions = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'skillSelectForm',
      body: [
        {
          type: 'select',
          name: 'skill',
          label: 'Primary Skill',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'React', value: 'react' },
            { label: 'Node.js', value: 'node' },
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'Docker', value: 'docker' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const optionTemplateSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'optionTemplateForm',
      body: [
        {
          type: 'select',
          name: 'member',
          label: 'Team Member',
          searchable: true,
          options: [
            { label: 'Alice Chen', value: 'alice', role: 'Frontend Lead', badge: 'Online' },
            { label: 'Bob Garcia', value: 'bob', role: 'Backend Engineer', badge: 'Away' },
            { label: 'Carol Lee', value: 'carol', role: 'Product Designer', badge: 'Online' },
            { label: 'David Kim', value: 'david', role: 'DevOps', badge: 'Offline' },
          ],
          optionTemplate: [
            {
              type: 'container',
              className: 'flex w-full items-center gap-2',
              body: [
                {
                  type: 'icon',
                  icon: 'user',
                  className: 'size-4 shrink-0 text-muted-foreground',
                },
                {
                  type: 'container',
                  className: 'flex flex-col',
                  body: [
                    {
                      type: 'text',
                      text: '${$slot.option.label}',
                      className: 'text-sm font-medium',
                    },
                    {
                      type: 'text',
                      text: '${$slot.option.role}',
                      className: 'text-xs text-muted-foreground',
                    },
                  ],
                },
                {
                  type: 'badge',
                  text: '${$slot.option.badge}',
                  variant: 'secondary',
                  className: 'ml-auto',
                },
              ],
            },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function SelectLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-value dropdown selector. Options can be provided inline or from an async source."
      scenarios={[
        {
          title: 'Single-value select with inline options',
          description:
            'A required country selector backed by inline options. After selection, the trigger shows the option label while the bound scope value remains the option value.',
          schema: singleSelect,
        },
        {
          title: 'Single-value skill select',
          description:
            'A second single-value select showing another inline option set for form usage.',
          schema: inlineOptions,
        },
        {
          title: 'Custom option template (icon + label + description + badge)',
          description:
            'Each option is rendered via an optionTemplate region that references $slot.option fields (label, role, badge) to produce a rich two-line layout with an icon and a status badge. Selection still binds the option value (e.g. "alice"), not the display text.',
          schema: optionTemplateSelect,
        },
      ]}
    />
  );
}
