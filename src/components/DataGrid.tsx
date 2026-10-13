import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, ArrowUp, ArrowDown, Search, Plus, Filter,
  Download, MoreHorizontal, Check, X, Edit3
} from 'lucide-react';
import { Task } from '../types';
import { statusColors, priorityColors } from '../data';

interface DataGridProps {
  tasks: Task[];
  onUpdateTask: (id: number, field: string, value: string) => void;
  onAddTask: () => void;
}

type SortField = keyof Task | null;
type SortDirection = 'asc' | 'desc';

export default function DataGrid({ tasks, onUpdateTask, onAddTask }: DataGridProps) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingCell, setEditingCell] = useState<{ rowId: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];

    // Filter
    if (globalFilter) {
      const lower = globalFilter.toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(lower) ||
        task.assignee.toLowerCase().includes(lower) ||
        task.status.toLowerCase().includes(lower) ||
        task.category.toLowerCase().includes(lower) ||
        String(task.id).includes(lower)
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return result;
  }, [tasks, globalFilter, sortField, sortDirection]);

  const handleCellClick = (rowId: number, column: string, currentValue: string) => {
    setEditingCell({ rowId, column });
    setEditValue(currentValue);
  };

  const handleCellSave = () => {
    if (editingCell && editValue) {
      onUpdateTask(editingCell.rowId, editingCell.column, editValue);
    }
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const toggleRowSelection = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const SortIcon = ({ field }: { field: keyof Task }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 text-indigo-400" />
      : <ArrowDown className="w-3 h-3 text-indigo-400" />;
  };

  const columns: { key: keyof Task; label: string; width: string }[] = [
    { key: 'id', label: 'ID', width: 'w-[70px]' },
    { key: 'title', label: 'Task', width: 'w-[250px]' },
    { key: 'assignee', label: 'Assignee', width: 'w-[150px]' },
    { key: 'status', label: 'Status', width: 'w-[130px]' },
    { key: 'priority', label: 'Priority', width: 'w-[110px]' },
    { key: 'dueDate', label: 'Due Date', width: 'w-[110px]' },
    { key: 'category', label: 'Category', width: 'w-[120px]' },
  ];

  const renderCell = (task: Task, column: keyof Task) => {
    const isEditing = editingCell?.rowId === task.id && editingCell?.column === column;
    const value = String(task[column]);

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCellSave();
              if (e.key === 'Escape') handleCellCancel();
            }}
            className="bg-slate-700 border border-indigo-500/50 rounded px-2 py-0.5 text-sm text-white w-full focus:outline-none"
            autoFocus
          />
          <button onClick={handleCellSave} className="text-green-400 hover:text-green-300 flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCellCancel} className="text-red-400 hover:text-red-300 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    switch (column) {
      case 'id':
        return <span className="text-slate-400 font-mono text-xs">#{value}</span>;
      case 'title':
        return <span className="font-medium text-slate-200 truncate block max-w-[230px]">{value}</span>;
      case 'assignee':
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {value.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <span className="text-slate-300 text-sm truncate">{value}</span>
          </div>
        );
      case 'status':
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[value] || ''}`}>
            {value}
          </span>
        );
      case 'priority':
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[value] || ''}`}>
            {value}
          </span>
        );
      case 'dueDate':
        return <span className="text-slate-400 text-sm">{value}</span>;
      case 'category':
        return <span className="text-slate-300 text-sm bg-slate-800 px-2 py-0.5 rounded">{value}</span>;
      default:
        return <span className="text-slate-300 text-sm">{value}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search tasks..."
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-64 transition-all"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
              {selectedRows.size} selected
            </span>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-800/80 backdrop-blur-sm">
              <th className="px-3 py-2.5 text-left w-10">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(filteredAndSorted.map(t => t.id)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors ${col.width}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon field={col.key} />
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredAndSorted.map((task) => {
                const isSelected = selectedRows.has(task.id);
                return (
                  <motion.tr
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-500/5' : ''
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(task.id)}
                        className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500/50"
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-sm"
                        onDoubleClick={() => {
                          if (col.key !== 'id') {
                            handleCellClick(task.id, col.key, String(task[col.key]));
                          }
                        }}
                      >
                        <div className="flex items-center gap-1 group/cell">
                          {renderCell(task, col.key)}
                          {col.key !== 'id' && (
                            <Edit3 className="w-3 h-3 text-slate-600 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <button className="text-slate-500 hover:text-slate-300 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50 bg-slate-800/30">
        <span className="text-xs text-slate-500">
          Showing {filteredAndSorted.length} of {tasks.length} tasks
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Double-click any cell to edit</span>
          <div className="w-px h-4 bg-slate-700" />
          <span className="text-xs text-slate-500">
            {selectedRows.size > 0 ? `${selectedRows.size} selected` : 'None selected'}
          </span>
        </div>
      </div>
    </div>
  );
}
