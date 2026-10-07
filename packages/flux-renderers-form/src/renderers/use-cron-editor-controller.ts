import { useState } from 'react';
import { parseCron, serializeCron, type CronScheduleValue, type ParsedCron } from '../cron/index.js';

export const CRON_SEGMENTS = ['second', 'minute', 'hour', 'day', 'month', 'week', 'year'] as const;
type CronSegmentKey = (typeof CRON_SEGMENTS)[number];

interface CronEditorController {
  mode: 'visual' | 'text';
  /** 已提交值中的 cron 原文（text 模式缺省显示） */
  committedCron: string;
  committedParsed: ParsedCron | null;
  /** 当前诊断码（草稿或已提交值；null = 合法/空） */
  diagnosticCode: string | null;
  textDraft: string | null;
  setTextDraft: (v: string) => void;
  segmentDrafts: Partial<Record<CronSegmentKey, string>>;
  setSegmentDraft: (key: CronSegmentKey, v: string) => void;
  switchMode: (next: 'visual' | 'text') => void;
  /** 分段当前显示值：草稿优先，否则已提交 cron 的 canonical 段 */
  segmentValue: (key: CronSegmentKey) => string;
  clearDrafts: () => void;
  /** 向导合成通道（plan 541 裁决 2）：parse 合法 → serializeCron canonical 归一提交 */
  commitWizard: (expr: string) => boolean;
  /** repeat/range 区块结构提交（plan 541）：形状照实提交，诊断就近显示不阻断 */
  commitRepeat: (repeat: CronScheduleValue['repeat']) => void;
  commitRange: (range: CronScheduleValue['range']) => void;
}

/**
 * cron-editor 提交门控（plan 540 值提交门控）：分段聚焦期本地草稿；每次编辑尝试合成
 * cron——合法即提交（覆写 cron 键、透传 repeat/range），非法则不提交、草稿留段内并出诊断；
 * 模式切换携带草稿；text 显示已提交原文。
 */
export function useCronEditorController(
  boundValue: CronScheduleValue | undefined,
  mode: 'visual' | 'text',
  commit: (next: CronScheduleValue) => void
): CronEditorController {
  const committedCron = boundValue?.cron ?? '';
  const committed = parseCron(committedCron);
  const committedParsed = committed.ok ? committed.value : null;

  const [textDraft, setTextDraft] = useState<string | null>(null);
  const [segmentDrafts, setSegmentDrafts] = useState<Partial<Record<CronSegmentKey, string>>>({});

  const composeFromDrafts = (): string | null => {
    const keys = Object.keys(segmentDrafts);
    if (keys.length === 0) return null;
    return composeTokens(segmentDrafts);
  };

  /** 合成表达式：草稿优先、已提交 canonical 段兜底；无年段（6 段提交）时省略年 token */
  const composeTokens = (drafts: Partial<Record<CronSegmentKey, string>>): string => {
    const tokens = committedParsed ? serializeCron(committedParsed).split(' ') : [];
    const parts: string[] = [];
    CRON_SEGMENTS.forEach((key, index) => {
      const draft = drafts[key];
      if (draft !== undefined) {
        if (draft !== '') parts.push(draft);
        return;
      }
      const token = tokens[index];
      if (token !== undefined) parts.push(token);
    });
    return parts.join(' ');
  };

  const commitCron = (expr: string) => {
    const parsed = parseCron(expr);
    if (!parsed.ok) return false;
    commit({ ...(boundValue ?? {}), cron: expr });
    return true;
  };

  const setSegmentDraft = (key: CronSegmentKey, v: string) => {
    const next = { ...segmentDrafts, [key]: v };
    setSegmentDrafts(next);
    const expr = composeTokens(next);
    if (parseCron(expr).ok) {
      commit({ ...(boundValue ?? {}), cron: expr });
      setSegmentDrafts({});
    }
  };

  const setTextDraftAndCommit = (v: string) => {
    setTextDraft(v);
    if (commitCron(v)) setTextDraft(null);
  };

  const switchMode = (next: 'visual' | 'text') => {
    if (next === mode) return;
    if (next === 'text') {
      // visual→text 携带未提交草稿原文
      const composed = composeFromDrafts();
      setSegmentDrafts({});
      if (composed !== null) setTextDraft(composed);
    }
    // text→visual：非法 text 草稿不展示、切回 text 原样恢复（textDraft 不清）
  };

  const segmentValue = (key: CronSegmentKey): string => {
    const draft = segmentDrafts[key];
    if (draft !== undefined) return draft;
    const tokens = committedParsed ? serializeCron(committedParsed).split(' ') : [];
    const index = CRON_SEGMENTS.indexOf(key);
    return tokens[index] ?? '';
  };

  // 诊断：草稿优先，其次已提交值
  let diagnosticCode: string | null = null;
  if (mode === 'text') {
    if (textDraft !== null) {
      const parsed = parseCron(textDraft);
      if (!parsed.ok) diagnosticCode = parsed.code;
    }
  } else {
    const composed = composeFromDrafts();
    const source = composed ?? committedCron;
    if (source !== '') {
      const parsed = parseCron(source);
      if (!parsed.ok) diagnosticCode = parsed.code;
    }
  }

  return {
    mode,
    committedCron,
    committedParsed,
    diagnosticCode,
    textDraft,
    setTextDraft: setTextDraftAndCommit,
    segmentDrafts,
    setSegmentDraft,
    switchMode,
    segmentValue,
    clearDrafts: () => {
      setSegmentDrafts({});
      setTextDraft(null);
    },
    commitWizard: (expr: string) => {
      const parsed = parseCron(expr);
      if (!parsed.ok) return false;
      const canonical = serializeCron(parsed.value);
      commit({ ...(boundValue ?? {}), cron: canonical });
      setSegmentDrafts({});
      return true;
    },
    commitRepeat: (repeat) => {
      const next = { ...(boundValue ?? {}) } as CronScheduleValue;
      if (repeat) next.repeat = repeat;
      else delete next.repeat;
      commit(next);
    },
    commitRange: (range) => {
      const next = { ...(boundValue ?? {}) } as CronScheduleValue;
      if (range) next.range = range;
      else delete next.range;
      commit(next);
    },
  };
}
