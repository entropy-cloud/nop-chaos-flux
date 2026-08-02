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

const choiceFamilyCompositeForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.choiceValues',
      data: {
        country: '',
        agree: false,
        active: false,
        plan: 'free',
        tags: [],
        site: '',
        roles: [],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'select',
          name: 'country',
          label: 'Country',
          options: [
            { label: 'United States', value: 'us' },
            { label: 'Germany', value: 'de' },
          ],
        },
        { type: 'checkbox', name: 'agree', label: 'Agree', option: { label: 'I agree' } },
        { type: 'switch', name: 'active', label: 'Active' },
        {
          type: 'radio-group',
          name: 'plan',
          label: 'Plan',
          options: [
            { label: 'Free', value: 'free' },
            { label: 'Pro', value: 'pro' },
          ],
        },
        {
          type: 'checkbox-group',
          name: 'tags',
          label: 'Tags',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Beta', value: 'beta' },
          ],
        },
        {
          type: 'button-group-select',
          name: 'site',
          label: 'Site',
          options: [
            { label: 'Main', value: 'main' },
            { label: 'Secondary', value: 'secondary' },
          ],
        },
        {
          type: 'button-group-select',
          name: 'roles',
          label: 'Roles',
          multiple: true,
          options: [
            { label: 'Admin', value: 'admin' },
            { label: 'Editor', value: 'editor' },
            { label: 'Viewer', value: 'viewer' },
          ],
        },
        {
          type: 'text',
          testid: 'choice-echo',
          text:
            '${submitted ? "Choice: " + ui.choiceValues.country + " | " + (ui.choiceValues.agree ? "yes" : "no") + " | " + (ui.choiceValues.active ? "on" : "off") + " | " + ui.choiceValues.plan + " | " + JOIN(ui.choiceValues.tags, ",") + " | " + ui.choiceValues.site + " | " + JOIN(ui.choiceValues.roles, ",") : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const falsyValueSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { level: '' },
      body: [
        {
          type: 'select',
          name: 'level',
          label: 'Level',
          options: [
            { label: 'Zero', value: 0 },
            { label: 'Empty', value: '' },
            { label: 'One', value: 1 },
          ],
        },
        {
          type: 'text',
          testid: 'select-live',
          text: '${level === 0 ? "native-zero" : level === "" ? "native-empty" : "native-one"}',
        },
      ],
    },
  ],
};

const REMOTE_LANGUAGES = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Banana', value: 'banana' },
];

const remoteSearchSelect = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'select',
          name: 'fruit',
          label: 'Fruit',
          searchable: true,
          searchSource: {
            action: 'ajax',
            args: { url: '/api/choice-search', params: { q: '${searchQuery}' } },
          },
          options: [],
        },
        {
          type: 'text',
          testid: 'remote-live',
          text: '${fruit ? "Fruit: " + fruit : ""}',
        },
      ],
    },
  ],
};

const remoteSearchEnv = {
  fetcher: async <T,>(api: { url?: string; data?: unknown }) => {
    // The ajax executor canonicalizes action params into the request URL
    // (e.g. /api/choice-search?q=ap), so the query is read from the URL.
    const match = (api.url ?? '').match(/[?&]q=([^&]*)/);
    const q = match ? decodeURIComponent(match[1]!).toLowerCase() : '';
    if (q === 'fail') {
      throw { code: 'E_NET' };
    }
    const filtered = REMOTE_LANGUAGES.filter((item) => item.label.toLowerCase().includes(q));
    return { ok: true, status: 200, data: filtered as T };
  },
};

const controlledEchoPage = {
  type: 'page',
  data: { level: 1, notify: false },
  body: [
    {
      type: 'select',
      name: 'level',
      label: 'Level',
      options: [
        { label: 'L1', value: 1 },
        { label: 'L2', value: 2 },
        { label: 'L3', value: 3 },
      ],
    },
    { type: 'switch', name: 'notify', label: 'Notify' },
    {
      type: 'text',
      testid: 'ctrl-live',
      text: '${"Level " + level + " notify " + (notify ? "on" : "off")}',
    },
    {
      type: 'button',
      label: 'Set level to 2',
      onClick: { action: 'setValue', args: { path: 'level', value: 2 } },
    },
    {
      type: 'button',
      label: 'Set notify on',
      onClick: { action: 'setValue', args: { path: 'notify', value: true } },
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
        {
          title: 'Choice family composite submit (bug 73 pattern)',
          description:
            'select / checkbox / switch / radio-group / checkbox-group / button-group-select (single + multiple) in one form: real selection into every control, then submit. valuesPath publishes the committed values (native shapes: booleans, arrays) into the page scope where an outer text echoes them.',
          schema: choiceFamilyCompositeForm,
        },
        {
          title: 'Falsy option value writeback (combobox-item)',
          description:
            'Options with falsy values (0 and ""). Selecting them must write the native value back into the form and echo the matching option label — 0 must be selected, not treated as no-selection.',
          schema: falsyValueSelect,
        },
        {
          title: 'Remote search with failure fallback',
          description:
            'searchSource dispatches an ajax action per keystroke (debounced). Typing a matching prefix loads remote options; typing "fail" returns a 500 and the error slot appears with the localized failure message.',
          schema: remoteSearchSelect,
          env: remoteSearchEnv,
        },
        {
          title: 'Controlled value echo (external scope update)',
          description:
            'select and switch bound to page scope: an external setValue action updates the scope value and the controls must echo the new state (no stale value, no loop).',
          schema: controlledEchoPage,
        },
      ]}
    />
  );
}
