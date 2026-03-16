/**
 * 表达式处理器
 * 将包含 ${expr} 表达式的JSON模板编译为高效执行函数
 * 支持智能缓存：表达式结果不变时，返回对象引用不变
 */

function isExpression(value) {
  return typeof value === 'string' && value.includes('${');
}

function parseTemplateString(str) {
  const parts = [];
  let lastIndex = 0;
  const regex = /\$\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: str.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'expr', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < str.length) {
    parts.push({ type: 'text', value: str.slice(lastIndex) });
  }
  
  return parts;
}

function buildTemplateExprFn(parts) {
  const segments = parts.map(p => {
    if (p.type === 'text') {
      return JSON.stringify(p.value);
    } else {
      return `String((${p.value}) ?? "")`;
    }
  });
  const expr = segments.join(' + ');
  return new Function('scope', `with(scope) { return ${expr}; }`);
}

function compileNode(value) {
  if (value === null) {
    return { type: 'literal', value: null };
  }
  
  if (typeof value !== 'object' && typeof value !== 'string') {
    return { type: 'literal', value };
  }
  
  if (typeof value === 'string') {
    if (!isExpression(value)) {
      return { type: 'literal', value };
    }
    
    const parts = parseTemplateString(value);
    
    if (parts.length === 1 && parts[0].type === 'expr') {
      const expr = parts[0].value;
      return { 
        type: 'pureExpr', 
        expr,
        exprFn: new Function('scope', `with(scope) { return ${expr}; }`)
      };
    }
    
    return {
      type: 'templateExpr',
      parts,
      exprFn: buildTemplateExprFn(parts)
    };
  }
  
  if (Array.isArray(value)) {
    const compiledItems = value.map(item => compileNode(item));
    const hasDynamic = compiledItems.some(item => item.type !== 'literal');
    
    if (!hasDynamic) {
      return { type: 'literal', value: compiledItems.map(item => item.value) };
    }
    
    return { type: 'array', items: compiledItems };
  }
  
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    const compiledEntries = {};
    
    for (const key of keys) {
      compiledEntries[key] = compileNode(value[key]);
    }
    
    const hasDynamic = Object.values(compiledEntries).some(item => item.type !== 'literal');
    
    if (!hasDynamic) {
      const staticValue = {};
      for (const key of keys) {
        staticValue[key] = compiledEntries[key].value;
      }
      return { type: 'literal', value: staticValue };
    }
    
    return { type: 'object', entries: compiledEntries, keys };
  }
  
  return { type: 'literal', value };
}

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

function createExecutor(compiled) {
  let lastScope = null;
  let lastResult = null;
  
  function executeNode(node, scope) {
    switch (node.type) {
      case 'literal':
        return { value: node.value, changed: false };
        
      case 'pureExpr': {
        try {
          const newValue = node.exprFn(scope);
          const lastValue = node._lastValue;
          const changed = !Object.is(lastValue, newValue);
          if (!changed) {
            return { value: lastValue, changed: false };
          }
          node._lastValue = newValue;
          return { value: newValue, changed };
        } catch (e) {
          return { value: node._lastValue, changed: false };
        }
      }
        
      case 'templateExpr': {
        try {
          const newValue = node.exprFn(scope);
          const lastValue = node._lastValue;
          const changed = lastValue !== newValue;
          if (!changed) {
            return { value: lastValue, changed: false };
          }
          node._lastValue = newValue;
          return { value: newValue, changed };
        } catch (e) {
          return { value: node._lastValue !== undefined ? node._lastValue : '', changed: false };
        }
      }
        
      case 'array': {
        let anyChanged = false;
        const newArr = [];
        
        for (let i = 0; i < node.items.length; i++) {
          const result = executeNode(node.items[i], scope);
          newArr.push(result.value);
          if (result.changed) anyChanged = true;
        }
        
        if (!anyChanged && node._lastValue !== undefined) {
          return { value: node._lastValue, changed: false };
        }
        
        if (node._lastValue !== undefined && shallowEqual(node._lastValue, newArr)) {
          return { value: node._lastValue, changed: false };
        }
        
        node._lastValue = newArr;
        return { value: newArr, changed: true };
      }
        
      case 'object': {
        let anyChanged = false;
        const newObj = {};
        
        for (const key of node.keys) {
          const result = executeNode(node.entries[key], scope);
          newObj[key] = result.value;
          if (result.changed) anyChanged = true;
        }
        
        if (!anyChanged && node._lastValue !== undefined) {
          return { value: node._lastValue, changed: false };
        }
        
        if (node._lastValue !== undefined && shallowEqual(node._lastValue, newObj)) {
          return { value: node._lastValue, changed: false };
        }
        
        node._lastValue = newObj;
        return { value: newObj, changed: true };
      }
        
      default:
        return { value: undefined, changed: false };
    }
  }
  
  return function(scope = {}) {
    if (scope === lastScope && lastResult !== null) {
      return lastResult;
    }
    
    const result = executeNode(compiled, scope);
    lastScope = scope;
    lastResult = result.value;
    
    return result.value;
  };
}

function compileTemplate(template) {
  const compiled = compileNode(template);
  return createExecutor(compiled);
}

module.exports = {
  compileTemplate,
  compileNode,
  createExecutor,
  isExpression,
  parseTemplateString
};

if (require.main === module) {
  runTests();
}

