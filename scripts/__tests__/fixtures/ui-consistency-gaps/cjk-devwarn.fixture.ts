export function cjkDevDiagnostics(dimension: unknown) {
  devWarn(`dimension 条目非法（非字符串/非对象），已跳过`);
  warnOnce('records 与 source 同时设置，source 优先');
  console.error('[pivot-table] 实例创建失败', dimension);
}
