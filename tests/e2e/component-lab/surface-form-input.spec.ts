import { test, expect } from '../fixtures.js';
import { ComponentLabHelper, scenarioSlug } from './helpers';

test('dialog surface form input keeps typed value under StrictMode', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('dialog');

  const slug = scenarioSlug('Dialog with form fields and writeback');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();
  await stage.getByRole('button', { name: 'Edit Contact' }).click();

  const nameInput = page.getByLabel('Full Name');
  const emailInput = page.getByLabel('Email');
  await expect(nameInput).toBeVisible();

  await nameInput.fill('Jane Doe');
  await emailInput.fill('jane@example.com');

  // Filling email triggers a React re-render (store update → subscription notify).
  // If the form store didn't capture the name value, the controlled input would
  // reset to empty during this re-render. Verifying both values proves the store
  // holds the user's input.
  await expect(nameInput).toHaveValue('Jane Doe');
  await expect(emailInput).toHaveValue('jane@example.com');
});

test('drawer surface textarea keeps typed value under StrictMode', async ({ page }) => {
  const lab = new ComponentLabHelper(page);
  await lab.openRenderer('drawer');

  const slug = scenarioSlug('Right drawer with form and writeback');
  const stage = lab.scenarioStage(slug);
  await expect(stage).toBeVisible();
  await stage.getByRole('button', { name: 'Open Right Drawer' }).click();

  const noteField = page.getByRole('textbox', { name: 'Note' });
  await expect(noteField).toBeVisible();
  await noteField.fill('My note');

  await expect(noteField).toHaveValue('My note');
});
