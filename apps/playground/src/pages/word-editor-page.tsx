import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createSchemaRenderer,
  createDefaultEnv,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerWordEditorRenderers } from '@nop-chaos/word-editor-renderers';

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);
registerWordEditorRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const env = createDefaultEnv();
const formulaCompiler = createFormulaCompiler();

interface WordEditorPageProps {
  onBack: () => void;
}

// ux-r10 wd1: 打开即有代表性内容——多级标题触发大纲面板，段落展示排版；
// 无 recovery/initialDocument 时 renderer 默认只落一行 "Hello World"。
const DEMO_DOCUMENT = {
  header: [],
  main: [
    { value: '产品发布计划（2026 Q4）', level: 'first' },
    { value: '本文档描述 Nova 2.0 的发布范围、里程碑与风险预案，供评审会议使用。' },
    { value: '一、发布范围', level: 'second' },
    { value: '本次发布覆盖桌面端与移动端，包含公式引擎、协作者光标与模板中心三大特性。' },
    { value: '1.1 公式引擎', level: 'third' },
    { value: '支持 42 个内置函数，平均求值延迟低于 3ms，覆盖财务与统计两大类场景。' },
    { value: '1.2 协作者光标', level: 'third' },
    { value: '单文档支持 50 人同时编辑，远端光标同步延迟低于 200ms。' },
    { value: '二、里程碑', level: 'second' },
    { value: '10-15 功能冻结，10-25 回归测试完成，11-01 全量发布并开放灰度。' },
    { value: '三、风险与预案', level: 'second' },
    { value: '协作通道压测未达标时，降级为 20 人同编并开启排队机制。' },
  ],
  footer: [],
};

export function WordEditorPage({ onBack }: WordEditorPageProps) {
  const envWithNavigate = useMemo(
    () => ({
      ...env,
      navigate: (to: string | number) => {
        if (to === -1) {
          onBack();
        }
      },
    }),
    [onBack],
  );

  return (
    <SchemaRenderer
      schemaUrl="playground://pages/word-editor"
      schema={
        {
          type: 'word-editor-page',
          title: 'Word Editor',
          initialDocument: DEMO_DOCUMENT,
          config: {
            leftPanel: { generator: 'default' },
            rightPanel: { generator: 'default' },
          },
          onBack: { action: 'navigate', args: { back: true } },
        } as any
      }
      registry={registry}
      env={envWithNavigate}
      formulaCompiler={formulaCompiler}
    />
  );
}
