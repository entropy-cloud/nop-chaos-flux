import { describe, expect, it } from 'vitest';
import { AI_WIDGETS_FIXTURES, pickAiWidgetsFixture } from './ai-widgets-fixture.js';

// ============================================================================
// Chinese keyword dispatch (plan 2026-08-25-0440-2, Phase 1).
//
// `pickAiWidgetsFixture` previously matched English keywords only, so every
// Chinese question fell back to `default`. These assertions were landed
// BEFORE the alias support and were red at that point (Chinese inputs all
// resolved to `default`); the KEYWORD_ORDER alias fix turns them green.
// ============================================================================

describe('pickAiWidgetsFixture — Chinese keyword dispatch', () => {
  it('routes Chinese questions to the semantically matching preset', () => {
    expect(pickAiWidgetsFixture('今天天气怎么样')).toBe(AI_WIDGETS_FIXTURES.weather);
    expect(pickAiWidgetsFixture('帮我看看这段代码')).toBe(AI_WIDGETS_FIXTURES.code);
    expect(pickAiWidgetsFixture('解释一下质能公式')).toBe(AI_WIDGETS_FIXTURES.formula);
    expect(pickAiWidgetsFixture('说说你的推理过程')).toBe(AI_WIDGETS_FIXTURES.reasoning);
    expect(pickAiWidgetsFixture('给我几篇引用文献')).toBe(AI_WIDGETS_FIXTURES.citation);
  });

  it('routes mixed Chinese/English text (either alias may hit)', () => {
    expect(pickAiWidgetsFixture('weather 天气')).toBe(AI_WIDGETS_FIXTURES.weather);
  });

  it('resolves multi-keyword text by KEYWORD_ORDER priority, not text position', () => {
    // Both formulas (formula) and reasoning (reasoning) are present; formula
    // is earlier in KEYWORD_ORDER, so it wins regardless of word order.
    expect(pickAiWidgetsFixture('这个推理和公式哪个更基础')).toBe(AI_WIDGETS_FIXTURES.formula);
    expect(pickAiWidgetsFixture('先讲公式再展开推理')).toBe(AI_WIDGETS_FIXTURES.formula);
    // citation is later than code in KEYWORD_ORDER.
    expect(pickAiWidgetsFixture('给我引用和代码')).toBe(AI_WIDGETS_FIXTURES.code);
  });

  it('falls back to default for Chinese text without any keyword', () => {
    expect(pickAiWidgetsFixture('你好，很高兴认识你')).toBe(AI_WIDGETS_FIXTURES.default);
    expect(pickAiWidgetsFixture('随便聊聊吧')).toBe(AI_WIDGETS_FIXTURES.default);
  });
});

describe('pickAiWidgetsFixture — English keyword regression', () => {
  it('keeps the five English keywords dispatching case-insensitively', () => {
    expect(pickAiWidgetsFixture('What is the weather outlook this week?')).toBe(
      AI_WIDGETS_FIXTURES.weather,
    );
    expect(pickAiWidgetsFixture('Help me debug this code')).toBe(AI_WIDGETS_FIXTURES.code);
    expect(pickAiWidgetsFixture('Explain the formula for mass energy equivalence')).toBe(
      AI_WIDGETS_FIXTURES.formula,
    );
    expect(pickAiWidgetsFixture('Show me your reasoning for the routing failure')).toBe(
      AI_WIDGETS_FIXTURES.reasoning,
    );
    expect(pickAiWidgetsFixture('Give me a citation summary of the papers')).toBe(
      AI_WIDGETS_FIXTURES.citation,
    );
  });

  it('falls back to default for English text without any keyword', () => {
    expect(pickAiWidgetsFixture('nice to meet you')).toBe(AI_WIDGETS_FIXTURES.default);
  });
});
