/**
 * Format registry for extensible value format validation.
 *
 * Allows registering custom format validators that can be used
 * with the `format` property on form fields.
 *
 * Usage:
 * ```typescript
 * import { formatRegistry } from '@nop-chaos/flux-core';
 *
 * // Register a custom format
 * formatRegistry.register('phone', {
 *   validate: (value) => /^1[3-9]\d{9}$/.test(value),
 *   messageKey: 'validation.format.phone',  // i18n key
 *   defaultMessage: 'Invalid phone number',  // fallback
 * });
 *
 * // Use in schema
 * { type: 'input-text', name: 'phone', format: 'phone' }
 * ```
 */

export interface FormatValidator {
  /** Validate the value. Returns true if valid. */
  validate: (value: unknown) => boolean;
  /** i18n message key for the error message */
  messageKey: string;
  /** Fallback message when i18n is not available */
  defaultMessage: string;
}

export class FormatRegistry {
  private formats = new Map<string, FormatValidator>();

  /**
   * Register a format validator
   */
  register(name: string, validator: FormatValidator): void {
    this.formats.set(name, validator);
  }

  /**
   * Unregister a format validator
   */
  unregister(name: string): boolean {
    return this.formats.delete(name);
  }

  /**
   * Get a format validator by name
   */
  get(name: string): FormatValidator | undefined {
    return this.formats.get(name);
  }

  /**
   * Check if a format is registered
   */
  has(name: string): boolean {
    return this.formats.has(name);
  }

  /**
   * List all registered format names
   */
  list(): string[] {
    return Array.from(this.formats.keys());
  }
}

/** Global format registry instance */
export const formatRegistry = new FormatRegistry();

// Register built-in formats
formatRegistry.register('email', {
  validate: (value) => {
    if (typeof value !== 'string' || value === '') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  messageKey: 'validation.format.email',
  defaultMessage: 'Invalid email format',
});

formatRegistry.register('url', {
  validate: (value) => {
    if (typeof value !== 'string' || value === '') return true;
    return /^https?:\/\/.+/.test(value);
  },
  messageKey: 'validation.format.url',
  defaultMessage: 'Invalid URL format',
});

formatRegistry.register('integer', {
  validate: (value) => {
    if (typeof value !== 'string' || value === '') return true;
    return /^-?\d+$/.test(value);
  },
  messageKey: 'validation.format.integer',
  defaultMessage: 'Must be an integer',
});
