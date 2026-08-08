import { SYMBOL_EVENT_ONS, isPlainObject } from './helpers.js';

export function validateSymbolEvent(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const event = value as Record<string, unknown>;
  if (typeof event.on !== 'string' || !SYMBOL_EVENT_ONS.includes(event.on)) {
    errors.push(`${scope}.on must be one of: click | dblclick | hover`);
  }
  const action = event.action;
  if (!isPlainObject(action) || typeof (action as Record<string, unknown>).action !== 'string') {
    errors.push(`${scope}.action must be an object with an action string (ActionSchema)`);
  }
}
