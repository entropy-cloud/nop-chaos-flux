import { useState } from 'react';
import { Button } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import type { DiffFileMeta } from '@nop-chaos/flux-renderers-content';
import { ArrowLeft } from 'lucide-react';

interface DiffDemoPageProps {
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

const OLD_CONTENT = `姓名：张三
年龄：30
地址：北京市朝阳区
电话：13800138000
邮箱：zhangsan@example.com
职位：高级工程师
部门：研发中心
入职日期：2023-01-15`;

const NEW_CONTENT = `姓名：张三
年龄：31
地址：上海市浦东新区
电话：13900139000
邮箱：zhangsan@example.com
职位：资深工程师
部门：研发中心
入职日期：2023-01-15
离职日期：2026-07-20`;

const MIDDLE_CONTENT = `姓名：张三
年龄：30
地址：上海市浦东新区
电话：13800138000
邮箱：zhangsan@example.com
职位：高级工程师
部门：研发中心
入职日期：2023-01-15`;

const CROSS_FILE_FILES: DiffFileMeta[] = [
  {
    fileName: 'src/user/profile.ts',
    status: 'modified',
    oldContent: `export function getDisplayName(user: User): string {
  return user.name;
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\\d{3})(\\d{4})(\\d{4})/, '$1****$3');
}`,
    newContent: `export function getDisplayName(user: User): string {
  return user.nickname ?? user.name;
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\\d{3})(\\d{4})(\\d{4})/, '$1****$3');
}

export function formatEmail(email: string): string {
  return email.toLowerCase();
}`,
    language: 'typescript',
  },
  {
    fileName: 'src/user/constants.ts',
    status: 'added',
    oldContent: '',
    newContent: `export const DEFAULT_PAGE_SIZE = 20;
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const;
`,
    language: 'typescript',
  },
  {
    fileName: 'src/legacy/utils.js',
    status: 'deleted',
    oldContent: `function legacyFormat(input) {
  return input.toString().padStart(2, '0');
}

module.exports = { legacyFormat };`,
    newContent: '',
    language: 'javascript',
  },
  {
    fileName: 'config/api-endpoints.json',
    status: 'modified',
    oldContent: `{
  "baseUrl": "http://old-api.example.com",
  "timeout": 5000,
  "retryCount": 0
}`,
    newContent: `{
  "baseUrl": "https://api.example.com",
  "timeout": 10000,
  "retryCount": 3,
  "enableCompression": true
}`,
    language: 'json',
  },
  {
    fileName: 'README.md',
    status: 'added',
    oldContent: '',
    newContent: `# User Service

## Getting Started
Run \`pnpm install\` then \`pnpm dev\`.

## API Documentation
See \`docs/api.md\` for details.
`,
  },
];

export function DiffDemoPage({ onBack }: DiffDemoPageProps) {
  const [viewType, setViewType] = useState<'split' | 'unified'>('split');
  const [showInlineDiff, setShowInlineDiff] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const initialMode = (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('mode') : null) as 'single' | 'three-column' | 'cross-file' | null;
  const [mode, setMode] = useState<'single' | 'three-column' | 'cross-file'>(initialMode ?? 'single');

  const singleSchema = {
    type: 'diff-view',
    oldContent: OLD_CONTENT,
    newContent: NEW_CONTENT,
    language: 'plaintext',
    viewType,
    showLineNumbers,
    showInlineDiff,
    defaultCollapsedLines: 15,
    wrapLines: false,
  };

  const threeColumnSchema = {
    ...singleSchema,
    oldContent: OLD_CONTENT,
    newContent: NEW_CONTENT,
    middleContent: MIDDLE_CONTENT,
  };

  const crossFileSchema = {
    type: 'diff-view',
    files: CROSS_FILE_FILES,
    activeFileIndex: 0,
    viewType,
    showLineNumbers,
    showInlineDiff,
    defaultCollapsedLines: 15,
    wrapLines: false,
  };

  const schema = mode === 'cross-file' ? crossFileSchema
    : mode === 'three-column' ? threeColumnSchema
    : singleSchema;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Diff View Demo</h1>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-gray-50 shrink-0">
        <label className="flex items-center gap-2 text-sm">
          Mode:
          <select
            className="border rounded px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="single">Single File</option>
            <option value="three-column">Three-Column Compare</option>
            <option value="cross-file">Cross-File</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          View Type:
          <select
            className="border rounded px-2 py-1 text-sm"
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'split' | 'unified')}
          >
            <option value="split">Split</option>
            <option value="unified">Unified</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInlineDiff}
            onChange={(e) => setShowInlineDiff(e.target.checked)}
          />
          Inline Diff
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showLineNumbers}
            onChange={(e) => setShowLineNumbers(e.target.checked)}
          />
          Line Numbers
        </label>
      </div>
      <div className="flex-1 min-h-0">
        <SchemaRenderer
          schemaUrl="diff-view://demo"
          schema={schema as any}
          registry={registry as any}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>
    </div>
  );
}
