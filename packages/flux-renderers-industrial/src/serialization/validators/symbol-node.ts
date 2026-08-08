import {
  MAX_VALIDATE_DEPTH,
  assertShape,
  checkNumberField,
  checkStringField,
  isPlainObject,
} from './helpers.js';
import { validateAnimation } from './animation.js';
import { validateBinding } from './binding.js';
import { validateStateDeclaration } from './state-declaration.js';
import { validateSymbolEvent } from './symbol-event.js';

export function validateSymbolNode(
  node: unknown,
  seenIds: Set<string>,
  errors: string[],
  scope: string,
  isKnownType: (type: string) => boolean,
  depth = 0,
): void {
  // plan 2026-08-06-0900-1 P2-9-validateSymbolNode：深度上限 fail-closed——超 cap 不再递归，
  // 防 ~10k 层嵌套（恶意/损坏 host JSON）stack overflow（validator 本应是最外层防线，却自身先崩）。
  if (depth > MAX_VALIDATE_DEPTH) {
    errors.push(`${scope} exceeds maximum nesting depth`);
    return;
  }
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
  } else if (nodeObj.shadow !== undefined) {
    // plan 2026-08-06-0900-1 P2-6：shadow 子形状校验（旧实现仅 isPlainObject，子字段 malformed 全过）。
    assertShape(
      nodeObj.shadow as Record<string, unknown>,
      { x: 'number', y: 'number', blur: 'number', color: 'string' },
      `${scope}.shadow`,
      errors,
    );
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
  // HCA4-P3-1：align 为受限枚举（'left'|'center'|'right'，config-types.ts:91），malformed 值旧实现静默放行。
  if ('align' in nodeObj && !['left', 'center', 'right'].includes(nodeObj.align as string)) {
    errors.push(`${scope}.align must be one of: left | center | right`);
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
        validateSymbolNode(child, seenIds, errors, `${scope}.children[${index}]`, isKnownType, depth + 1);
      });
    }
  }
}
