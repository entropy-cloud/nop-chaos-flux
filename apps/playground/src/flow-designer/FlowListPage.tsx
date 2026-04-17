import React, { useCallback, useState } from 'react';
import {
  Button,
  Input,
  NativeSelect,
  NativeSelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@nop-chaos/ui';

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
          <Input
            type="text"
            className="flow-list-search"
            placeholder="Search flows..."
            value={search}
            onChange={handleSearchChange}
          />
          <NativeSelect
            className="flow-list-filter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <NativeSelectOption value="all">All Status</NativeSelectOption>
            <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
            <NativeSelectOption value="disabled">Disabled</NativeSelectOption>
          </NativeSelect>
          <Button
            type="button"
            className="flow-list-create"
            onClick={onCreateFlow}
          >
            + Create Flow
          </Button>
        </div>
      </div>

      <div className="flow-list-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFlows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="flow-list-empty">
                  No flows found. Create your first flow to get started.
                </TableCell>
              </TableRow>
            ) : (
              filteredFlows.map((flow) => (
                <TableRow key={flow.id}>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flow-list-name-link"
                      onClick={() => onEditFlow(flow.id)}
                    >
                      {flow.name}
                    </Button>
                  </TableCell>
                  <TableCell>{flow.description || '-'}</TableCell>
                  <TableCell>
                    <span className={`flow-status flow-status--${flow.status}`}>
                      {flow.status}
                    </span>
                  </TableCell>
                  <TableCell>{flow.updatedAt}</TableCell>
                  <TableCell>
                    <div className="flow-list-row-actions">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flow-list-action"
                        onClick={() => onEditFlow(flow.id)}
                        title="Edit"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flow-list-action"
                        onClick={() => onDuplicateFlow(flow.id)}
                        title="Duplicate"
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flow-list-action"
                        onClick={() => onToggleStatus(flow.id)}
                        title={flow.status === 'enabled' ? 'Disable' : 'Enable'}
                      >
                        {flow.status === 'enabled' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="flow-list-action"
                        onClick={() => onDeleteFlow(flow.id)}
                        title="Delete"
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
