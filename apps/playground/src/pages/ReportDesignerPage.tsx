import { ReportDesignerDemo } from './ReportDesignerDemo';

interface ReportDesignerPageProps {
  onBack: () => void;
}

export function ReportDesignerPage({ onBack }: ReportDesignerPageProps) {
  return (
    <main className="app-shell">
      <section className="hero-card hero-card--wide">
        <button type="button" className="page-back" onClick={onBack}>
          Back to Home
        </button>
        <p className="eyebrow">Report Designer</p>
        <h1>Report Designer Playground</h1>
        <p className="body-copy">Excel editor and control bar from the original report-designer playground.</p>
        <ReportDesignerDemo />
      </section>
    </main>
  );
}
