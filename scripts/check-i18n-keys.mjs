/**
 * Check that all i18n keys used in source code are defined in locale files.
 *
 * Usage:
 *   node scripts/check-i18n-keys.mjs
 *
 * This script:
 * 1. Parses zh-CN.ts and en-US.ts to extract all defined keys
 * 2. Scans all .ts/.tsx files for t('flux.*') or t("flux.*") patterns
 * 3. Reports any keys that are used but not defined
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import ts from '@typescript/typescript6';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const LOCALE_DIR = join(rootDir, 'packages/flux-i18n/src/locales');
const SCAN_DIRS = ['packages', 'apps'];
const EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDE_PATTERNS = [
  '/node_modules/',
  '/dist/',
  '/__tests__/',
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
  '/locales/',
];

/**
 * Extract all keys from a locale object recursively
 * @param {object} obj - The locale object
 * @param {string} prefix - Current key prefix
 * @returns {Set<string>} - Set of all keys
 */
function extractKeys(obj, prefix = '') {
  const keys = new Set();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      keys.add(fullKey);
    } else if (typeof value === 'object' && value !== null) {
      const nestedKeys = extractKeys(value, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    }
  }

  return keys;
}

/**
 * Parse locale file and extract defined keys
 * @param {string} filePath - Path to locale file
 * @returns {Promise<Set<string>>} - Set of defined keys
 */
async function parseLocaleFile(filePath) {
  const content = await readFile(filePath, 'utf-8');

  // Extract the object literal from the file
  // Match: export const zhCN: Resource = { ... }
  const match = content.match(/export\s+const\s+\w+:\s*Resource\s*=\s*(\{[\s\S]*\});?\s*$/m);

  if (!match) {
    console.error(`Failed to parse locale file: ${filePath}`);
    return new Set();
  }

  try {
    // Use Function constructor to safely evaluate the object literal
    // We need to handle the nested structure
    const objectStr = match[1];

    // Simple recursive parser for the object structure
    const keys = new Set();
    parseObjectKeys(objectStr, '', keys);

    return keys;
  } catch (error) {
    console.error(`Error parsing locale file ${filePath}:`, error.message);
    return new Set();
  }
}

/**
 * Simple parser to extract keys from TypeScript object literal
 * @param {string} str - Object literal string
 * @param {string} prefix - Current key prefix
 * @param {Set<string>} keys - Set to collect keys
 */
function parseObjectKeys(str, prefix, keys) {
  // Match key-value pairs: key: 'value' or key: { ... }
  const keyPattern = /(\w+)\s*:\s*(?:'[^']*'|"[^"]*"|`[^`]*`|\{)/g;
  let match;
  let depth = 0;
  let currentKey = '';
  let objectStart = -1;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '{') {
      if (depth === 0) {
        objectStart = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
    }
  }

  // Reset and parse properly
  const lines = str.split('\n');

  for (const line of lines) {
    // Match: key: 'value' or key: "value" or key: `value`
    const stringMatch = line.match(/^\s*(\w+)\s*:\s*(['"`])(.*)(?:\2)\s*,?\s*$/);
    if (stringMatch) {
      const key = stringMatch[1];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      continue;
    }

    // Match: key: { (start of nested object)
    const objectMatch = line.match(/^\s*(\w+)\s*:\s*\{\s*$/);
    if (objectMatch) {
      currentKey = objectMatch[1];
      continue;
    }
  }

  // For nested objects, we need a more sophisticated approach
  // Let's use a state machine approach
  parseNestedObject(str, prefix, keys);
}

/**
 * Parse nested object structure using state machine
 */
function parseNestedObject(str, prefix, keys) {
  let depth = 0;
  let currentPath = prefix ? [prefix] : [];
  let inString = false;
  let stringChar = '';
  let currentKey = '';
  let buffer = '';
  let expectingValue = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';

    // Handle string literals
    if ((char === "'" || char === '"' || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        if (expectingValue && currentKey) {
          const fullKey = [...currentPath, currentKey].join('.');
          keys.add(fullKey);
          currentKey = '';
          expectingValue = false;
        }
      }
      continue;
    }

    if (inString) continue;

    if (char === '{') {
      if (currentKey && expectingValue) {
        currentPath.push(currentKey);
        currentKey = '';
        expectingValue = false;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (currentPath.length > (prefix ? 1 : 0)) {
        currentPath.pop();
      }
    } else if (char === ':') {
      currentKey = buffer.trim();
      buffer = '';
      expectingValue = true;
    } else if (char === ',' || char === '\n') {
      buffer = '';
    } else if (/[a-zA-Z0-9_]/.test(char)) {
      buffer += char;
    } else {
      buffer = '';
    }
  }
}

async function extractDefinedKeys(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const keys = new Set();

  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function getPropertyName(name) {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }
    return undefined;
  }

  function visitObjectLiteral(node, path) {
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) {
        continue;
      }

      const propertyName = getPropertyName(property.name);
      if (!propertyName) {
        continue;
      }

      const nextPath = [...path, propertyName];
      const initializer = property.initializer;

      if (
        ts.isStringLiteral(initializer) ||
        ts.isNoSubstitutionTemplateLiteral(initializer) ||
        ts.isTemplateExpression(initializer)
      ) {
        keys.add(nextPath.join('.'));
        continue;
      }

      if (ts.isObjectLiteralExpression(initializer)) {
        visitObjectLiteral(initializer, nextPath);
      }
    }
  }

  function visit(node) {
    if (!ts.isVariableDeclaration(node) || !node.initializer) {
      ts.forEachChild(node, visit);
      return;
    }

    if (!ts.isObjectLiteralExpression(node.initializer)) {
      ts.forEachChild(node, visit);
      return;
    }

    const fluxProperty = node.initializer.properties.find(
      (property) =>
        ts.isPropertyAssignment(property) &&
        getPropertyName(property.name) === 'flux' &&
        ts.isObjectLiteralExpression(property.initializer),
    );

    if (fluxProperty && ts.isPropertyAssignment(fluxProperty)) {
      visitObjectLiteral(fluxProperty.initializer, ['flux']);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return keys;
}

/**
 * Scan source files for i18n key usage
 * @param {string} dir - Directory to scan
 * @param {string} relativePath - Relative path for reporting
 * @returns {Promise<Map<string, string[]>>} - Map of key -> file locations
 */
async function scanForUsedKeys(dir, relativePath = '') {
  const usedKeys = new Map(); // key -> [file:line, ...]

  async function scan(currentDir, currentRelPath) {
    let entries;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      const entryRelPath = currentRelPath ? join(currentRelPath, entry.name) : entry.name;

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some((p) => fullPath.includes(p) || entryRelPath.includes(p))) {
        continue;
      }

      if (entry.isDirectory()) {
        await scan(fullPath, entryRelPath);
      } else if (entry.isFile() && EXTENSIONS.includes(extname(entry.name))) {
        await scanFile(fullPath, entryRelPath, usedKeys);
      }
    }
  }

  await scan(dir, relativePath);
  return usedKeys;
}

