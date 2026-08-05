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
const SYMBOL_EVENT_ONS = ['click', 'dblclick', 'hover'];

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
  // plan 2026-08-05-0653-3 B3：stateSource 为非空字符串（格式 "pointId" 或 "pointId.property"）。
  if ('stateSource' in decl && (typeof decl.stateSource !== 'string' || decl.stateSource.trim() === '')) {
    errors.push(`${scope}.stateSource must be a non-empty string`);
  }
}

function validateSymbolEvent(value: unknown, errors: string[], scope: string): void {
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
  // plan 2026-08-05-0653-4 C1：type 提升到外层作用域，供 children 约束（children 仅 scada-group）判别。
  const type = typeof nodeObj.type === 'string' ? nodeObj.type : '';
  if (typeof nodeObj.type !== 'string' || nodeObj.type.trim() === '') {
    errors.push(`${scope}.type must be a non-empty string`);
  } else {
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
  if ('flow' in nodeObj && !isPlainObject(nodeObj.flow)) {
    errors.push(`${scope}.flow must be an object`);
  } else if (nodeObj.flow !== undefined) {
    const flow = nodeObj.flow as Record<string, unknown>;
    if (typeof flow.enabled !== 'boolean') {
      errors.push(`${scope}.flow.enabled must be a boolean`);
    }
    checkNumberField(flow, 'speed', errors, `${scope}.flow`);
    if ('dash' in flow && (!Array.isArray(flow.dash) || flow.dash.some((v) => typeof v !== 'number'))) {
      errors.push(`${scope}.flow.dash must be an array of numbers`);
    }
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
  if ('events' in nodeObj) {
    if (!Array.isArray(nodeObj.events)) {
      errors.push(`${scope}.events must be an array`);
    } else {
      (nodeObj.events as unknown[]).forEach((event, index) => {
        validateSymbolEvent(event, errors, `${scope}.events[${index}]`);
      });
    }
  }
  if (nodeObj.children !== undefined) {
    // plan 2026-08-05-0653-4 C1（open-audit P2-3）：children 仅 scada-group 可用——叶子 type
    // （scada-rect/scada-pipe/instance 模板等）误带 children 时 ConfigAdapter.buildNode 静默降级为
    // Group（丢 fill/stroke/width/height）。validator fail-fast 让 author 可见（Decision-C1 默认采 (a)，
    // 与 §4.2 schema 注「children: 子图元（group 组合）」一致）。buildNode 同步按 type 分支（defense-in-depth）。
    // 同时继续递归 children（不 short-circuit）以最大化 diagnostic（嵌套结构错误一并 surface）。
    if (type !== 'scada-group') {
      errors.push(`${scope}.children is only allowed on scada-group nodes`);
    }
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
  if ('scale' in decl) {
    if (!isPlainObject(decl.scale)) {
      errors.push(`${scope}.scale must be an object`);
    } else if ('expression' in (decl.scale as Record<string, unknown>)) {
      // plan 2026-08-05-0653-3 B4：declaration 级 scale.expression 经 point-store.convert 与
      // value-to-state.applyLinearScale 两处静默丢弃（无 compiler 求值）。binding 层 applyScale 已消费
      // expression-scale（经 evaluator），故 declaration 级拒绝并指向 binding-scale，同时关闭两处 drop site。
      errors.push(
        `${scope}.scale.expression is not supported at declaration level; use binding-level scale.expression instead`,
      );
    }
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
