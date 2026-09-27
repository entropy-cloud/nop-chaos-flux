import { PageDesigner } from '@nop-chaos/page-designer-renderers';

/**
 * `#/page-designer` 路由壳（plan 523 L6 S2）。
 *
 * 设计器两包经 lazy import 隔离（App.tsx LazyPageDesignerPage），
 * 设计器自持 registry 实例，与 playground 主 registry 零共享（S1 §11.1）。
 */
export function PageDesignerDemoPage({ onBack }: { onBack?: () => void }) {
  return <PageDesigner onBack={onBack} />;
}
