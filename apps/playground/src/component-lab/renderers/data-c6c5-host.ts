import type { ActionScope, BaseSchema } from '@nop-chaos/flux-core';

/**
 * C6.5 Phase 3 host-scenario schemas + probe registration (real-browser surfaces).
 * Extracted to keep the lab pages within the lint max-lines budget.
 *
 * Covers the plan failure paths:
 *   host-diff-dialog — diff-view inside an openDialog surface: the split view
 *                      renders and a real line click dispatches onLineClick
 *                      with the payload args resolving ${lineNumber}|${side}|${type}
 *                      (bug 73 pattern: real-browser interaction inside a dialog).
 *   host-diff-crosfile — cross-file mode: file-list navigation drives content
 *                      switching AND out-of-range activeFileIndex values
 *                      (99 / -5) clamp to the last/first file at mount.
 *   host-diff-reaction — CX-9 reaction wiring: schema-declared toggleViewType
 *                      reaction (dependsOn: ['toggle']) fires on scope change
 *                      and flips data-view; setViewType reaction (dependsOn:
 *                      ['viewMode']) drives an explicit view type.
 *   host-diff-expand — component:expandAll/collapseAll handles drive the
 *                      data-expanded state of folded hunks.
 *   host-diff-empty — identical old/new content renders the noChanges empty
 *                      state.
 */

const OLD_CONTENT = `姓名：张三
年龄：30
地址：北京市朝阳区
电话：13800138000
职位：高级工程师`;

const NEW_CONTENT = `姓名：张三
年龄：31
地址：上海市浦东新区
电话：13900139000
职位：资深工程师
离职日期：2026-07-20`;

const EXPAND_OLD = `line1
line2
line3
line4
line5
line6
line7
line8
line9
line10
line11
line12
old-changed`;

const EXPAND_NEW = `line1
line2
line3
line4
line5
line6
line7
line8
line9
line10
line11
line12
new-changed
line14`;

export const C6C5_FILES = [
  {
    fileName: 'src/user/profile.ts',
    status: 'modified',
    oldContent: 'export function getName(u) {\n  return u.name;\n}',
    newContent:
      'export function getName(u) {\n  return u.nickname ?? u.name;\n}\n\nexport function formatEmail(e) {\n  return e.toLowerCase();\n}',
    language: 'typescript',
  },
  {
    fileName: 'src/user/constants.ts',
    status: 'added',
    oldContent: '',
    newContent: 'export const DEFAULT_PAGE_SIZE = 20;',
  },
  {
    fileName: 'src/legacy/utils.js',
    status: 'deleted',
    oldContent: 'function legacyFormat(i) {\n  return i.toString().padStart(2, "0");\n}',
    newContent: '',
  },
];

/**
 * Probe namespace: `probe:lineClick` records the onLineClick payload args
 * (evaluationBindings resolution — P1-10 fix real-browser proof).
 */
export function registerC6c5Probe(actionScope: ActionScope | null) {
  actionScope?.registerNamespace('probe', {
    kind: 'host',
    invoke(method, payload) {
      const value = String((payload as { value?: unknown } | undefined)?.value ?? '');
      const w = window as unknown as {
        __c6c5LineClick?: string;
      };
      if (method === 'lineClick') {
        w.__c6c5LineClick = value;
      }
      return { ok: true, data: value };
    },
  });
}

export const c6c5DialogSchema = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Open diff dialog',
      testid: 'c6c5-dialog-open',
      onClick: {
        action: 'openDialog',
        args: {
          title: 'Diff host',
          body: {
            type: 'page',
            body: [
              {
                type: 'diff-view',
                testid: 'c6c5-dialog-diff',
                oldContent: OLD_CONTENT,
                newContent: NEW_CONTENT,
                onLineClick: {
                  action: 'probe:lineClick',
                  args: { value: '${lineNumber}|${side}|${type}' },
                },
              },
            ],
          },
        },
      },
    },
  ],
} as unknown as BaseSchema;

export const c6c5CrossFileSchema = {
  type: 'page',
  data: { files: C6C5_FILES },
  body: [
    {
      type: 'diff-view',
      testid: 'c6c5-cross',
      files: '${files}',
      activeFileIndex: 0,
    },
    {
      type: 'diff-view',
      testid: 'c6c5-cross-high',
      files: '${files}',
      activeFileIndex: 99,
    },
    {
      type: 'diff-view',
      testid: 'c6c5-cross-low',
      files: '${files}',
      activeFileIndex: -5,
    },
  ],
} as unknown as BaseSchema;

export const c6c5ReactionSchema = {
  type: 'page',
  data: { toggle: false, viewMode: 'split' },
  body: [
    {
      type: 'diff-view',
      id: 'c6c5-reaction-diff',
      testid: 'c6c5-reaction-diff',
      oldContent: OLD_CONTENT,
      newContent: NEW_CONTENT,
      toggleViewType: {
        action: 'component:toggleViewType',
        componentId: 'c6c5-reaction-diff',
        dependsOn: ['toggle'],
      },
      setViewType: {
        action: 'component:setViewType',
        componentId: 'c6c5-reaction-diff',
        dependsOn: ['viewMode'],
        args: { viewType: '${viewMode}' },
      },
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Toggle view (reaction)',
          testid: 'c6c5-reaction-toggle',
          onClick: { action: 'setValue', args: { path: 'toggle', value: '${!toggle}' } },
        },
        {
          type: 'button',
          label: 'Set unified (reaction)',
          testid: 'c6c5-reaction-unified',
          onClick: { action: 'setValue', args: { path: 'viewMode', value: 'unified' } },
        },
        {
          type: 'button',
          label: 'Set split (reaction)',
          testid: 'c6c5-reaction-split',
          onClick: { action: 'setValue', args: { path: 'viewMode', value: 'split' } },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c5ExpandSchema = {
  type: 'page',
  body: [
    {
      type: 'diff-view',
      id: 'c6c5-expand-diff',
      testid: 'c6c5-expand-diff',
      oldContent: EXPAND_OLD,
      newContent: EXPAND_NEW,
      defaultCollapsedLines: 2,
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 8,
      body: [
        {
          type: 'button',
          label: 'Expand all (handle)',
          testid: 'c6c5-expand-all',
          onClick: { action: 'component:expandAll', componentId: 'c6c5-expand-diff' },
        },
        {
          type: 'button',
          label: 'Collapse all (handle)',
          testid: 'c6c5-collapse-all',
          onClick: { action: 'component:collapseAll', componentId: 'c6c5-expand-diff' },
        },
      ],
    },
  ],
} as unknown as BaseSchema;

export const c6c5EmptySchema = {
  type: 'page',
  body: [
    {
      type: 'diff-view',
      testid: 'c6c5-empty',
      oldContent: 'same\ncontent',
      newContent: 'same\ncontent',
    },
  ],
} as unknown as BaseSchema;
