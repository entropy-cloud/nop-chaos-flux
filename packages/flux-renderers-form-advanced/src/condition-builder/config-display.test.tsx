import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { makeEmptyGroup, renderGroup } from './config-test-support.js';

describe('condition-builder config integration display behavior', () => {
  describe('showAndOr', () => {
    it('renders AND/OR toggle buttons when showAndOr is true and builderMode is full', () => {
      renderGroup({ showAndOr: true, builderMode: 'full' });
      expect(screen.queryAllByText('AND').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('OR').length).toBeGreaterThanOrEqual(1);
    });

    it('hides AND/OR toggle when showAndOr is false', () => {
      renderGroup({ showAndOr: false, showNot: false });
      expect(screen.queryAllByText('OR')).toHaveLength(0);
    });

    it('shows static conjunction label when showNot is true but showAndOr is false', () => {
      renderGroup({ showAndOr: false, showNot: true });
      expect(screen.queryAllByText('OR')).toHaveLength(0);
      expect(screen.queryAllByText('AND').length).toBeGreaterThanOrEqual(1);
    });

    it('renders static conjunction label in simple mode even when showAndOr is true', () => {
      renderGroup({ showAndOr: true, builderMode: 'simple' });
      expect(screen.queryAllByText('OR')).toHaveLength(0);
      expect(screen.queryAllByText('AND').length).toBeGreaterThanOrEqual(1);
    });

    it('toggles conjunction on button click', () => {
      const onChange = vi.fn();
      renderGroup({ showAndOr: true, builderMode: 'full' }, makeEmptyGroup(), onChange);
      const orBtns = screen.queryAllByText('OR');
      fireEvent.click(orBtns[0]);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ conjunction: 'or' }));
    });
  });

  describe('showNot', () => {
    it('does not render NOT toggle when showNot is false (default)', () => {
      renderGroup({ showNot: false, showAndOr: true });
      expect(screen.queryAllByText('NOT')).toHaveLength(0);
    });

    it('renders NOT toggle when showNot is true', () => {
      renderGroup({ showNot: true, showAndOr: true });
      expect(screen.queryAllByText('NOT').length).toBeGreaterThanOrEqual(1);
    });

    it('toggles not on click', () => {
      const onChange = vi.fn();
      renderGroup({ showNot: true, showAndOr: true }, makeEmptyGroup(), onChange);
      const notBtns = screen.queryAllByText('NOT');
      fireEvent.click(notBtns[0]);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ not: true }));
    });

    it('shows checkmark when not is already true', () => {
      renderGroup(
        { showNot: true, showAndOr: true },
        { id: 'g1', conjunction: 'and', not: true, children: [] },
      );
      expect(screen.queryAllByText('NOT ✓').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('builderMode', () => {
    it('shows "Add Group" button in full mode', () => {
      renderGroup({ builderMode: 'full' });
      expect(screen.queryAllByText('Add group').length).toBeGreaterThanOrEqual(1);
    });

    it('hides "Add Group" button in simple mode', () => {
      renderGroup({ builderMode: 'simple' });
      expect(screen.queryAllByText('Add group')).toHaveLength(0);
    });

    it('shows "Add Condition" button in both modes', () => {
      renderGroup({ builderMode: 'simple' });
      expect(screen.queryAllByText('Add condition').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('maxDepth', () => {
    it('allows nesting when maxDepth is not set', () => {
      renderGroup({ builderMode: 'full' });
      expect(screen.queryAllByText('Add group').length).toBeGreaterThanOrEqual(1);
    });

    it('prevents nesting at depth 0 when maxDepth is 0', () => {
      renderGroup({ builderMode: 'full', maxDepth: 0 });
      expect(screen.queryAllByText('Add group')).toHaveLength(0);
    });

    it('allows nesting when depth < maxDepth', () => {
      renderGroup({ builderMode: 'full', maxDepth: 2 });
      expect(screen.queryAllByText('Add group').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('maxItemsPerGroup', () => {
    it('shows add button when under limit', () => {
      renderGroup({ maxItemsPerGroup: 2 });
      expect(screen.queryAllByText('Add condition').length).toBeGreaterThanOrEqual(1);
    });

    it('hides add condition button when at limit but keeps add group', () => {
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
          {
            id: 'i2',
            left: { type: 'field' as const, field: 'age' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      renderGroup({ maxItemsPerGroup: 2, builderMode: 'full' }, value);
      expect(screen.queryAllByText('Add condition')).toHaveLength(0);
      expect(screen.queryAllByText('Add group').length).toBeGreaterThanOrEqual(1);
    });

    it('hides all add buttons when at limit and in simple mode', () => {
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
          {
            id: 'i2',
            left: { type: 'field' as const, field: 'age' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      renderGroup({ maxItemsPerGroup: 2, builderMode: 'simple' }, value);
      expect(screen.queryAllByText('Add condition')).toHaveLength(0);
      expect(screen.queryAllByText('Add group')).toHaveLength(0);
    });

    it('still allows adding when under limit', () => {
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
      renderGroup({ maxItemsPerGroup: 2 }, value);
      expect(screen.queryAllByText('Add condition').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('custom button labels', () => {
    it('uses custom addConditionLabel', () => {
      renderGroup({ addConditionLabel: '加条件' });
      expect(screen.queryAllByText('加条件').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('添加条件')).toHaveLength(0);
    });

    it('uses custom addGroupLabel', () => {
      renderGroup({ addGroupLabel: '加分组' });
      expect(screen.queryAllByText('加分组').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('添加分组')).toHaveLength(0);
    });
  });

  describe('placeholder', () => {
    it('renders default empty text when no conditions', () => {
      renderGroup({});
      expect(
        screen.queryAllByText('No conditions yet. Use the buttons below to add one.').length,
      ).toBeGreaterThanOrEqual(1);
    });

    it('renders custom placeholder when set', () => {
      renderGroup({ placeholder: '没有条件' });
      expect(screen.queryAllByText('没有条件').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('operatorsOverride - custom labels', () => {
    it('renders custom operator label via operatorsOverride', () => {
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
      const operatorsOverride = {
        labels: { equal: '等于(自定义)' },
      };
      renderGroup({}, value, vi.fn(), { operatorsOverride });
      expect(screen.queryAllByText('等于(自定义)').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('initial data rendering', () => {
    it('renders items with correct initial data', () => {
      const value = {
        id: 'g1',
        conjunction: 'or' as const,
        children: [
          {
            id: 'i1',
            left: { type: 'field' as const, field: 'name' },
            op: 'equal' as const,
            right: 'test',
          },
          {
            id: 'i2',
            left: { type: 'field' as const, field: 'age' },
            op: 'greater' as const,
            right: 18,
          },
        ],
      };
      renderGroup({ showAndOr: true, builderMode: 'full' }, value);
      expect(screen.queryAllByText('OR').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByTestId('mock-select').length).toBeGreaterThanOrEqual(2);
    });

    it('renders nested groups from initial data', () => {
      const value = {
        id: 'g1',
        conjunction: 'and' as const,
        children: [
          {
            id: 'g2',
            conjunction: 'or' as const,
            children: [
              {
                id: 'i1',
                left: { type: 'field' as const, field: 'name' },
                op: 'equal' as const,
                right: 'test',
              },
            ],
          },
        ],
      };
      renderGroup({ showAndOr: true, builderMode: 'full' }, value);
      expect(screen.queryAllByText('OR').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('uniqueFields', () => {
    it('passes usedFields to ConditionItem when uniqueFields is true', () => {
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
          {
            id: 'i2',
            left: { type: 'field' as const, field: 'age' },
            op: 'equal' as const,
            right: undefined,
          },
        ],
      };
      renderGroup({ uniqueFields: true }, value);
      expect(screen.queryAllByTestId('mock-select').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('disabled state', () => {
    it('disables add buttons when disabled is true', () => {
      renderGroup({}, makeEmptyGroup(), vi.fn(), { disabled: true });
      const addBtns = screen.queryAllByText('Add condition');
      const button = addBtns[0].closest('button');
      expect(button).toBeTruthy();
      expect((button as HTMLButtonElement | null)?.disabled).toBe(true);
    });
  });

  describe('language switch', () => {
    it('renders English built-in labels after switching flux-i18n language', async () => {
      resetFluxI18n();
      initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
      await changeLanguage('en-US');

      renderGroup({ showAndOr: true, showNot: true, builderMode: 'full' });

      expect(screen.queryAllByText('AND').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('OR').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('NOT').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryAllByText('Add condition').length).toBeGreaterThanOrEqual(1);
    });
  });
});
