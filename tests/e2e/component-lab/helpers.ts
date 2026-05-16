/**
 * Shared Playwright helpers for the Component Lab E2E suite.
 *
 * Usage pattern:
 *   const lab = new ComponentLabHelper(page);
 *   await lab.openRenderer('button');
 *   const stage = lab.scenarioStage('onclick-with-visible-scope-side-effect-counter-');
 *   await expect(stage).toBeVisible();
 */

import { type Locator } from '@playwright/test';
import { expect, type Page, assertTrackedPageErrors } from '../fixtures.js';
import { COMPONENT_LAB_COVERAGE_MANIFEST, COVERED_RENDERER_IDS } from './coverage-manifest';

export { COMPONENT_LAB_COVERAGE_MANIFEST, COVERED_RENDERER_IDS };

const COMPONENT_LAB_BOOT_TIMEOUT = 45_000;
const COMPONENT_LAB_RENDERER_TIMEOUT = 30_000;

/**
 * Navigate directly to a renderer lab page via hash URL.
 * Does not go through the home page — faster and more reliable for smoke tests.
 */
export async function openRendererDirect(page: Page, rendererId: string): Promise<void> {
  await page.goto(`/#/lab/${rendererId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('component-lab')).toBeVisible({
    timeout: COMPONENT_LAB_BOOT_TIMEOUT,
  });
  await expect(page.getByTestId(`component-lab-renderer-${rendererId}`)).toBeVisible({
    timeout: COMPONENT_LAB_RENDERER_TIMEOUT,
  });
  await assertTrackedPageErrors(page);
}

/**
 * Navigate to the component lab home page (no renderer selected).
 */
export async function openLabHome(page: Page): Promise<void> {
  await page.goto('/#/lab', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('component-lab')).toBeVisible({
    timeout: COMPONENT_LAB_BOOT_TIMEOUT,
  });
  await assertTrackedPageErrors(page);
}

/**
 * Helpers for a single renderer lab session.
 */
export class ComponentLabHelper {
  constructor(readonly page: Page) {}

  /** Navigate directly to a renderer lab page. */
  async openRenderer(rendererId: string): Promise<void> {
    await openRendererDirect(this.page, rendererId);
  }

  /** The main content area wrapper for the currently active renderer. */
  rendererContainer(rendererId: string): Locator {
    return this.page.getByTestId(`component-lab-renderer-${rendererId}`);
  }

  /** The h1 title element for the active renderer. */
  get rendererTitle(): Locator {
    return this.page.getByTestId('component-lab-renderer-title');
  }

  /** The mono id element below the title. */
  get rendererId(): Locator {
    return this.page.getByTestId('component-lab-renderer-id');
  }

  /** The multi-scenario lab wrapper. */
  get multiScenarioLab(): Locator {
    return this.page.getByTestId('multi-scenario-lab');
  }

  /**
   * The outermost scenario block div.
   * `slug` is derived from the scenario title: lowercase, non-alphanumeric runs become `-`.
   * Example: 'onClick with visible scope side-effect (counter)' → 'onclick-with-visible-scope-side-effect-counter-'
   * Use `scenarioSlug(title)` to compute it.
   */
  scenarioBlock(slug: string): Locator {
    return this.page.getByTestId(`scenario-${slug}`);
  }

  /** The stage (rendered content area) of a scenario block. */
  scenarioStage(slug: string): Locator {
    return this.page.getByTestId(`scenario-stage-${slug}`);
  }

  /** The title element of a scenario block. */
  scenarioTitleEl(slug: string): Locator {
    return this.page.getByTestId(`scenario-title-${slug}`);
  }

  /** The sidebar nav button for a renderer id. */
  navItem(rendererId: string): Locator {
    return this.page.getByTestId(`nav-renderer-${rendererId}`);
  }

  /** The "← Back to Home" button. */
  get backButton(): Locator {
    return this.page.getByTestId('component-lab-back');
  }

  /** The left sidebar nav. */
  get sidebar(): Locator {
    return this.page.getByTestId('component-lab-sidebar');
  }
}

/**
 * Convert a scenario title string to the slug used in data-testid attributes.
 * Mirrors the slug computation in MultiScenarioLabPage.tsx.
 */
export function scenarioSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
