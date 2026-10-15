import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * P5.1（plan 560）：designer 契约符合性守卫自身回归——
 * 对 conformed baseline（P0-P4 落地后）应 exit 0。
 */
describe('check-designer-conformance', () => {
  it('passes against the conformed eight-family baseline', () => {
    const stdout = execFileSync('node', ['scripts/check-designer-conformance.mjs'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });
    expect(stdout).toContain('all designer contract conformance checks passed');
  });

  // plan 538 Phase 3 判别 fixtures：collapsed 契约接线规则（--root/--families 参数化入口）。
  // 未接线宿主样本必须被规则报红（旧脚本无此规则、无法产生期望的红——判别机制）；已接线样本绿。
  // fixture 树只含 scada 家族（--families scada 子集入口；断言 8 因 fixture root 无标准 doc 而跳过），
  // 样本文件携带其余断言的契约标记（manifest/fields 内联事件契约/statusPath/editor-core/i18n/marker），
  // 使红绿两腿的差异只落在 collapsed 接线规则上。
  describe('collapsed contract wiring rule (plan 538)', () => {
    const fixturesRoot = mkdtempSync(join(tmpdir(), 'conformance-fixtures-'));
    const scadaRenderersSrc = join(fixturesRoot, 'packages/flux-renderers-industrial/src');

    afterAll(() => {
      rmSync(fixturesRoot, { recursive: true, force: true });
    });

    function seedScadaFixture(wired: boolean) {
      mkdirSync(scadaRenderersSrc, { recursive: true });
      const wiring = wired
        ? ' onLeftToggle={toggleLeft} onRightToggle={toggleRight}'
        : '';
      writeFileSync(
        join(scadaRenderersSrc, 'fixture-host.tsx'),
        [
          '/* conformed markers for non-collapsed assertions */',
          'export const MANIFEST_V1 = true;',
          "export const fields = [{ key: 'onReady', kind: 'event', contract: { displayName: 'Ready', payload: { kind: 'unknown' } } }];",
          'export const useStatusPathPublication = () => {};',
          "import '@nop-chaos/editor-core';",
          '/* i18n prefix sample: industrial.scada.editor */',
          'export const host = (',
          '  <WorkbenchShell data-slot="scada-host" leftPanel={palette}' + wiring + ' rightPanel={inspector} />',
          ');',
        ].join('\n'),
      );
      writeFileSync(
        join(fixturesRoot, 'packages/flux-renderers-industrial/package.json'),
        JSON.stringify({ dependencies: { '@nop-chaos/editor-core': 'workspace:*' } }),
      );
    }

    it('fails an unwired side-panel host (no onLeftToggle/onRightToggle)', () => {
      seedScadaFixture(false);
      let stderr = '';
      try {
        execFileSync(
          'node',
          ['scripts/check-designer-conformance.mjs', '--root', fixturesRoot, '--families', 'scada'],
          { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' },
        );
        throw new Error('expected the unwired fixture to fail the conformance guard');
      } catch (error) {
        stderr = String((error as { stderr?: string }).stderr ?? error);
      }
      expect(stderr).toContain('collapsed 契约接线（onLeftToggle）');
      expect(stderr).toContain('collapsed 契约接线（onRightToggle）');
      expect(stderr).not.toContain('manifest V1');
      expect(stderr).not.toContain('statusPath');
    });

    it('passes a wired side-panel host (onLeftToggle/onRightToggle present)', () => {
      seedScadaFixture(true);
      const stdout = execFileSync(
        'node',
        ['scripts/check-designer-conformance.mjs', '--root', fixturesRoot, '--families', 'scada'],
        { encoding: 'utf8', cwd: process.cwd() },
      );
      expect(stdout).toContain('all designer contract conformance checks passed');
    });
  });
});
