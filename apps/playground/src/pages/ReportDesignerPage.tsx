import { ReportDesignerDemo } from './ReportDesignerDemo';

interface ReportDesignerPageProps {
  onBack: () => void;
}

export function ReportDesignerPage({ onBack }: ReportDesignerPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <button type="button" className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]" onClick={onBack}>
          Back to Home
        </button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">Report Designer</p>
        <h1>Report Designer Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">Excel editor and control bar from the original report-designer playground.</p>
        <ReportDesignerDemo />
      </section>
    </main>
  );
}
