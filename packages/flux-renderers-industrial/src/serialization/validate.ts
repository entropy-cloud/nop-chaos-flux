import { hasScadaSymbol } from '../symbols/symbol-registry.js';

export type ScadaValidationResult = { ok: true } | { ok: false; errors: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is number | boolean | string {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

function checkNumberField(
  node: Record<string, unknown>,
  field: string,
  errors: string[],
  scope: string,
): void {
  if (field in node && typeof node[field] !== 'number') {
    errors.push(`${scope}.${field} must be a number`);
  }
}

function checkStringField(
  node: Record<string, unknown>,
  field: string,
  errors: string[],
  scope: string,
): void {
  if (field in node && typeof node[field] !== 'string') {
    errors.push(`${scope}.${field} must be a string`);
  }
}

function validateSymbolNode(
  node: unknown,
  seenIds: Set<string>,
  errors: string[],
  scope: string,
  isKnownType: (type: string) => boolean,
): void {
  if (!isPlainObject(node)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const nodeObj = node as Record<string, unknown>;
  if (typeof nodeObj.id !== 'string' || nodeObj.id.trim() === '') {
    errors.push(`${scope}.id must be a non-empty string`);
  } else {
    if (seenIds.has(nodeObj.id)) {
      errors.push(`duplicate symbol id: ${nodeObj.id}`);
    }
    seenIds.add(nodeObj.id as string);
  }
  if (typeof nodeObj.type !== 'string' || nodeObj.type.trim() === '') {
    errors.push(`${scope}.type must be a non-empty string`);
  } else {
    const type = nodeObj.type as string;
    if (type !== 'scada-group' && !isKnownType(type)) {
      errors.push(`unknown symbol type: ${type}`);
    }
  }
  checkNumberField(nodeObj, 'x', errors, scope);
  checkNumberField(nodeObj, 'y', errors, scope);
  for (const field of ['width', 'height', 'rotation', 'scale', 'opacity', 'strokeWidth', 'textSize']) {
    checkNumberField(nodeObj, field, errors, scope);
  }
  if ('visible' in nodeObj && typeof nodeObj.visible !== 'boolean') {
    errors.push(`${scope}.visible must be a boolean`);
  }
  for (const field of ['fill', 'stroke', 'text', 'textColor', 'fontFamily', 'fontWeight']) {
    checkStringField(nodeObj, field, errors, scope);
  }
  if ('custom' in nodeObj && !isPlainObject(nodeObj.custom)) {
    errors.push(`${scope}.custom must be an object`);
  }
  if ('bindings' in nodeObj && !isPlainObject(nodeObj.bindings)) {
    errors.push(`${scope}.bindings must be an object`);
  }
  if ('states' in nodeObj && !isPlainObject(nodeObj.states)) {
    errors.push(`${scope}.states must be an object`);
  }
  if ('animations' in nodeObj && !Array.isArray(nodeObj.animations)) {
    errors.push(`${scope}.animations must be an array`);
  }
  if ('events' in nodeObj && !Array.isArray(nodeObj.events)) {
    errors.push(`${scope}.events must be an array`);
  }
  if (nodeObj.children !== undefined) {
    if (!Array.isArray(nodeObj.children)) {
      errors.push(`${scope}.children must be an array`);
    } else {
      nodeObj.children.forEach((child, index) => {
        validateSymbolNode(child, seenIds, errors, `${scope}.children[${index}]`, isKnownType);
      });
    }
  }
}

function validatePointDeclaration(node: unknown, seenIds: Set<string>, errors: string[], scope: string): void {
  if (!isPlainObject(node)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const decl = node as Record<string, unknown>;
  if (typeof decl.id !== 'string' || decl.id.trim() === '') {
    errors.push(`${scope}.id must be a non-empty string`);
  } else {
    if (seenIds.has(decl.id)) {
      errors.push(`duplicate point declaration id: ${decl.id}`);
    }
    seenIds.add(decl.id as string);
  }
  if (!['static', 'expression', 'flux'].includes(decl.source as string)) {
    errors.push(`${scope}.source must be one of: static | expression | flux`);
  } else if (decl.source === 'static') {
    if (!('value' in decl) || !isPrimitive(decl.value)) {
      errors.push(`${scope}.value is required and must be a primitive for source=static`);
    }
  } else if (decl.source === 'expression') {
    if (typeof decl.expression !== 'string' || decl.expression.trim() === '') {
      errors.push(`${scope}.expression must be a non-empty string for source=expression`);
    }
  } else if (typeof decl.flux !== 'string' || decl.flux.trim() === '') {
    errors.push(`${scope}.flux must be a non-empty string for source=flux`);
  }
  if ('scale' in decl && !isPlainObject(decl.scale)) {
    errors.push(`${scope}.scale must be an object`);
  }
  if ('deadband' in decl && typeof decl.deadband !== 'number') {
    errors.push(`${scope}.deadband must be a number`);
  }
  if ('unit' in decl && typeof decl.unit !== 'string') {
    errors.push(`${scope}.unit must be a string`);
  }
  if ('format' in decl && typeof decl.format !== 'string') {
    errors.push(`${scope}.format must be a string`);
  }
}

export function validateScadaConfig(
  json: unknown,
  isKnownType: (type: string) => boolean = hasScadaSymbol,
): ScadaValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(json)) {
    return { ok: false, errors: ['scada config must be an object'] };
  }
  const config = json as Record<string, unknown>;
  if (config.version !== 1) {
    errors.push('config.version must be 1');
  }
  if (!Array.isArray(config.symbols)) {
    errors.push('config.symbols must be an array');
  } else {
    const seenSymbolIds = new Set<string>();
    config.symbols.forEach((node, index) => {
      validateSymbolNode(node, seenSymbolIds, errors, `symbols[${index}]`, isKnownType);
    });
  }
  if (config.variables !== undefined) {
    if (!Array.isArray(config.variables)) {
      errors.push('config.variables must be an array');
    } else {
      const seenPointIds = new Set<string>();
      config.variables.forEach((decl, index) => {
        validatePointDeclaration(decl, seenPointIds, errors, `variables[${index}]`);
      });
    }
  }
  if (config.viewport !== undefined) {
    if (!isPlainObject(config.viewport)) {
      errors.push('config.viewport must be an object');
    } else {
      for (const field of ['x', 'y', 'scale']) {
        checkNumberField(config.viewport as Record<string, unknown>, field, errors, 'viewport');
      }
    }
  }
  if (config.background !== undefined && !isPlainObject(config.background)) {
    errors.push('config.background must be an object');
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
