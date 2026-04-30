import { expect, type Locator, type Page } from '@playwright/test';
import { ComponentLabHelper, scenarioSlug } from './helpers';

export async function openCrudLab(page: Page) {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('crud');
  return lab;
}

export function crudStage(lab: ComponentLabHelper, title: string): Locator {
  return lab.scenarioStage(scenarioSlug(title));
}

export function crudTable(stage: Locator): Locator {
  return stage.locator('[data-slot="crud-table"] .nop-table');
}

export function crudFooter(stage: Locator): Locator {
  return stage.locator('[data-slot="crud-footer-toolbar"]');
}

export function crudScopeDebug(stage: Locator): Locator {
  return stage.locator('[data-slot="scope-debug-json"]');
}

export function dataRows(stage: Locator): Locator {
  return stage.locator('tbody tr[data-slot="table-row"]');
}

export function emptyRows(stage: Locator): Locator {
  return stage.locator('tbody tr[data-slot="table-empty-row"]');
}

export async function expectCrudStageVisible(stage: Locator) {
  await expect(stage).toBeVisible();
  await expect(crudTable(stage)).toBeVisible();
}

export async function readInnerHtml(locator: Locator): Promise<string> {
  return locator.evaluate((node) => node.innerHTML);
}

export async function readComputedStyle(
  locator: Locator,
  properties: string[],
): Promise<Record<string, string>> {
  return locator.evaluate((node, props) => {
    const style = getComputedStyle(node as Element);
    return Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
  }, properties);
}

export async function expectRowTexts(stage: Locator, values: string[]) {
  for (const value of values) {
    await expect(stage.getByRole('cell', { name: value, exact: true })).toBeVisible();
  }
}
