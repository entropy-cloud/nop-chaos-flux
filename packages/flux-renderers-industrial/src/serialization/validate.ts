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

const ANIMATION_KINDS = ['rotate', 'blink', 'flow', 'move'];

function validateBinding(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const binding = value as Record<string, unknown>;
  if (Object.keys(binding).length === 0) {
    errors.push(`${scope} must contain at least one of: point | expression | map | scale | format`);
    return;
  }
  if ('point' in binding && (typeof binding.point !== 'string' || binding.point.trim() === '')) {
    errors.push(`${scope}.point must be a non-empty string`);
  }
  if ('expression' in binding && (typeof binding.expression !== 'string' || binding.expression.trim() === '')) {
    errors.push(`${scope}.expression must be a non-empty string`);
  }
  if ('map' in binding && !isPlainObject(binding.map)) {
    errors.push(`${scope}.map must be an object`);
  }
  if ('scale' in binding && !isPlainObject(binding.scale)) {
    errors.push(`${scope}.scale must be an object`);
  }
  if ('format' in binding && typeof binding.format !== 'string') {
    errors.push(`${scope}.format must be a string`);
  }
}

function validateAnimation(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const anim = value as Record<string, unknown>;
  if (typeof anim.kind !== 'string' || !ANIMATION_KINDS.includes(anim.kind)) {
    errors.push(`${scope}.kind must be one of: ${ANIMATION_KINDS.join(' | ')}`);
  }
  checkNumberField(anim, 'period', errors, scope);
  checkNumberField(anim, 'loop', errors, scope);
  for (const field of ['from', 'to']) {
    if (field in anim && !(typeof anim[field] === 'number' || isPlainObject(anim[field]))) {
      errors.push(`${scope}.${field} must be a number or an object`);
    }
  }
  if ('when' in anim) {
    const when = anim.when;
    if (when !== 'always' && !(isPlainObject(when) && typeof when.state === 'string')) {
      errors.push(`${scope}.when must be 'always' or an object with a state string`);
    }
  }
}

function validateStateDeclaration(value: unknown, errors: string[], scope: string): void {
  if (!isPlainObject(value)) {
    errors.push(`${scope} must be an object`);
    return;
  }
  const decl = value as Record<string, unknown>;
  if (!isPlainObject(decl.states)) {
    errors.push(`${scope}.states must be an object`);
  } else {
    for (const [stateName, stateValue] of Object.entries(decl.states)) {
      if (!isPlainObject(stateValue)) {
        errors.push(`${scope}.states.${stateName} must be an object`);
      }
    }
  }
  if ('ranges' in decl) {
    if (!Array.isArray(decl.ranges)) {
      errors.push(`${scope}.ranges must be an array`);
    } else {
      decl.ranges.forEach((range, index) => {
        if (!isPlainObject(range)) {
          errors.push(`${scope}.ranges[${index}] must be an object`);
          return;
        }
        const rangeScope = `${scope}.ranges[${index}]`;
        checkNumberField(range as Record<string, unknown>, 'min', errors, rangeScope);
        checkNumberField(range as Record<string, unknown>, 'max', errors, rangeScope);
        if (typeof (range as Record<string, unknown>).state !== 'string') {
          errors.push(`${rangeScope}.state must be a string`);
        }
      });
    }
  }
  if ('booleanMap' in decl) {
    if (!isPlainObject(decl.booleanMap)) {
      errors.push(`${scope}.booleanMap must be an object`);
    } else {
      const booleanMap = decl.booleanMap as Record<string, unknown>;
      if (typeof booleanMap.true !== 'string' || typeof booleanMap.false !== 'string') {
        errors.push(`${scope}.booleanMap must contain string true/false states`);
      }
    }
  }
  if ('valueMap' in decl && !isPlainObject(decl.valueMap)) {
    errors.push(`${scope}.valueMap must be an object`);
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
  for (const field of ['width', 'height', 'rotation', 'scale', 'opacity', 'strokeWidth', 'textSize', 'dashOffset']) {
    checkNumberField(nodeObj, field, errors, scope);
  }
  if ('strokeDash' in nodeObj && (!Array.isArray(nodeObj.strokeDash) || nodeObj.strokeDash.some((v) => typeof v !== 'number'))) {
    errors.push(`${scope}.strokeDash must be an array of numbers`);
  }
  if ('fillStyle' in nodeObj) {
    const fillStyle = nodeObj.fillStyle;
    if (typeof fillStyle !== 'string' && !isPlainObject(fillStyle)) {
      errors.push(`${scope}.fillStyle must be an object or a string`);
    }
  }
  if ('shadow' in nodeObj && !isPlainObject(nodeObj.shadow)) {
    errors.push(`${scope}.shadow must be an object`);
  }
  if ('visible' in nodeObj && typeof nodeObj.visible !== 'boolean') {
    errors.push(`${scope}.visible must be a boolean`);
  }
  for (const field of ['fill', 'stroke', 'text', 'textColor', 'fontFamily', 'fontWeight']) {
    checkStringField(nodeObj, field, errors, scope);
  }
  if ('custom' in nodeObj && !isPlainObject(nodeObj.custom)) {
    errors.push(`${scope}.custom must be an object`);
  } else if (nodeObj.custom !== undefined) {
    // I8.1 增量：image/video 占位符号的 URL 字段（custom.url）须为非空字符串（image-load-error 前置校验）
    if (nodeObj.type === 'scada-image' || nodeObj.type === 'scada-video') {
      const url = (nodeObj.custom as Record<string, unknown>).url;
      if (url !== undefined && (typeof url !== 'string' || url.trim() === '')) {
        errors.push(`${scope}.custom.url must be a non-empty string`);
      }
    }
  }
  if ('bindings' in nodeObj && !isPlainObject(nodeObj.bindings)) {
    errors.push(`${scope}.bindings must be an object`);
  } else if (nodeObj.bindings !== undefined) {
    Object.entries(nodeObj.bindings as Record<string, unknown>).forEach(([property, binding]) => {
      validateBinding(binding, errors, `${scope}.bindings.${property}`);
    });
  }
  if ('states' in nodeObj && !isPlainObject(nodeObj.states)) {
    errors.push(`${scope}.states must be an object`);
  } else if (nodeObj.states !== undefined) {
    validateStateDeclaration(nodeObj.states, errors, `${scope}.states`);
  }
  if ('animations' in nodeObj && !Array.isArray(nodeObj.animations)) {
    errors.push(`${scope}.animations must be an array`);
  } else if (nodeObj.animations !== undefined) {
    (nodeObj.animations as unknown[]).forEach((anim, index) => {
      validateAnimation(anim, errors, `${scope}.animations[${index}]`);
    });
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
