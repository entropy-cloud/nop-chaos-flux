import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();

const configTypesPath = resolve(repoRoot, 'packages/flux-renderers-industrial/src/serialization/config-types.ts');
const symbolTypesPath = resolve(repoRoot, 'packages/flux-renderers-industrial/src/symbols/symbol-types.ts');
const diffPath = resolve(repoRoot, 'packages/flux-renderers-industrial/src/serialization/diff.ts');

function extractInterfaceBody(source, interfaceName) {
  const header = new RegExp(`export\\s+interface\\s+${interfaceName}\\s*(?:extends\\s+[^{]+)?\\{`);
  const startMatch = header.exec(source);
  if (!startMatch) return null;
  let depth = 1;
  let i = startMatch.index + startMatch[0].length;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return source.slice(startMatch.index + startMatch[0].length, i - 1);
}

function extractFieldNames(body) {
  const fields = new Set();
  const lines = body.split('\n');
  for (let raw of lines) {
    let line = raw.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (line.startsWith('//')) continue;
    line = line.replace(/\/\/.*$/, '').trim();
    if (!line) continue;
    const match = /^(?:readonly\s+)?(\w+)\s*[?:]/.exec(line);
    if (match) {
      fields.add(match[1]);
    }
  }
  return fields;
}

function extractStringArray(source, varName) {
  const header = new RegExp(`(?:const|let|var)\\s+${varName}\\s*:\\s*Array<[^>]*>\\s*=\\s*\\[`);
  const startMatch = header.exec(source);
  if (!startMatch) return null;
  const end = source.indexOf('];', startMatch.index);
  const body = source.slice(startMatch.index + startMatch[0].length, end);
  const out = new Set();
  const re = /'([^']+)'|"([^"]+)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.add(m[1] ?? m[2]);
  }
  return out;
}

const configSource = readFileSync(configTypesPath, 'utf8');
const symbolSource = readFileSync(symbolTypesPath, 'utf8');
const diffSource = readFileSync(diffPath, 'utf8');

const nodeBody = extractInterfaceBody(configSource, 'ScadaSymbolNode');
const propsBody = extractInterfaceBody(symbolSource, 'ScadaSymbolProps');
const symbolKeys = extractStringArray(diffSource, 'SYMBOL_KEYS');

const failures = [];

if (!nodeBody) failures.push('无法定位 ScadaSymbolNode 接口（config-types.ts）');
if (!propsBody) failures.push('无法定位 ScadaSymbolProps 接口（symbol-types.ts）');
if (!symbolKeys) failures.push('无法定位 SYMBOL_KEYS 数组（diff.ts）');

if (!nodeBody || !propsBody || !symbolKeys) {
  console.error('check-scada-symbol-keys guard: 解析失败');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

const nodeFields = extractFieldNames(nodeBody);
const propsFields = extractFieldNames(propsBody);

// 检查 1：ScadaSymbolNode 每个声明字段都必须出现在 SYMBOL_KEYS（diff 覆盖守卫）。
// 防止「新字段加入节点但 diff 路径漏键」类缺陷（prior P1-1 `flow` 同类）。
const nodeMissingFromKeys = [...nodeFields].filter((k) => !symbolKeys.has(k));
for (const key of nodeMissingFromKeys) {
  failures.push(
    `ScadaSymbolNode 声明字段 "${key}" 未出现在 diff.ts SYMBOL_KEYS —— diffScadaConfig 将对该字段产出空 patch（live config 更新被静默丢弃）。请在 SYMBOL_KEYS 补齐。`,
  );
}

// 检查 2：ScadaSymbolProps 每个数据字段都必须出现在 ScadaSymbolNode（props→node 契约守卫）。
// 防止「symbols core 声明 prop 但序列化节点漏字段」类缺陷——本守卫的根因防御（root-cause guard）。
const propsMissingFromNode = [...propsFields].filter((k) => !nodeFields.has(k));
for (const key of propsMissingFromNode) {
  failures.push(
    `ScadaSymbolProps 声明字段 "${key}"（symbol-types.ts）未出现在 ScadaSymbolNode（config-types.ts）—— 该 prop 无法经序列化/diff 往返，host 改值被静默丢弃。请在 ScadaSymbolNode 补齐对应字段。`,
  );
}

// 检查 3：SYMBOL_KEYS 不应含 ScadaSymbolNode 之外的键（多余键，TS 已 enforce，运行期 belt-and-suspenders）。
const keysExtraOverNode = [...symbolKeys].filter((k) => !nodeFields.has(k));
for (const key of keysExtraOverNode) {
  failures.push(`SYMBOL_KEYS 含 "${key}" 但 ScadaSymbolNode 无此字段 —— 多余 diff 键，请核对。`);
}

if (failures.length > 0) {
  console.error('check-scada-symbol-keys guard failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(
  `check-scada-symbol-keys guard passed (ScadaSymbolNode ${nodeFields.size} fields, ScadaSymbolProps ${propsFields.size} fields, SYMBOL_KEYS ${symbolKeys.size} keys).`,
);
