import type { GraphDocument, DesignerConfig } from '@nop-chaos/flow-designer-core';
import { FlowDesignerExample } from '../FlowDesignerExample';

const workflowDesignerConfig: DesignerConfig = {
  version: '1.0',
  kind: 'workflow',
  nodeTypes: [
    {
      id: 'start',
      label: 'Start',
      description: 'Workflow entry point',
      icon: '▶',
      body: { type: 'tpl', tpl: 'Workflow start node' },
      defaults: { label: 'Start', trigger: 'manual' },
      constraints: { maxInstances: 1, allowIncoming: false },
      ports: [
        { id: 'out', direction: 'output', position: 'right', roles: { provides: ['trigger'] }, maxConnections: 1 }
      ],
      permissions: { canDelete: false, canDuplicate: false }
    },
    {
      id: 'end',
      label: 'End',
      description: 'Workflow end point',
      icon: '■',
      body: { type: 'tpl', tpl: 'Workflow end node' },
      defaults: { label: 'End', result: 'done' },
      constraints: { allowOutgoing: false },
      ports: [
        { id: 'in', direction: 'input', position: 'left', roles: { accepts: ['trigger', 'output', 'error'] } }
      ]
    },
    {
      id: 'task',
      label: 'Task',
      description: 'Execute a task',
      icon: '⚙',
      body: { type: 'tpl', tpl: 'Task node' },
      defaults: { label: 'Task', executor: 'service', timeout: '30s' },
      ports: [
        { id: 'in', direction: 'input', position: 'left', roles: { accepts: ['trigger', 'output'] } },
        { id: 'out', direction: 'output', position: 'right', roles: { provides: ['output', 'error'] } }
      ]
    },
    {
      id: 'condition',
      label: 'Condition',
      description: 'Branch based on condition',
      icon: '◇',
      body: { type: 'tpl', tpl: 'Condition node' },
      defaults: { label: 'Condition', expression: 'payload.ok === true' },
      ports: [
        { id: 'in', direction: 'input', position: 'left', roles: { accepts: ['trigger', 'output'] } },
        { id: 'outTrue', direction: 'output', position: 'right', roles: { provides: ['output'] } },
        { id: 'outFalse', direction: 'output', position: 'bottom', roles: { provides: ['output'] } }
      ]
    },
    {
      id: 'parallel',
      label: 'Parallel',
      description: 'Execute in parallel',
      icon: '⫼',
      body: { type: 'tpl', tpl: 'Parallel node' },
      defaults: { label: 'Parallel', branches: '2' },
      ports: [
        { id: 'in', direction: 'input', position: 'left', roles: { accepts: ['trigger', 'output'] } },
        { id: 'out', direction: 'output', position: 'right', roles: { provides: ['output'] } }
      ]
    },
    {
      id: 'loop',
      label: 'Loop',
      description: 'Loop execution',
      icon: '↻',
      body: { type: 'tpl', tpl: 'Loop node' },
      defaults: { label: 'Loop', limit: '3', interval: '1m' },
      ports: [
        { id: 'in', direction: 'input', position: 'left', roles: { accepts: ['trigger', 'output'] } },
        { id: 'out', direction: 'output', position: 'right', roles: { provides: ['output'] } }
      ]
    }
  ],
  edgeTypes: [
    {
      id: 'default',
      label: 'Default',
      appearance: { stroke: '#94a3b8', strokeWidth: 2, strokeStyle: 'solid', markerEnd: 'arrowClosed' }
    },
    {
      id: 'error',
      label: 'Error',
      appearance: { stroke: '#ef4444', strokeWidth: 2, strokeStyle: 'dashed', markerEnd: 'arrowClosed' }
    },
    {
      id: 'success',
      label: 'Success',
      appearance: { stroke: '#10b981', strokeWidth: 2, strokeStyle: 'solid', markerEnd: 'arrowClosed' }
    }
  ],
  palette: {
    searchable: true,
    groups: [
      { id: 'basic', label: 'Basic', nodeTypes: ['start', 'end'], expanded: true },
      { id: 'logic', label: 'Logic', nodeTypes: ['condition', 'parallel', 'loop'], expanded: true },
      { id: 'execution', label: 'Execution', nodeTypes: ['task'], expanded: true }
    ]
  },
  features: {
    undo: true, redo: true, grid: true, minimap: true, export: true, clipboard: true, shortcuts: true
  },
  rules: {
    allowSelfLoop: false, allowMultiEdge: true, defaultEdgeType: 'default'
  },
  canvas: {
    background: 'dots', gridSize: 24, snapToGrid: true
  }
};

const sampleWorkflowDocument: GraphDocument = {
  id: 'sample-workflow-1',
  kind: 'workflow',
  name: 'Sample Workflow',
  version: '1.0',
  nodes: [
    { id: 'node-1', type: 'start', position: { x: 100, y: 200 }, data: { label: 'Start', trigger: 'manual' } },
    { id: 'node-2', type: 'task', position: { x: 350, y: 200 }, data: { label: 'Validate Input', executor: 'service', timeout: '30s' } },
    { id: 'node-3', type: 'condition', position: { x: 600, y: 200 }, data: { label: 'Check Status', expression: 'input.valid === true' } },
    { id: 'node-4', type: 'task', position: { x: 850, y: 120 }, data: { label: 'Process Data', executor: 'script', timeout: '60s' } },
    { id: 'node-5', type: 'task', position: { x: 850, y: 280 }, data: { label: 'Handle Error', executor: 'http', timeout: '30s' } },
    { id: 'node-6', type: 'end', position: { x: 1100, y: 200 }, data: { label: 'End', result: 'done' } }
  ],
  edges: [
    { id: 'edge-1', type: 'default', source: 'node-1', target: 'node-2', data: { label: 'Start' } },
    { id: 'edge-2', type: 'default', source: 'node-2', target: 'node-3', data: { label: 'Validate' } },
    { id: 'edge-3', type: 'success', source: 'node-3', target: 'node-4', data: { label: 'Valid' } },
    { id: 'edge-4', type: 'error', source: 'node-3', target: 'node-5', data: { label: 'Invalid' } },
    { id: 'edge-5', type: 'default', source: 'node-4', target: 'node-6', data: { label: 'Complete' } },
    { id: 'edge-6', type: 'default', source: 'node-5', target: 'node-6', data: { label: 'Retry Complete' } }
  ],
  viewport: { x: 0, y: 0, zoom: 1 }
};

interface FlowDesignerPageProps {
  onBack: () => void;
}

export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  return (
    <div className="playground-flow-page">
      <button type="button" className="page-back page-back--floating" onClick={onBack}>
        Back to Home
      </button>
      <FlowDesignerExample
        document={sampleWorkflowDocument}
      />
    </div>
  );
}
