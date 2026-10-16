import { Range, StateField, type Extension } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { setExceptionLinesEffect, setSuspendedLinesEffect } from './effects.js';

/** 挂起行高亮派发（family: suspended-line）。 */
export const setSuspendedLines = setSuspendedLinesEffect;
/** 异常行派发（family: exception）。 */
export const setExceptionLines = setExceptionLinesEffect;

const suspendedLineDeco = Decoration.line({ class: 'xlang-debug-suspended-line' });
const exceptionMark = Decoration.mark({ class: 'xlang-debug-exception-mark' });

function clampLines(lines: readonly number[], docLines: number): number[] {
  const max = Math.max(docLines, 1);
  return lines.map((lineNo) => Math.min(Math.max(lineNo, 1), max));
}

function buildLineDecorations(lines: readonly number[], doc: EditorView['state']['doc']): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const lineNo of clampLines(lines, doc.lines)) {
    const line = doc.line(lineNo);
    ranges.push({ from: line.from, to: line.from, value: suspendedLineDeco });
  }
  return Decoration.set(ranges);
}

function buildMarkDecorations(lines: readonly number[], doc: EditorView['state']['doc']): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const lineNo of clampLines(lines, doc.lines)) {
    const line = doc.line(lineNo);
    if (line.to > line.from) {
      ranges.push({ from: line.from, to: line.from + 1, value: exceptionMark });
    }
  }
  return Decoration.set(ranges, true);
}

/**
 * 挂起行 StateField（family: suspended-line，plan 617 Phase 2）：Decoration.line
 * 高亮；文档编辑经 decorations.map 收敛行号，store 派发全量重置。
 */
export const suspendedLinesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setSuspendedLinesEffect)) {
        next = buildLineDecorations(effect.value, tr.state.doc);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * 异常波浪线 StateField（family: exception）：行首字符 Decoration.mark。
 */
export const exceptionLinesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let next = value.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setExceptionLinesEffect)) {
        next = buildMarkDecorations(effect.value, tr.state.doc);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export function createSuspendedLineExtension(): Extension {
  return suspendedLinesField;
}

export function createExceptionSquiggleExtension(): Extension {
  return exceptionLinesField;
}
