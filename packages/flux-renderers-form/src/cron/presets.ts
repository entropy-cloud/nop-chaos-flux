// 内置预设数据（design §4 `presets` 可覆盖）：稳定 id 供 C5/C6 以 `flux.cron.preset.<id>` 供给 i18n 文案。
// 形态覆盖 nop 存量表达式代表形（整点/工作日/周一/月初/月末 L 语法/元旦）。
interface CronPreset {
  id: string;
  cron: string;
}

export const builtinPresets: CronPreset[] = [
  { id: 'hourly', cron: '0 0 * * * *' },
  { id: 'daily-9', cron: '0 0 9 * * *' },
  { id: 'workday-9', cron: '0 0 9 ? * MON-FRI' },
  { id: 'weekly-mon-10', cron: '0 0 10 ? * MON' },
  { id: 'monthly-first-9', cron: '0 0 9 1 * *' },
  { id: 'monthly-last-23', cron: '0 0 23 L * ?' },
  { id: 'yearly-1-1', cron: '0 0 0 1 1 *' }
];
