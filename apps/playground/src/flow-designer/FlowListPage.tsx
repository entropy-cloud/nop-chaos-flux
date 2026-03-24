import React, { useCallback, useState } from 'react';

export interface FlowItem {
  id: string;
  name: string;
  description: string;
  status: 'enabled' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface FlowListPageProps {
  flows: FlowItem[];
  onCreateFlow: () => void;
  onEditFlow: (flowId: string) => void;
  onDuplicateFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
  onToggleStatus: (flowId: string) => void;
}

export function FlowListPage({
  flows,
  onCreateFlow,
  onEditFlow,
  onDuplicateFlow,
  onDeleteFlow,
  onToggleStatus
}: FlowListPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const filteredFlows = flows.filter((flow) => {
    const matchesSearch =
      !search ||
      flow.name.toLowerCase().includes(search.toLowerCase()) ||
      flow.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || flow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled');
  }, []);

  return (
    <div className="flow-list-page">
      <div className="flow-list-header">
        <h1>Flow List</h1>
        <div className="flow-list-actions">
          <input
            type="text"
            className="flow-list-search"
            placeholder="Search flows..."
            value={search}
            onChange={handleSearchChange}
          />
          <select
            className="flow-list-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <button
            type="button"
            className="flow-list-create"
            onClick={onCreateFlow}
          >
            + Create Flow
          </button>
        </div>
      </div>

      <div className="flow-list-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFlows.length === 0 ? (
              <tr>
                <td colSpan={5} className="flow-list-empty">
                  No flows found. Create your first flow to get started.
                </td>
              </tr>
            ) : (
              filteredFlows.map((flow) => (
                <tr key={flow.id}>
                  <td>
                    <button
                      type="button"
                      className="flow-list-name-link"
                      onClick={() => onEditFlow(flow.id)}
                    >
                      {flow.name}
                    </button>
                  </td>
                  <td>{flow.description || '-'}</td>
                  <td>
                    <span className={`flow-status flow-status--${flow.status}`}>
                      {flow.status}
                    </span>
                  </td>
                  <td>{flow.updatedAt}</td>
                  <td>
                    <div className="flow-list-row-actions">
                      <button
                        type="button"
                        className="flow-list-action"
                        onClick={() => onEditFlow(flow.id)}
                        title="Edit"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="flow-list-action"
                        onClick={() => onDuplicateFlow(flow.id)}
                        title="Duplicate"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="flow-list-action"
                        onClick={() => onToggleStatus(flow.id)}
                        title={flow.status === 'enabled' ? 'Disable' : 'Enable'}
                      >
                        {flow.status === 'enabled' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="flow-list-action flow-list-action--danger"
                        onClick={() => onDeleteFlow(flow.id)}
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
