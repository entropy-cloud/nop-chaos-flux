/**
 * 数据绑定面板测试（S3-1）：绑定产出 `${source.field}` 经 updateProps 落文档、
 * 半填写态不落文档、清空移除键、既有绑定解析初值、数据源清单投影。
 */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeededRandom, injectSessionIds } from '@nop-chaos/page-designer-core';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { DataSourceCatalog, DataBindingPanel } from './data-binding-panel.js';

afterEach(cleanup);

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

const STRING_PROP_DEFINITION = def({
  type: 'widget',
  propContracts: {
    value: { shape: { kind: 'string' }, displayName: 'Value' },
    count: { shape: { kind: 'number' }, displayName: 'Count' },
  },
});

function boundNode(extra: Record<string, unknown> = {}) {
  return injectSessionIds({ type: 'widget', ...extra }, createSeededRandom(3)) as never;
}

describe('DataBindingPanel', () => {
  it('renders empty state without a node', () => {
    const view = render(
      <DataBindingPanel node={null} definition={undefined} dataSourceNames={[]} onUpdateProps={vi.fn()} />,
    );
    expect(view.getByTestId('page-designer-data-empty')).toBeTruthy();
  });

  it('writes a ${source.field} binding to the target prop (transient + commit on blur)', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel
        node={boundNode()}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={['users']}
        onUpdateProps={onUpdateProps}
      />,
    );
    const source = view.getByLabelText('数据源名称') as HTMLInputElement;
    const field = view.getByLabelText('字段路径') as HTMLInputElement;
    const target = view.getByLabelText('绑定目标属性') as HTMLInputElement;
    expect(target.value).toBe('value');

    fireEvent.change(source, { target: { value: 'users' } });
    fireEvent.change(field, { target: { value: 'name' } });
    expect(onUpdateProps).toHaveBeenLastCalledWith({ value: '${users.name}' }, 'transient');
    expect((view.getByTestId('page-designer-binding-preview') as HTMLElement).textContent).toBe('${users.name}');
    fireEvent.blur(field);
    expect(onUpdateProps).toHaveBeenLastCalledWith({ value: '${users.name}' }, 'commit');
  });

  it('does not write while partially filled (expr-invalid discipline)', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel
        node={boundNode()}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={[]}
        onUpdateProps={onUpdateProps}
      />,
    );
    fireEvent.change(view.getByLabelText('数据源名称'), { target: { value: 'users' } });
    expect(onUpdateProps).not.toHaveBeenCalledWith(expect.anything(), 'transient');
    fireEvent.blur(view.getByLabelText('数据源名称'));
    expect(onUpdateProps).toHaveBeenLastCalledWith({}, 'commit');
  });

  it('parses an existing binding into initial draft and removes the prop when cleared', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel
        node={boundNode({ value: '${profile.avatarUrl}' })}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={['profile']}
        onUpdateProps={onUpdateProps}
      />,
    );
    expect((view.getByLabelText('数据源名称') as HTMLInputElement).value).toBe('profile');
    expect((view.getByLabelText('字段路径') as HTMLInputElement).value).toBe('avatarUrl');

    fireEvent.change(view.getByLabelText('数据源名称'), { target: { value: '' } });
    fireEvent.change(view.getByLabelText('字段路径'), { target: { value: '' } });
    expect(onUpdateProps).toHaveBeenLastCalledWith({ value: undefined }, 'transient');
  });

  it('resets the draft when switching to another node', () => {
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel
        node={boundNode({ value: '${a.b}' })}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={[]}
        onUpdateProps={onUpdateProps}
      />,
    );
    expect((view.getByLabelText('数据源名称') as HTMLInputElement).value).toBe('a');
    view.rerender(
      <DataBindingPanel
        node={boundNode({ value: 'x' })}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={[]}
        onUpdateProps={onUpdateProps}
      />,
    );
    expect((view.getByLabelText('数据源名称') as HTMLInputElement).value).toBe('');
    expect((view.getByLabelText('字段路径') as HTMLInputElement).value).toBe('');
  });
});

describe('DataSourceCatalog', () => {
  it('lists source names and shows the empty state', () => {
    const view = render(<DataSourceCatalog dataSourceNames={['users', 'profile']} />);
    expect(view.getAllByTestId('page-designer-data-source-name').map((el) => el.textContent)).toEqual([
      'users',
      'profile',
    ]);
    view.rerender(<DataSourceCatalog dataSourceNames={[]} />);
    expect(view.getAllByTestId('page-designer-data-sources')[0].textContent).toContain('文档中暂无数据源节点');
  });
});

describe('string prop candidates', () => {
  it('derives datalist candidates from string-shaped contracts only', () => {
    const registry = createRendererRegistry();
    registry.register(STRING_PROP_DEFINITION);
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel
        node={boundNode()}
        definition={STRING_PROP_DEFINITION}
        dataSourceNames={[]}
        onUpdateProps={onUpdateProps}
      />,
    );
    const options = [...view.getByTestId('page-designer-binding-target-field').querySelectorAll('datalist option')];
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['value']);
    void registry;
  });

  it('degrades to the value default when the contract face throws', () => {
    const hostile = new Proxy(
      { type: 'hostile' },
      {
        get(target, prop) {
          if (prop === 'propContracts' || prop === 'fields') throw new Error('contract exploded');
          return (target as Record<string | symbol, unknown>)[prop];
        },
      },
    ) as unknown as RendererDefinition;
    const onUpdateProps = vi.fn();
    const view = render(
      <DataBindingPanel node={boundNode()} definition={hostile} dataSourceNames={[]} onUpdateProps={onUpdateProps} />,
    );
    expect((view.getByLabelText('绑定目标属性') as HTMLInputElement).value).toBe('value');
  });
});
