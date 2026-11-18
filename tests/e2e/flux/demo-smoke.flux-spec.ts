import type { FtGlobal } from '@nop-chaos/flux-test-driver';

// E1 smoke demo spec — NOT part of the Playwright suite (.flux-spec.ts is
// outside playwright testMatch). Exercises: page load → kernel attach →
// stability wait → Locator text → kernel-attached semantic checks.
export default async function demoSmoke(ft: FtGlobal): Promise<{ title: string }> {
  const stable = await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });
  if (!stable.ok) throw new Error(`page never stabilized: ${stable.lastError ?? 'timeout'}`);

  const heading = await ft.locator('h1', { timeoutMs: 10_000 }).text();
  if (!heading || heading.trim().length === 0) {
    throw new Error('page heading text was empty');
  }

  if (!ft.kernel.attached) {
    throw new Error('kernel-not-attached: playground debugger kernel missing');
  }

  return { title: heading.trim().slice(0, 60) };
}
