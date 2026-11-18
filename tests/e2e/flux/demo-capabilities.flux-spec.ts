import type { FtGlobal } from '@nop-chaos/flux-test-driver';
import { expectNoPageErrors } from '@nop-chaos/flux-test-driver';

// E3 Wave 1 Phase 1 proof spec: exercises the new driver capabilities on a
// fixture DOM built in-page — expectWeb retry assertions, nested/last locator,
// inputValue/selectOption, keyboard chord + mouse drag/wheel via the gateway
// real-input channel, setViewportSize, and the kernel errors() white-box.
export default async function demoCapabilities(ft: FtGlobal): Promise<{ summary: string }> {
  await ft.waitFor({ type: 'stability' }, { timeoutMs: 15_000 });

  ft.evaluate(`
    document.body.insertAdjacentHTML('beforeend', \`
      <div id="ft-fixture">
        <h2 id="ft-title">Capabilities Fixture</h2>
        <input id="ft-input" value="" />
        <select id="ft-select"><option value="a">A</option><option value="b">B</option></select>
        <input type="checkbox" id="ft-check" />
        <ul id="ft-list"><li>one</li><li>two</li></ul>
        <div id="ft-drag" style="width:40px;height:40px;position:absolute;left:40px;top:40px;background:#04c"></div>
      </div>\`);
    const drag = document.querySelector('#ft-drag');
    let dragOffset = null;
    drag.addEventListener('mousedown', (e) => {
      const r = drag.getBoundingClientRect();
      dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragOffset) return;
      drag.style.left = \`\${e.clientX - dragOffset.x}px\`;
      drag.style.top = \`\${e.clientY - dragOffset.y}px\`;
    });
    document.addEventListener('mouseup', () => {
      dragOffset = null;
    });
    true
  `);

  // expectWeb: retry + presence
  await ft.expectWeb(ft.locator('#ft-title')).toBeVisible({ timeoutMs: 5_000 });
  await ft.expectWeb(ft.locator('#ft-title')).toContainText('Capabilities');
  await ft.expectWeb(ft.locator('#ft-missing')).not.toBeVisible({ timeoutMs: 1_000 });

  // nested locator + last + inputValue + selectOption + check
  await ft.expectWeb(ft.locator('#ft-list').locator('li')).toHaveCount(2);
  await ft.expectWeb(ft.locator('#ft-list li').last()).toHaveText('two');
  await ft.locator('#ft-input').fill('typed');
  await ft.expectWeb(ft.locator('#ft-input')).toHaveValue('typed');
  await ft.locator('#ft-select').selectOption('b');
  await ft.expectWeb(ft.locator('#ft-select')).toHaveValue('b');
  await ft.locator('#ft-check').check();
  const checked = await ft.evaluate(`document.querySelector('#ft-check').checked`);
  if (!checked) throw new Error('checkbox not checked after locator.check()');

  // keyboard chord via real-input channel (synthetic fallback allowed)
  const input = ft.locator('#ft-input');
  await input.click();
  await ft.keyboard.press('Shift+ArrowHome');
  await ft.keyboard.type('X');
  const afterKey = await input.inputValue();
  if (!afterKey.includes('X')) throw new Error(`keyboard input not reflected: "${afterKey}"`);

  // mouse drag via real-input channel (absolute-positioned box moves)
  const before = await ft.locator('#ft-drag').boundingBox();
  await ft.mouse.move(before.x + 20, before.y + 20);
  await ft.mouse.down();
  await ft.mouse.move(before.x + 120, before.y + 140);
  await ft.mouse.up();
  const after = await ft.locator('#ft-drag').boundingBox();

  // wheel scroll should not throw
  await ft.mouse.wheel(0, 120);

  // viewport resize via gateway emulation channel
  await ft.setViewportSize(1_024, 800);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const vw = await ft.evaluate('window.innerWidth');
  if (Math.abs(Number(vw) - 1_024) > 2) throw new Error(`viewport width not applied: ${vw}`);
  await ft.setViewportSize(1_280, 800);

  // kernel white-box errors
  await expectNoPageErrors(ft, 'demo-capabilities');
  const tracked = ft.errors();
  if (tracked.length > 0) throw new Error(`kernel tracked errors: ${JSON.stringify(tracked)}`);

  return {
    summary: `capabilities ok (drag moved: ${Math.abs(after.x - before.x) > 1 || Math.abs(after.y - before.y) > 1}; keyboard="${afterKey}"; viewport=${vw})`,
  };
}
