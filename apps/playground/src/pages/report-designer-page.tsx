import { ReportDesignerDemo } from './report-designer-demo';
import { Button } from '@nop-chaos/ui';

interface ReportDesignerPageProps {
  onBack: () => void;
}

export function ReportDesignerPage({ onBack }: ReportDesignerPageProps) {
  return (
    <main className="min-h-screen h-screen overflow-hidden bg-[var(--nop-hero-bg)]">
      <section className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-[var(--nop-hero-border)] bg-[var(--nop-nav-surface)] px-6 py-4">
          <Button
            variant="outline"
            className="px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
            onClick={onBack}
          >
            Back to Home
          </Button>
          <div className="min-w-0">
            <p className="uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
              Report Designer
            </p>
            <h1 className="text-[22px] font-semibold leading-tight text-[var(--nop-text-strong)]">
              Report Designer Playground
            </h1>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ReportDesignerDemo />
        </div>
      </section>
    </main>
  );
}
