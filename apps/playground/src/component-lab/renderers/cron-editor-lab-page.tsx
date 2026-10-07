import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

// cron-editor lab（cron 轨道 C5，plan 540）：text 诊断 / visual 分段编辑 / submit 回写三个 scenario。
// 回写 echo 走 playground 既有惯例：form valuesPath → ui.<name> + $JSON.stringify（对象值直插模板会 [object Object]）。
const textDiagnostics = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.textCron',
      data: { cron: { cron: '0 0 9 ? * MON-FRI' } },
      body: [
        {
          type: 'cron-editor',
          name: 'cron',
          label: 'Text mode with live diagnostics',
          mode: 'text',
          description:
            'Type an invalid expression (e.g. 0 0 0 30 2 ?) to see the inline diagnostic; the invalid value is not committed.',
        },
        { type: 'text', testid: 'cron-editor-text-echo', text: 'Value: ${$JSON.stringify(ui.textCron)}' },
      ],
    },
  ],
};

const visualSegments = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.visualCron',
      data: { cron: { cron: '0 0 9 * * ?' } },
      body: [
        {
          type: 'cron-editor',
          name: 'cron',
          label: 'Visual segment editor',
          description:
            'Edit the second/minute/hour/day/month/week segments; the year segment stays empty for 6-field expressions. Repeat/range data in the value is preserved on edit.',
        },
        { type: 'text', testid: 'cron-editor-visual-echo', text: 'Value: ${$JSON.stringify(ui.visualCron)}' },
      ],
    },
  ],
};


const wizardBlocks = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.wizardCron',
      data: { cron: { cron: '0 0 9 * * ?', repeat: { every: 2, unit: 'week', anchor: '2026-01-05' } } },
      body: [
        {
          type: 'cron-editor',
          name: 'cron',
          label: 'Wizard + repeat/range blocks + presets',
          value: { cron: '0 0 9 * * ?', repeat: { every: 2, unit: 'week', anchor: '2026-01-05' } },
        },
        { type: 'text', testid: 'cron-editor-wizard-echo', text: 'Value: ${$JSON.stringify(ui.wizardCron)}' },
      ],
    },
  ],
};

const submitEcho = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.submitCron',
      data: { cron: { cron: '0 0 9 ? * MON-FRI' } },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'cron-editor',
          name: 'cron',
          label: 'Daily report schedule',
          clearable: true,
        },
      ],
      actions: [{ type: 'button', label: 'SUBMIT', onClick: { action: 'submitForm' } }],
    },
    {
      type: 'text',
      testid: 'cron-editor-submit-echo',
      text: '${submitted ? "Submitted: " + $JSON.stringify(ui.submitCron) : ""}',
    },
  ],
};

export function CronEditorLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="cron-editor: dual-mode (visual segment / text expression) schedule field with live diagnostics, next-fire preview and clear/reset/focus handles (cron 轨道 C5, plan 540)."
      scenarios={[
        { title: 'Text diagnostics', description: 'Live diagnostics in text mode; invalid input is not committed.', schema: textDiagnostics },
        { title: 'Visual segments', description: '7-segment editor with passthrough of repeat/range value keys.', schema: visualSegments },
        { title: 'Wizard and blocks', description: 'Office frequency tiers, repeat/range blocks with mutual-exclusion diagnostics, preset apply (plan 541).', schema: wizardBlocks },
        { title: 'Submit echo', description: 'Submit the form and read back the committed CronScheduleValue.', schema: submitEcho },
      ]}
    />
  );
}
