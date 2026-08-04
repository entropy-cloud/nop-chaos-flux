import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft } from 'lucide-react';

interface DiffPerfScalePageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerContentRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

function generateLineContent(lineNum: number, base: string): string {
  return `${base.padEnd(30, ' ')} // line ${lineNum}`;
}

function generateDiffContent(lineCount: number) {
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (let i = 1; i <= lineCount; i++) {
    if (i % 10 === 0) {
      oldLines.push(generateLineContent(i, `function removedMethod_${i}()`));
    } else if (i % 7 === 0) {
      oldLines.push(generateLineContent(i, `const OLD_CONSTANT_${i} = 'old_value'`));
      newLines.push(generateLineContent(i, `const NEW_CONSTANT_${i} = 'new_value'`));
    } else if (i % 5 === 0) {
      newLines.push(generateLineContent(i, `function addedMethod_${i}()`));
    } else {
      oldLines.push(generateLineContent(i, `const sharedVar_${i}`));
      newLines.push(generateLineContent(i, `const sharedVar_${i}`));
    }
  }

  return oldLines.join('\n') + '\n' + newLines.join('\n');
}

const LINE_COUNT = 1500;
const RAW_CONTENT = generateDiffContent(LINE_COUNT);

const LARGE_FILE_CONTENT = `import { useState, useEffect } from 'react';
import { Button, Card, Input, Dialog } from '@nop-chaos/ui';

${RAW_CONTENT}

export function LargeComponent() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    document.title = \`Count: \${count}\`;
  }, [count]);
  return (
    <div>
      <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
      <p>Count: {count}</p>
    </div>
  );
}`;

const LARGE_FILE_CONTENT_NEW = LARGE_FILE_CONTENT.replace(
  /function generateLineContent/g,
  'function generateLineContentV2',
).replace(/const sharedVar/g, 'const sharedVarNew').replace(
  /OLD_CONSTANT/g,
  'OLD_CONSTANT_DEPRECATED',
);

const SCALE_DIFF_SCHEMA = {
  type: 'diff-view',
  oldContent: `/**
 * User Management Module
 * @version 1.0.0
 */
${LARGE_FILE_CONTENT}`,
  newContent: `/**
 * User Management Module
 * @version 2.0.0
 * @author Team
 * @deprecated Use v2 module
 */
${LARGE_FILE_CONTENT_NEW}`,
  language: 'typescript',
  viewType: 'split',
  showLineNumbers: true,
  showInlineDiff: true,
  // 0 → no hunk collapsing: the scale page exists to render the full 1500+
  // line diff on first screen so the perf baseline measures real work.
  defaultCollapsedLines: 0,
  wrapLines: false,
};

export function DiffPerfScaleDemoPage({ onBack }: DiffPerfScalePageProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Diff View Performance Scale (1500+ lines)</h1>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="diff-view://perf-scale"
          schema={SCALE_DIFF_SCHEMA as React.ComponentProps<typeof SchemaRenderer>['schema']}
          registry={registry as React.ComponentProps<typeof SchemaRenderer>['registry']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
