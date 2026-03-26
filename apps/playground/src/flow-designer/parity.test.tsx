// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FlowDesignerToolbar } from './FlowDesignerToolbar';
import { FlowDesignerPalette } from './FlowDesignerPalette';
import { FlowDesignerInspector } from './FlowDesignerInspector';
import type { DesignerConfig, DesignerSnapshot } from '@nop-chaos/flow-designer-core';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverMock,
    writable: true,
    configurable: true
  });
}

afterEach(() => {
  cleanup();
});

function createTestConfig(): DesignerConfig {
  return {
    version: '1.0.0',
    kind: 'flow-designer',
    nodeTypes: [
      { id: 'start', label: 'Start', icon: '▶', description: 'Start node', body: { type: 'text', text: 'Start node body' } },
      { id: 'end', label: 'End', icon: '■', description: 'End node', body: { type: 'text', text: 'End node body' } },
      { id: 'task', label: 'Task', icon: '⚙', description: 'Task node', body: { type: 'text', text: 'Task node body' } }
    ],
    palette: {
      groups: [
        { id: 'basic', label: 'Basic', nodeTypes: ['start', 'end', 'task'] }
      ]
    }
  };
}

function createEmptySnapshot(): DesignerSnapshot {
  return {
    doc: {
      id: 'test-doc',
      kind: 'flow',
      name: 'Test Flow',
      version: '1.0.0',
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    },
    selection: {
      selectedNodeIds: [],
      selectedEdgeIds: [],
      activeNodeId: null,
      activeEdgeId: null
    },
    viewport: { x: 0, y: 0, zoom: 1 },
    activeNode: null,
    activeEdge: null,
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true
  };
}

describe('Flow Designer Parity Components', () => {
  describe('Toolbar', () => {
    it('renders toolbar with all action buttons', () => {
      render(
        <FlowDesignerToolbar
          docName="Test Flow"
          canUndo={false}
          canRedo={false}
          activeTab="designer"
          onUndo={() => {}}
          onRedo={() => {}}
          onClearSelection={() => {}}
          onSave={() => {}}
          onRestore={() => {}}
          onExport={() => {}}
          onTabChange={() => {}}
        />
      );

      expect(screen.getByText('Test Flow')).toBeTruthy();
      expect(screen.getByText('↶ Undo')).toBeTruthy();
      expect(screen.getByText('↷ Redo')).toBeTruthy();
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Restore')).toBeTruthy();
      expect(screen.getByText('Export JSON')).toBeTruthy();
      expect(screen.getByText('Designer')).toBeTruthy();
      expect(screen.getByText('JSON')).toBeTruthy();
    });
  });

  describe('Palette', () => {
    it('renders palette with draggable node items', () => {
      render(
        <FlowDesignerPalette
          config={createTestConfig()}
          search=""
          expandedGroups={new Set(['basic'])}
          onSearchChange={() => {}}
          onToggleGroup={() => {}}
          onAddNode={() => {}}
        />
      );

      expect(screen.getByText('Node Palette')).toBeTruthy();
      expect(screen.getByText('Basic')).toBeTruthy();
      expect(screen.getAllByText('Start').length).toBeGreaterThan(0);
      expect(screen.getAllByText('End').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Task').length).toBeGreaterThan(0);
    });
  });

  describe('Inspector', () => {
    it('renders inspector with empty state when no selection', () => {
      render(
        <FlowDesignerInspector
          snapshot={createEmptySnapshot()}
          onUpdateNode={() => {}}
          onDeleteNode={() => {}}
          onUpdateEdge={() => {}}
          onDeleteEdge={() => {}}
        />
      );

      expect(screen.getByText('Select a node or edge to edit its properties')).toBeTruthy();
    });

    it('renders inspector with node editor when node is selected', () => {
      const snapshot: DesignerSnapshot = {
        doc: {
          id: 'test-doc',
          kind: 'flow',
          name: 'Test Flow',
          version: '1.0.0',
          nodes: [
            { id: 'node-1', type: 'task', position: { x: 100, y: 100 }, data: { label: 'My Task', description: 'A task node' } }
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        selection: {
          selectedNodeIds: ['node-1'],
          selectedEdgeIds: [],
          activeNodeId: 'node-1',
          activeEdgeId: null
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        activeNode: { id: 'node-1', type: 'task', position: { x: 100, y: 100 }, data: { label: 'My Task', description: 'A task node' } },
        activeEdge: null,
        canUndo: true,
        canRedo: false,
        isDirty: false,
        gridEnabled: true
      };

      render(
        <FlowDesignerInspector
          snapshot={snapshot}
          onUpdateNode={() => {}}
          onDeleteNode={() => {}}
          onUpdateEdge={() => {}}
          onDeleteEdge={() => {}}
        />
      );

      expect(screen.getByText('Node Properties')).toBeTruthy();
      expect(screen.getByDisplayValue('My Task')).toBeTruthy();
      expect(screen.getByText('Delete Node')).toBeTruthy();
    });

    it('renders type-specific fields for condition nodes', () => {
      const snapshot: DesignerSnapshot = {
        doc: {
          id: 'test-doc',
          kind: 'flow',
          name: 'Test Flow',
          version: '1.0.0',
          nodes: [
            { id: 'node-1', type: 'condition', position: { x: 100, y: 100 }, data: { label: 'Check Status', condition: 'status === active' } }
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        selection: {
          selectedNodeIds: ['node-1'],
          selectedEdgeIds: [],
          activeNodeId: 'node-1',
          activeEdgeId: null
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        activeNode: { id: 'node-1', type: 'condition', position: { x: 100, y: 100 }, data: { label: 'Check Status', condition: 'status === active' } },
        activeEdge: null,
        canUndo: true,
        canRedo: false,
        isDirty: false,
        gridEnabled: true
      };

      render(
        <FlowDesignerInspector
          snapshot={snapshot}
          onUpdateNode={() => {}}
          onDeleteNode={() => {}}
          onUpdateEdge={() => {}}
          onDeleteEdge={() => {}}
        />
      );

      expect(screen.getByText('Condition Expression')).toBeTruthy();
      expect(screen.getAllByDisplayValue('status === active').length).toBeGreaterThan(0);
    });

    it('renders edge editor with condition and line style fields', () => {
      const snapshot: DesignerSnapshot = {
        doc: {
          id: 'test-doc',
          kind: 'flow',
          name: 'Test Flow',
          version: '1.0.0',
          nodes: [],
          edges: [
            { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'My Edge', condition: 'status === active' } }
          ],
          viewport: { x: 0, y: 0, zoom: 1 }
        },
        selection: {
          selectedNodeIds: [],
          selectedEdgeIds: ['edge-1'],
          activeNodeId: null,
          activeEdgeId: 'edge-1'
        },
        viewport: { x: 0, y: 0, zoom: 1 },
        activeNode: null,
        activeEdge: { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'My Edge', condition: 'status === active' } },
        canUndo: false,
        canRedo: false,
        isDirty: false,
        gridEnabled: true
      };

      render(
        <FlowDesignerInspector
          snapshot={snapshot}
          onUpdateNode={() => {}}
          onDeleteNode={() => {}}
          onUpdateEdge={() => {}}
          onDeleteEdge={() => {}}
        />
      );

      expect(screen.getByText('Edge Properties')).toBeTruthy();
      expect(screen.getByDisplayValue('My Edge')).toBeTruthy();
      expect(screen.getByText('Condition')).toBeTruthy();
      expect(screen.getByText('Line Style')).toBeTruthy();
      expect(screen.getByText('Delete Edge')).toBeTruthy();
    });
  });
});