/**
 * Scan a single file for i18n key usage
 */
async function scanFile(filePath, relativePath, usedKeys) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Pattern to match t('flux.xxx') or t("flux.xxx") or t(`flux.xxx`)
  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]\s*[,)]/g, // t('key') or t('key', ...)
    /\bt\(\s*`([^`]+)`\s*[,)]/g, // t(`key`)
  ];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const key = match[1];

        // Only track flux.* keys
        if (key.startsWith('flux.')) {
          const location = `${relativePath}:${lineNum + 1}`;

          if (!usedKeys.has(key)) {
            usedKeys.set(key, []);
          }
          usedKeys.get(key).push(location);
        }
      }
    }
  }
}

async function main() {
  console.log('Checking i18n key definitions...\n');

  // Extract defined keys from locale files
  const zhCNPath = join(LOCALE_DIR, 'zh-CN.ts');
  const enUSPath = join(LOCALE_DIR, 'en-US.ts');

  const [zhKeys, enKeys] = await Promise.all([
    extractDefinedKeys(zhCNPath),
    extractDefinedKeys(enUSPath),
  ]);

  console.log(`Defined keys in zh-CN.ts: ${zhKeys.size}`);
  console.log(`Defined keys in en-US.ts: ${enKeys.size}`);

  // Check for keys defined in one but not the other
  const onlyInZh = [...zhKeys].filter((k) => !enKeys.has(k));
  const onlyInEn = [...enKeys].filter((k) => !zhKeys.has(k));

  if (onlyInZh.length > 0) {
    console.log(`\n⚠️  Keys only in zh-CN.ts (missing in en-US.ts):`);
    onlyInZh.forEach((k) => console.log(`  - ${k}`));
  }

  if (onlyInEn.length > 0) {
    console.log(`\n⚠️  Keys only in en-US.ts (missing in zh-CN.ts):`);
    onlyInEn.forEach((k) => console.log(`  - ${k}`));
  }

  // Scan for used keys
  console.log('\nScanning source files for i18n key usage...');

  const usedKeys = new Map();

  for (const scanDir of SCAN_DIRS) {
    const dirPath = join(rootDir, scanDir);
    try {
      const dirStat = await stat(dirPath);
      if (dirStat.isDirectory()) {
        const dirKeys = await scanForUsedKeys(dirPath, scanDir);
        dirKeys.forEach((locations, key) => {
          if (!usedKeys.has(key)) {
            usedKeys.set(key, []);
          }
          usedKeys.get(key).push(...locations);
        });
      }
    } catch {
      // Directory doesn't exist
    }
  }

  console.log(`Found ${usedKeys.size} unique keys used in source code`);

  // Find undefined keys
  const allDefinedKeys = new Set([...zhKeys, ...enKeys]);
  const undefinedKeys = [];

  for (const [key, locations] of usedKeys) {
    if (!allDefinedKeys.has(key)) {
      undefinedKeys.push({ key, locations });
    }
  }

  // Find unused keys (defined but never used)
  const unusedKeys = [...allDefinedKeys].filter((k) => !usedKeys.has(k));

  // Report results
  let hasErrors = false;

  if (undefinedKeys.length > 0) {
    hasErrors = true;
    console.log(`\n❌ Found ${undefinedKeys.length} undefined i18n keys:`);
    undefinedKeys.sort((a, b) => a.key.localeCompare(b.key));

    for (const { key, locations } of undefinedKeys) {
      console.log(`\n  ${key}`);
      locations.slice(0, 5).forEach((loc) => console.log(`    - ${loc}`));
      if (locations.length > 5) {
        console.log(`    ... and ${locations.length - 5} more`);
      }
    }
  } else {
    console.log('\n✅ All used i18n keys are defined');
  }

  if (unusedKeys.length > 0) {
    console.log(`\n⚠️  Found ${unusedKeys.length} potentially unused keys:`);
    unusedKeys
      .sort()
      .slice(0, 20)
      .forEach((k) => console.log(`  - ${k}`));
    if (unusedKeys.length > 20) {
      console.log(`  ... and ${unusedKeys.length - 20} more`);
    }
    console.log('  (Note: Some keys may be used dynamically or in templates)');
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log('\n✅ i18n key check passed');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
