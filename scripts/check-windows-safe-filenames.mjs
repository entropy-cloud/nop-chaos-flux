import { spawnSync } from 'node:child_process';
import process from 'node:process';

const INVALID_CHARS = new Set(['<', '>', ':', '"', '|', '?', '*']);
const RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

function listTrackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.message}`);
  }
  return result.stdout.split('\0').filter(Boolean);
}

function checkSegment(segment) {
  const problems = [];
  for (const ch of segment) {
    const code = ch.codePointAt(0);
    if (code < 32 || INVALID_CHARS.has(ch)) {
      problems.push(`非法字符 ${JSON.stringify(ch)}`);
    }
  }
  if (segment.endsWith('.') || segment.endsWith(' ')) {
    problems.push('段尾不允许 "." 或空格');
  }
  const dotIndex = segment.indexOf('.');
  const stem = (dotIndex === -1 ? segment : segment.slice(0, dotIndex)).toUpperCase();
  if (RESERVED_NAMES.has(stem)) {
    problems.push(`Windows 保留名 ${stem}`);
  }
  return problems;
}

try {
  const files = listTrackedFiles();
  const violations = [];

  for (const file of files) {
    const segments = file.split('/');
    const reasons = new Set();
    for (const segment of segments) {
      for (const problem of checkSegment(segment)) {
        reasons.add(problem);
      }
    }
    if (reasons.size > 0) {
      violations.push({ file, reasons: [...reasons] });
    }
  }

  if (violations.length > 0) {
    console.error(
      `[check-windows-safe-filenames] ERROR: ${violations.length} tracked path(s) contain Windows-illegal names (checkout will fail on Windows):`,
    );
    for (const { file, reasons } of violations) {
      console.error(`- ${file}  (${reasons.join('; ')})`);
    }
    process.exit(1);
  }

  console.log(
    `[check-windows-safe-filenames] All ${files.length} tracked paths are Windows-safe (chars <>:"|?* , trailing dot/space, reserved names).`,
  );
} catch (error) {
  console.error('[check-windows-safe-filenames] Error:', error instanceof Error ? error.message : error);
  process.exit(1);
}
