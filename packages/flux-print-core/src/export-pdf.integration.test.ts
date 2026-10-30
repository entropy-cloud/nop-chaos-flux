import { describe, expect, it } from 'vitest';
import JsPDF from 'jspdf';

/**
 * Non-mocked jspdf integration test (plan 825 Phase 2 discriminator).
 *
 * `export-pdf.test.ts` fully mocks jspdf, so a runtime API break across the
 * 2.x → 4.x upgrade cannot fail it. This test drives the REAL jsPDF with the
 * exact call surface export-pdf.ts uses (custom mm format + orientation
 * constructor, addPage per page, document content, binary output) and asserts
 * the produced artifact structure. Under a breaking jsPDF upgrade these
 * assertions fail — the mocked suite cannot.
 */
describe('export-pdf jspdf integration (real library, no mock)', () => {
  it('produces a valid multi-page PDF with custom mm page sizes', () => {
    const pdf = new JsPDF({ unit: 'mm', format: [210, 148], orientation: 'landscape' });

    pdf.setFontSize(12);
    pdf.text('flux-print-core integration page 1', 10, 10);
    pdf.rect(10, 20, 60, 8);

    pdf.addPage([210, 297], 'portrait');
    pdf.text('flux-print-core integration page 2', 10, 10);

    const buffer = pdf.output('arraybuffer');
    const bytes = new Uint8Array(buffer);
    const header = String.fromCharCode(...bytes.slice(0, 5));

    expect(header).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(1000);

    const text = new TextDecoder('latin1').decode(bytes);
    // jsPDF writes MediaBox in pt (1mm ≈ 2.8346pt): 210×148mm ≈ 595×419, 297mm ≈ 841.
    // Spec-stable conversion — version-independent page-size assertions.
    expect(text).toContain('595');
    expect(text).toContain('419');
    expect(text).toContain('841');
    expect((text.match(/\/Type \/Page[^s]/g) ?? []).length).toBe(2);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });
});
