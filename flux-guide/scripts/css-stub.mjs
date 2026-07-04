export function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return { shortCircuit: true, url: new URL(specifier, context.parentURL).href };
  }
  return nextResolve(specifier);
}

export function load(url, context, nextLoad) {
  if (url.endsWith('.css')) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  return nextLoad(url);
}
