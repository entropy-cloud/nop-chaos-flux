// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createDependencyGraph } from './dependency-graph.js';
import { suggestSelectorForElement } from './selector-suggest.js';

describe('dependency graph (M4)', () => {
  it('records write/read/derive edges and answers impact queries', () => {
    const graph = createDependencyGraph();
    graph.recordWriteEdge('root', 'form.username');
    graph.recordReadEdge('c-input', ['root.form.username']);
    graph.recordDeriveEdge('root.form.username', 'c-label');

    const impact = graph.queryImpact('root.form.username');
    expect(impact.cids).toContain('c-input');
    expect(impact.cids).toContain('c-label');
    expect(impact.degradedToPathQuery).toBe(false);
  });

  it('degrades to path-query mode beyond 2000 edges and clears incremental state', () => {
    const graph = createDependencyGraph();
    for (let i = 0; i < 2001; i++) {
      graph.recordWriteEdge('root', `path.${i}`);
    }
    expect(graph.isDegraded()).toBe(true);
    expect(graph.edgeCount()).toBe(0);
    const impact = graph.queryImpact('root.path.0');
    expect(impact.degradedToPathQuery).toBe(true);
    expect(impact.cids).toHaveLength(0);
  });

  it('no-read-edges: queryImpact traverses write edges only (Failure Path)', () => {
    const graph = createDependencyGraph();
    graph.recordWriteEdge('root', 'a.b');
    const impact = graph.queryImpact('root.a.b');
    expect(impact.paths.length).toBeGreaterThan(0);
    expect(impact.cids).toHaveLength(0);
  });
});

describe('selector suggestion (M4)', () => {
  it('tier 1: data-testid wins when unique', () => {
    const element = document.createElement('button');
    element.setAttribute('data-testid', 'submit-btn');
    element.setAttribute('data-cid', '42');
    document.body.appendChild(element);
    const suggestion = suggestSelectorForElement(element);
    expect(suggestion.tier).toBe('data-testid');
    expect(suggestion.selector).toBe('[data-testid="submit-btn"]');
    element.remove();
  });

  it('tier 2: data-cid when no test id', () => {
    const element = document.createElement('input');
    element.setAttribute('data-cid', '77');
    document.body.appendChild(element);
    const suggestion = suggestSelectorForElement(element);
    expect(suggestion.tier).toBe('data-cid');
    expect(suggestion.selector).toBe('[data-cid="77"]');
    element.remove();
  });

  it('tier 3: shortest unique css via id', () => {
    const element = document.createElement('div');
    element.id = 'm4-unique-node';
    document.body.appendChild(element);
    const suggestion = suggestSelectorForElement(element);
    expect(suggestion.tier).toBe('css');
    expect(suggestion.selector).toBe('#m4-unique-node');
    expect(suggestion.unique).toBe(true);
    element.remove();
  });
});
