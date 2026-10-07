import type { InputSchema } from './schemas.js';
import type { CronScheduleValue } from './cron/types.js';

/**
 * cron-editor（cron 轨道 C5，plan 540）：定时计划编辑字段。值 = CronScheduleValue
 * （cron 为本体；repeat/range 为 cron 表达不了的配套结构，v1 编辑只覆写 cron 键并透传保留）。
 */
export interface CronEditorSchema extends Omit<InputSchema, 'mode'> {
  type: 'cron-editor';
  /** 默认值 / 受控值 */
  value?: CronScheduleValue;
  /** 编辑模式，缺省 'visual'（C5：visual = 6/7 段分段编辑；C6 增 Office 档位向导）。覆盖基类链的 form-mode 字面量 */
  mode?: 'visual' | 'text';
  /** 是否显示「重复周期」区块（C6 区块；v1 仅 schema 声明，效果缺省） */
  showRepeat?: boolean;
  /** 是否显示「重复范围」区块（C6 区块；v1 仅 schema 声明，效果缺省） */
  showRange?: boolean;
  /** 是否显示下次触发预览，缺省 true */
  showPreview?: boolean;
  /** 预览条数，缺省 5，clamp 1-20 */
  previewCount?: number;
  /** 覆盖内置预设（C6 应用 UI；v1 仅 schema 声明，效果缺省） */
  presets?: { label: string; value: CronScheduleValue }[];
}
