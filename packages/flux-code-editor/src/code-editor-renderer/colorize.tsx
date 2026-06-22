import { useMemo } from 'react';
import type { HighlightStyle } from '@codemirror/language';
import { defaultHighlightStyle } from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { highlightTree } from '@lezer/highlight';
import { getLanguageParser } from '../extensions/base.js';
import type { EditorLanguage } from '../types.js';

export interface ColorizeViewProps {
  value: string;
  language: EditorLanguage;
  editorTheme: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

interface HighlightRange {
  from: number;
  to: number;
  classes: string;
}

function resolveHighlightStyle(editorTheme: 'light' | 'dark'): HighlightStyle {
  return editorTheme === 'dark' ? oneDarkHighlightStyle : defaultHighlightStyle;
}

interface ColorizeResult {
  ranges: HighlightRange[] | null;
  fallback: boolean;
}

function buildColorize(
  code: string,
  language: EditorLanguage,
  highlightStyle: HighlightStyle,
): ColorizeResult {
  const parser = getLanguageParser(language);
  if (!parser) {
    return { ranges: null, fallback: true };
  }
  try {
    const tree = parser.parse(code);
    const ranges: HighlightRange[] = [];
    highlightTree(tree, highlightStyle, (from, to, classes) => {
      if (from < to && classes) ranges.push({ from, to, classes });
    });
    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    return { ranges, fallback: false };
  } catch {
    return { ranges: null, fallback: true };
  }
}

function renderHighlighted(code: string, ranges: HighlightRange[] | null): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  if (!ranges || ranges.length === 0) {
    parts.push(code);
    return parts;
  }
  let pos = 0;
  let key = 0;
  for (const range of ranges) {
    if (range.from > pos) {
      parts.push(code.slice(pos, range.from));
    }
    if (range.to > range.from) {
      parts.push(
        <span key={`tok-${key++}`} className={range.classes}>
          {code.slice(range.from, range.to)}
        </span>,
      );
    }
    pos = Math.max(pos, range.to);
  }
  if (pos < code.length) {
    parts.push(code.slice(pos));
  }
  return parts;
}

export function ColorizeView({ value, language, editorTheme, className, style }: ColorizeViewProps) {
  const code = value ?? '';
  const highlightStyle = resolveHighlightStyle(editorTheme);

  const result = useMemo(
    () => buildColorize(code, language, highlightStyle),
    [code, language, highlightStyle],
  );

  const cssRules = useMemo(() => highlightStyle.module?.getRules() ?? '', [highlightStyle]);

  const content = renderHighlighted(code, result.ranges);

  return (
    <pre
      data-colorize=""
      data-colorize-language={language}
      data-colorize-theme={editorTheme}
      data-colorize-fallback={result.fallback ? '' : undefined}
      className={className}
      style={style}
    >
      {cssRules ? <style>{cssRules}</style> : null}
      <code>{content}</code>
    </pre>
  );
}
