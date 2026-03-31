export interface PaperSettings {
  width: number
  height: number
  direction: 'vertical' | 'horizontal'
  margins: [number, number, number, number]
}

export const PAPER_SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  a2: { width: 1190, height: 1684 },
  a3: { width: 842, height: 1191 },
  a4: { width: 595, height: 842 },
  a5: { width: 420, height: 595 },
  b4: { width: 729, height: 1032 },
  b5: { width: 516, height: 729 }
}

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  width: PAPER_SIZE_PRESETS.a4.width,
  height: PAPER_SIZE_PRESETS.a4.height,
  direction: 'vertical',
  margins: [100, 120, 100, 120]
}
