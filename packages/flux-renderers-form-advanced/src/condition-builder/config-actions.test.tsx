import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { makeEmptyGroup, renderGroup } from './config-test-support';

describe('condition-builder config integration action behavior', () => {
  describe('draggable', () => {
    it('does not render grip icon when draggable is false', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({ draggable: false }, value);
      expect(container.querySelector('.cursor-grab')).toBeNull();
    });

    it('renders grip icon when draggable is true', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({ draggable: true }, value);
      expect(container.querySelector('.cursor-grab')).not.toBeNull();
    });
  });

  describe('addCondition / addGroup actions', () => {
    it('adds a condition item on click', () => {
      const onChange = vi.fn();
      renderGroup({}, makeEmptyGroup(), onChange);
      const addBtns = screen.queryAllByText('Add condition');
      fireEvent.click(addBtns[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newGroup = onChange.mock.calls[0][0];
      expect(newGroup.children).toHaveLength(1);
      expect(newGroup.children[0]).toHaveProperty('left');
      expect(newGroup.children[0]).toHaveProperty('op');
    });

    it('adds a nested group on click', () => {
      const onChange = vi.fn();
      renderGroup({ builderMode: 'full' }, makeEmptyGroup(), onChange);
      const addGroupBtns = screen.queryAllByText('Add group');
      fireEvent.click(addGroupBtns[0]);
      expect(onChange).toHaveBeenCalledTimes(1);
      const newGroup = onChange.mock.calls[0][0];
      expect(newGroup.children).toHaveLength(1);
      expect(newGroup.children[0]).toHaveProperty('children');
    });
  });

  describe('remove actions', () => {
    it('removes a condition item', () => {
      const onChange = vi.fn();
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({}, value, onChange);
      const deleteBtn = container.querySelector('.hover\\:text-destructive');
      expect(deleteBtn).not.toBeNull();
      fireEvent.click(deleteBtn!);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ children: [] }));
    });

    it('removes a nested group at depth > 0', () => {
      const onChange = vi.fn();
      const innerGroup = {
        id: 'inner',
        conjunction: 'or' as const,
        children: [],
      };
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [innerGroup],
      };
      renderGroup({ builderMode: 'full' }, value, onChange);
      const removeBtns = screen.queryAllByTitle('Remove group');
      expect(removeBtns.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(removeBtns[0]);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ children: [] }));
    });

    it('uses translated remove group title after language switch', async () => {
      resetFluxI18n();
      initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
      await changeLanguage('en-US');

      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [{ id: 'inner', conjunction: 'or' as const, children: [] }],
      };

      renderGroup({ builderMode: 'full' }, value, vi.fn());
      expect(screen.queryAllByTitle('Remove group').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('drag handle', () => {
    it('renders grip icon with drag listeners when draggable is true', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({ draggable: true }, value);
      const handle = container.querySelector('[data-dnd-listeners="true"]');
      expect(handle).not.toBeNull();
    });

    it('does not render drag listeners when draggable is false', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({ draggable: false }, value);
      const handle = container.querySelector('[data-dnd-listeners="true"]');
      expect(handle).toBeNull();
    });

    it('does not render drag handle when disabled', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      const { container } = renderGroup({ draggable: true }, value, vi.fn(), { disabled: true });
      expect(container.querySelector('[data-dnd-listeners="true"]')).toBeNull();
    });
  });
});
