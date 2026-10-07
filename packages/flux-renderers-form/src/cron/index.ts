// cron 引擎纯模块单一出口（零 IO、零 React 依赖；不接入包主出口，待 C5 渲染器接线）。
// barrel 仅收敛当前实际消费面；C5/C6 接线时按需扩展（防 knip unused-export 红噪）。
export type { CronScheduleValue, ParsedCron } from './types';
export { parseCron } from './parse';
export { nextRunAfter } from './next-run';
export { fireSequence } from './range';
export { serializeCron } from './serialize';
export { validateCronScheduleValue } from './diagnostics';
export { deriveFrequency } from './frequency';
export { builtinPresets } from './presets';