function runTests() {
  console.log('========== 表达式处理器测试 ==========\n');
  
  console.log('测试1：基本表达式');
  const template1 = {
    name: '${user.name}',
    age: '${user.age}',
    static: 'hello'
  };
  
  const exec1 = compileTemplate(template1);
  
  const scope1a = { user: { name: 'Alice', age: 25 } };
  const result1a = exec1(scope1a);
  console.log('Result 1a:', result1a);
  
  const scope1b = { user: { name: 'Alice', age: 25 } };
  const result1b = exec1(scope1b);
  console.log('Result 1b:', result1b);
  console.log('引用相等（应该true）:', result1a === result1b);
  
  const scope1c = { user: { name: 'Bob', age: 25 } };
  const result1c = exec1(scope1c);
  console.log('Result 1c:', result1c);
  console.log('引用相等（应该false）:', result1a === result1c);
  
  console.log('\n-----------------------------------\n');
  
  console.log('测试2：嵌套对象');
  const template2 = {
    user: {
      profile: {
        name: '${name}',
        email: '${email}'
      },
      settings: {
        theme: 'dark',
        lang: '${lang}'
      }
    },
    count: 42
  };
  
  const exec2 = compileTemplate(template2);
  
  const scope2a = { name: 'Tom', email: 'tom@example.com', lang: 'en' };
  const result2a = exec2(scope2a);
  console.log('Result 2a:', JSON.stringify(result2a, null, 2));
  
  const scope2b = { name: 'Tom', email: 'tom@example.com', lang: 'en' };
  const result2b = exec2(scope2b);
  console.log('引用相等（应该true）:', result2a === result2b);
  console.log('嵌套对象引用相等（应该true）:', result2a.user === result2b.user);
  
  const scope2c = { name: 'Tom', email: 'tom@example.com', lang: 'zh' };
  const result2c = exec2(scope2c);
  console.log('Result 2c:', JSON.stringify(result2c, null, 2));
  console.log('引用相等（应该false，因为lang变了）:', result2a === result2c);
  
  console.log('\n-----------------------------------\n');
  
  console.log('测试3：数组');
  const template3 = {
    items: ['${item1}', '${item2}', 'static'],
    count: '${count}'
  };
  
  const exec3 = compileTemplate(template3);
  
  const scope3a = { item1: 'A', item2: 'B', count: 10 };
  const result3a = exec3(scope3a);
  console.log('Result 3a:', result3a);
  
  const scope3b = { item1: 'A', item2: 'B', count: 10 };
  const result3b = exec3(scope3b);
  console.log('引用相等（应该true）:', result3a === result3b);
  console.log('数组引用相等（应该true）:', result3a.items === result3b.items);
  
  const scope3c = { item1: 'A', item2: 'C', count: 10 };
  const result3c = exec3(scope3c);
  console.log('Result 3c:', result3c);
  console.log('引用相等（应该false）:', result3a === result3c);
  
  console.log('\n-----------------------------------\n');
  
  console.log('测试4：混合表达式（模板字符串）');
  const template4 = {
    greeting: 'Hello, ${name}! You are ${age} years old.',
    pure: '${pureValue}'
  };
  
  const exec4 = compileTemplate(template4);
  
  const scope4a = { name: 'Charlie', age: 30, pureValue: { x: 1 } };
  const result4a = exec4(scope4a);
  console.log('Result 4a:', result4a);
  
  const scope4b = { name: 'Charlie', age: 30, pureValue: { x: 1 } };
  const result4b = exec4(scope4b);
  console.log('引用相等（应该true）:', result4a === result4b);
  
  const scope4c = { name: 'Charlie', age: 31, pureValue: { x: 1 } };
  const result4c = exec4(scope4c);
  console.log('Result 4c:', result4c);
  console.log('引用相等（应该false）:', result4a === result4c);
  
  console.log('\n-----------------------------------\n');
  
  console.log('测试5：纯表达式返回对象');
  const template5 = {
    data: '${obj}',
    name: '${obj.name}'
  };
  
  const exec5 = compileTemplate(template5);
  const sharedObj = { name: 'Test', value: 123 };
  
  const scope5a = { obj: sharedObj };
  const result5a = exec5(scope5a);
  console.log('Result 5a:', result5a);
  console.log('data引用相等（应该true）:', result5a.data === sharedObj);
  
  const scope5b = { obj: sharedObj };
  const result5b = exec5(scope5b);
  console.log('引用相等（应该true）:', result5a === result5b);
  console.log('data引用相等（应该true）:', result5a.data === result5b.data);
  
  const newObj = { name: 'Test', value: 123 };
  const scope5c = { obj: newObj };
  const result5c = exec5(scope5c);
  console.log('Result 5c:', result5c);
  console.log('data引用相等（应该false，不同对象）:', result5a.data === result5c.data);
  console.log('整体引用相等（应该false）:', result5a === result5c);
  
  console.log('\n-----------------------------------\n');
  
  console.log('测试6：性能测试');
  const template6 = {
    a: '${x}',
    b: '${y}',
    c: {
      d: '${z}',
      e: 'static'
    },
    arr: ['${x}', '${y}']
  };
  
  const exec6 = compileTemplate(template6);
  const iterations = 100000;
  
  console.time('相同scope执行 ' + iterations + ' 次');
  const sameScope = { x: 1, y: 2, z: 3 };
  for (let i = 0; i < iterations; i++) {
    exec6(sameScope);
  }
  console.timeEnd('相同scope执行 ' + iterations + ' 次');
  
  console.time('不同scope相同值 ' + iterations + ' 次');
  for (let i = 0; i < iterations; i++) {
    exec6({ x: 1, y: 2, z: 3 });
  }
  console.timeEnd('不同scope相同值 ' + iterations + ' 次');
  
  console.time('不同scope不同值 ' + iterations + ' 次');
  for (let i = 0; i < iterations; i++) {
    exec6({ x: i, y: i + 1, z: i + 2 });
  }
  console.timeEnd('不同scope不同值 ' + iterations + ' 次');
  
  console.log('\n========== 测试完成 ==========');
}
