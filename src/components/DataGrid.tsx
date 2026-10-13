import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  DollarSign, Percent, ChevronDown, Plus, History, Redo2, Printer,
  ZoomIn, ZoomOut, Sigma, MoreHorizontal, Copy, Scissors, Clipboard,
  Trash2, Eye, Lock, ArrowUpDown, Filter, X, Check, SortAsc, SortDesc,
  WrapText, Paintbrush, FunctionSquare, Link2, Undo2
} from 'lucide-react';
import { Task } from '../types';
import { useGridState } from '../workspace/useGridState';
import { useClipboard } from '../workspace/useClipboard';
import { formatCellValue, getCellTextStyle, getCellContainerStyle } from '../workspace/formatters';
import { evaluateFormula, isFormula } from '../workspace/formulas';
import { CellStyle, CellPosition, CellRange, SortConfig, FilterCondition } from '../workspace/types';

interface DataGridProps {
  tasks: Task[];
  onUpdateTask: (id: number, field: string, value: string) => void;
  onAddTask: () => void;
}

const COLUMN_DEFS = [
  { key: 'id', label: 'ID', width: 60, type: 'number' as const },
  { key: 'title', label: 'Task', width: 220, type: 'text' as const },
  { key: 'assignee', label: 'Assignee', width: 150, type: 'text' as const },
  { key: 'status', label: 'Status', width: 120, type: 'text' as const },
  { key: 'priority', label: 'Priority', width: 110, type: 'text' as const },
  { key: 'dueDate', label: 'Due Date', width: 110, type: 'date' as const },
  { key: 'category', label: 'Category', width: 120, type: 'text' as const },
  { key: 'notes', label: 'Notes', width: 200, type: 'text' as const },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function getColLetter(i: number): string {
  return i < 26 ? ALPHABET[i] : ALPHABET[Math.floor(i / 26) - 1] + ALPHABET[i % 26];
}

const statusColors: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done': 'bg-green-100 text-green-700',
  'Blocked': 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  'Low': 'bg-slate-100 text-slate-600',
  'Medium': 'bg-yellow-100 text-yellow-700',
  'High': 'bg-orange-100 text-orange-700',
  'Critical': 'bg-red-100 text-red-700',
};

export default function DataGrid({ tasks, onUpdateTask, onAddTask }: DataGridProps) {
  const gridState = useGridState(tasks);
  const clipboard = useClipboard();
  
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filterMenu, setFilterMenu] = useState<{ col: number; x: number; y: number } | null>(null);
  const [filterValue, setFilterValue] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterCondition[]>([]);
  const [zoom, setZoom] = useState(100);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(10);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterBarValues, setFilterBarValues] = useState<Record<number, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // Apply sorting
  const sortedTasks = useMemo(() => {
    let result = [...gridState.tasks];
    
    if (sortConfig) {
      const key = COLUMN_DEFS[sortConfig.column]?.key;
      if (key) {
        result.sort((a, b) => {
          const aVal = String(a[key as keyof Task] ?? '');
          const bVal = String(b[key as keyof Task] ?? '');
          const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        });
      }
    }
    
    // Apply filter bar
    if (Object.keys(filterBarValues).some(k => filterBarValues[Number(k)])) {
      result = result.filter(task => {
        return Object.entries(filterBarValues).every(([colStr, filterVal]) => {
          if (!filterVal) return true;
          const col = Number(colStr);
          const key = COLUMN_DEFS[col]?.key;
          if (!key) return true;
          return String(task[key as keyof Task] ?? '').toLowerCase().includes(filterVal.toLowerCase());
        });
      });
    }
    
    return result;
  }, [gridState.tasks, sortConfig, filterBarValues]);

  // Get cell value
  const getCellValue = useCallback((row: number, col: number): string => {
    if (row >= sortedTasks.length || col >= COLUMN_DEFS.length) return '';
    const task = sortedTasks[row];
    const key = COLUMN_DEFS[col]?.key;
    if (!key) return '';
    const raw = String(task[key as keyof Task] ?? '');
    
    // Check for formula
    if (isFormula(raw)) {
      return evaluateFormula(raw.slice(1), {
        getCellValue: (r, c) => {
          if (r >= sortedTasks.length || c >= COLUMN_DEFS.length) return '';
          return String(sortedTasks[r][COLUMN_DEFS[c]?.key as keyof Task] ?? '');
        },
        totalRows: sortedTasks.length,
        totalCols: COLUMN_DEFS.length
      });
    }
    
    return raw;
  }, [sortedTasks]);

  // Get raw cell value (before formatting)
  const getRawCellValue = useCallback((row: number, col: number): string => {
    if (row >= sortedTasks.length || col >= COLUMN_DEFS.length) return '';
    const task = sortedTasks[row];
    const key = COLUMN_DEFS[col]?.key;
    if (!key) return '';
    return String(task[key as keyof Task] ?? '');
  }, [sortedTasks]);

  // Cell reference
  const getCellRef = (row: number, col: number): string => `${getColLetter(col)}${row + 1}`;

  // Selection helpers
  const isSelected = (row: number, col: number) => selectedCell?.row === row && selectedCell?.col === col;
  const isInRange = (row: number, col: number) => {
    if (!selectedRange) return false;
    const minR = Math.min(selectedRange.start.row, selectedRange.end.row);
    const maxR = Math.max(selectedRange.start.row, selectedRange.end.row);
    const minC = Math.min(selectedRange.start.col, selectedRange.end.col);
    const maxC = Math.max(selectedRange.start.col, selectedRange.end.col);
    return row >= minR && row <= maxR && col >= minC && col <= maxC;
  };

  // Cell click
  const handleCellClick = (row: number, col: number, e?: React.MouseEvent) => {
    if (e?.shiftKey && selectedCell) {
      setSelectedRange({ start: selectedCell, end: { row, col } });
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
    }
    setContextMenu(null);
    setFilterMenu(null);
  };

  // Double click to edit
  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setEditValue(getRawCellValue(row, col));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Commit edit
  const commitEdit = useCallback(() => {
    if (editingCell) {
      const task = sortedTasks[editingCell.row];
      const key = COLUMN_DEFS[editingCell.col]?.key;
      if (task && key) {
        onUpdateTask(task.id, key, editValue);
      }
    }
    setEditingCell(null);
  }, [editingCell, sortedTasks, editValue, onUpdateTask]);

  // Cancel edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle editing mode
    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        if (selectedCell && selectedCell.row < sortedTasks.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
        }
      } else if (e.key === 'Escape') {
        cancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (selectedCell) {
          const nextCol = e.shiftKey ? selectedCell.col - 1 : selectedCell.col + 1;
          if (nextCol >= 0 && nextCol < COLUMN_DEFS.length) {
            setSelectedCell({ row: selectedCell.row, col: nextCol });
          }
        }
      }
      return;
    }

    // Ctrl/Cmd shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault();
          if (selectedCell) {
            const range = selectedRange || { start: selectedCell, end: selectedCell };
            clipboard.copy(range, getCellValue);
          }
          return;
        case 'x':
          e.preventDefault();
          if (selectedCell) {
            const range = selectedRange || { start: selectedCell, end: selectedCell };
            clipboard.cut(range, getCellValue);
            // Clear the cut cells
            const minR = Math.min(range.start.row, range.end.row);
            const maxR = Math.max(range.start.row, range.end.row);
            const minC = Math.min(range.start.col, range.end.col);
            const maxC = Math.max(range.start.col, range.end.col);
            gridState.clearRange(minR, minC, maxR, maxC);
          }
          return;
        case 'v':
          e.preventDefault();
          if (selectedCell) {
            clipboard.paste(selectedCell, (row, col, value) => {
              if (row < sortedTasks.length && col < COLUMN_DEFS.length) {
                const task = sortedTasks[row];
                const key = COLUMN_DEFS[col]?.key;
                if (task && key) {
                  onUpdateTask(task.id, key, value);
                }
              }
            });
          }
          return;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            gridState.redo();
          } else {
            gridState.undo();
          }
          return;
        case 'y':
          e.preventDefault();
          gridState.redo();
          return;
        case 'b':
          e.preventDefault();
          if (selectedCell) {
            const key = `${selectedCell.row}-${selectedCell.col}`;
            const current = gridState.styles[key]?.bold || false;
            gridState.setCellStyle(selectedCell.row, selectedCell.col, { bold: !current });
          }
          return;
        case 'i':
          e.preventDefault();
          if (selectedCell) {
            const key = `${selectedCell.row}-${selectedCell.col}`;
            const current = gridState.styles[key]?.italic || false;
            gridState.setCellStyle(selectedCell.row, selectedCell.col, { italic: !current });
          }
          return;
        case 'u':
          e.preventDefault();
          if (selectedCell) {
            const key = `${selectedCell.row}-${selectedCell.col}`;
            const current = gridState.styles[key]?.underline || false;
            gridState.setCellStyle(selectedCell.row, selectedCell.col, { underline: !current });
          }
          return;
      }
    }

    if (!selectedCell) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCell({ row: Math.max(0, selectedCell.row - 1), col: selectedCell.col });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCell({ row: Math.min(sortedTasks.length - 1, selectedCell.row + 1), col: selectedCell.col });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: Math.max(0, selectedCell.col - 1) });
        break;
      case 'ArrowRight':
        e.preventDefault();
        setSelectedCell({ row: selectedCell.row, col: Math.min(COLUMN_DEFS.length - 1, selectedCell.col + 1) });
        break;
      case 'Enter':
        e.preventDefault();
        handleCellDoubleClick(selectedCell.row, selectedCell.col);
        break;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        if (selectedRange) {
          const minR = Math.min(selectedRange.start.row, selectedRange.end.row);
          const maxR = Math.max(selectedRange.start.row, selectedRange.end.row);
          const minC = Math.min(selectedRange.start.col, selectedRange.end.col);
          const maxC = Math.max(selectedRange.start.col, selectedRange.end.col);
          gridState.clearRange(minR, minC, maxR, maxC);
        } else {
          const task = sortedTasks[selectedCell.row];
          const key = COLUMN_DEFS[selectedCell.col]?.key;
          if (task && key) onUpdateTask(task.id, key, '');
        }
        break;
      case 'F2':
        e.preventDefault();
        handleCellDoubleClick(selectedCell.row, selectedCell.col);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey && selectedCell.col > 0) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
        } else if (!e.shiftKey && selectedCell.col < COLUMN_DEFS.length - 1) {
          setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setEditingCell({ row: selectedCell.row, col: selectedCell.col });
          setEditValue(e.key);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
        break;
    }
  }, [editingCell, selectedCell, selectedRange, sortedTasks, commitEdit, clipboard, getCellValue, gridState, onUpdateTask]);

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextMenu || !selectedCell) return;
    
    switch (action) {
      case 'copy':
        clipboard.copy({ start: selectedCell, end: selectedCell }, getCellValue);
        break;
      case 'cut':
        clipboard.cut({ start: selectedCell, end: selectedCell }, getCellValue);
        gridState.clearRange(selectedCell.row, selectedCell.col, selectedCell.row, selectedCell.col);
        break;
      case 'paste':
        clipboard.paste(selectedCell, (row, col, value) => {
          if (row < sortedTasks.length && col < COLUMN_DEFS.length) {
            const task = sortedTasks[row];
            const key = COLUMN_DEFS[col]?.key;
            if (task && key) onUpdateTask(task.id, key, value);
          }
        });
        break;
      case 'delete':
        gridState.clearRange(selectedCell.row, selectedCell.col, selectedCell.row, selectedCell.col);
        break;
      case 'insert_row_above':
        gridState.insertRowAt(selectedCell.row);
        break;
      case 'insert_row_below':
        gridState.insertRowAt(selectedCell.row + 1);
        break;
      case 'delete_row':
        gridState.deleteRow(selectedCell.row);
        break;
      case 'sort_asc':
        setSortConfig({ column: selectedCell.col, direction: 'asc' });
        break;
      case 'sort_desc':
        setSortConfig({ column: selectedCell.col, direction: 'desc' });
        break;
      case 'clear_sort':
        setSortConfig(null);
        break;
      case 'add_note':
        gridState.setCellNote(selectedCell.row, selectedCell.col, {
          text: 'Note added',
          author: 'User',
          timestamp: new Date()
        });
        break;
      case 'protect':
        gridState.toggleCellProtection(selectedCell.row, selectedCell.col);
        break;
    }
    setContextMenu(null);
  };

  // Apply filter from filter menu
  const applyFilter = () => {
    if (filterMenu && filterValue) {
      setFilterBarValues(prev => ({ ...prev, [filterMenu.col]: filterValue }));
    }
    setFilterMenu(null);
    setFilterValue('');
  };

  // Clear filter for column
  const clearColumnFilter = (col: number) => {
    setFilterBarValues(prev => {
      const { [col]: _, ...rest } = prev;
      return rest;
    });
  };

  // Render cell content
  const renderCellContent = (row: number, col: number, value: string) => {
    const key = COLUMN_DEFS[col]?.key;
    const style = gridState.styles[`${row}-${col}`];
    const textStyle = getCellTextStyle(style);

    switch (key) {
      case 'status':
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${statusColors[value] || ''}`} style={textStyle}>
            {value}
          </span>
        );
      case 'priority':
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${priorityColors[value] || ''}`} style={textStyle}>
            {value}
          </span>
        );
      case 'assignee':
        return (
          <div className="flex items-center gap-1.5" style={textStyle}>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
              {value.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <span className="truncate text-[12px]">{value}</span>
          </div>
        );
      case 'id':
        return <span className="text-slate-500 font-mono text-[11px]" style={textStyle}>{value}</span>;
      default:
        return <span className="truncate text-[12px]" style={textStyle}>{formatCellValue(value, style)}</span>;
    }
  };

  // Formula bar content
  const formulaBarContent = selectedCell ? getRawCellValue(selectedCell.row, selectedCell.col) : '';
  const formulaBarRef = selectedCell ? getCellRef(selectedCell.row, selectedCell.col) : '';

  // Scroll selected cell into view
  useEffect(() => {
    if (selectedCell && gridScrollRef.current) {
      const cellEl = cellRefs.current.get(`${selectedCell.row}-${selectedCell.col}`);
      if (cellEl) {
        cellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
  }, [selectedCell]);

  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  return (
    <div
      className="flex flex-col h-full bg-white select-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
      onClick={() => { setContextMenu(null); setFilterMenu(null); }}
    >
      {/* Toolbar */}
      <div className="bg-[#f9fbfd] border-b border-[#e0e3e6]">
        {/* Menu bar */}
        <div className="flex items-center px-2 py-1 gap-1 border-b border-[#e0e3e6]">
          <div className="flex items-center gap-1 mr-3">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
              <Sigma className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 ml-1">Task Board</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Shared</span>
          </div>
          {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'].map((menu) => (
            <button key={menu} className="px-2 py-0.5 text-[12px] text-slate-600 hover:bg-slate-200/60 rounded transition-colors">
              {menu}
            </button>
          ))}
        </div>

        {/* Action toolbar */}
        <div className="flex items-center px-2 py-1 gap-0.5 flex-wrap">
          {/* Undo/Redo */}
          <button
            onClick={() => gridState.undo()}
            disabled={!gridState.canUndo}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 disabled:opacity-30 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => gridState.redo()}
            disabled={!gridState.canRedo}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 disabled:opacity-30 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors" onClick={() => window.print()} title="Print">
            <Printer className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          {/* Font */}
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="h-7 px-1 text-[11px] text-slate-600 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400"
          >
            <option>Arial</option>
            <option>Times New Roman</option>
            <option>Courier New</option>
            <option>Georgia</option>
            <option>Verdana</option>
          </select>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-7 w-12 px-1 text-[11px] text-slate-600 border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-400"
          >
            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          {/* Format buttons */}
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { bold: !gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.bold })}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${selectedCell && gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.bold ? 'bg-slate-200' : 'hover:bg-slate-200/60'} text-slate-600`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { italic: !gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.italic })}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${selectedCell && gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.italic ? 'bg-slate-200' : 'hover:bg-slate-200/60'} text-slate-600`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { underline: !gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.underline })}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${selectedCell && gridState.styles[`${selectedCell.row}-${selectedCell.col}`]?.underline ? 'bg-slate-200' : 'hover:bg-slate-200/60'} text-slate-600`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          {/* Format types */}
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { format: 'currency' })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
            title="Format as Currency"
          >
            <DollarSign className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { format: 'percent' })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
            title="Format as Percent"
          >
            <Percent className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          {/* Alignment */}
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { align: 'left' })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { align: 'center' })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => selectedCell && gridState.setCellStyle(selectedCell.row, selectedCell.col, { align: 'right' })}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-slate-300 mx-1" />
          
          {/* Other tools */}
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors" title="Fill Color">
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${showFilterBar ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200/60 text-slate-600'}`}
            title="Toggle Filter Row"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors" title="Functions">
            <FunctionSquare className="w-4 h-4" />
          </button>
          
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-600 w-10 text-center">{zoom}%</span>
            <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center border-b border-[#e0e3e6] bg-white h-[29px]">
        <div className="flex items-center h-full px-2 border-r border-[#e0e3e6] min-w-[70px] bg-[#f9fbfd]">
          <span className="text-[12px] text-slate-600 font-mono">{formulaBarRef}</span>
        </div>
        <div className="flex items-center justify-center w-7 h-full border-r border-[#e0e3e6]">
          <span className="text-[12px] text-slate-400 italic font-serif">fx</span>
        </div>
        <div className="flex-1 h-full flex items-center px-2">
          {editingCell ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { commitEdit(); }
                else if (e.key === 'Escape') { cancelEdit(); }
                else if (e.key === 'Tab') {
                  e.preventDefault();
                  commitEdit();
                  if (selectedCell) {
                    const nextCol = selectedCell.col + 1;
                    if (nextCol < COLUMN_DEFS.length) {
                      setSelectedCell({ row: selectedCell.row, col: nextCol });
                    }
                  }
                }
              }}
              className="w-full h-full text-[12px] text-slate-800 bg-white focus:outline-none border-2 border-blue-500 -m-0.5 px-1.5"
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={formulaBarContent}
              onChange={(e) => {
                if (selectedCell) {
                  setEditingCell(selectedCell);
                  setEditValue(e.target.value);
                }
              }}
              className="w-full h-full text-[12px] text-slate-800 bg-transparent focus:outline-none cursor-cell"
              readOnly={!selectedCell}
            />
          )}
        </div>
      </div>

      {/* Grid */}
      <div ref={gridScrollRef} className="flex-1 overflow-auto relative" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
        {/* Column headers */}
        <div className="sticky top-0 z-20 flex bg-[#f8f9fa] border-b border-[#e0e3e6]" style={{ minHeight: showFilterBar ? 50 : 26 }}>
          <div
            className="sticky left-0 z-30 flex flex-col items-center justify-center border-r border-[#e0e3e6] bg-[#f8f9fa]"
            style={{ width: 46, minWidth: 46, height: showFilterBar ? 50 : 26 }}
          >
            <div className="w-2.5 h-2.5 border border-slate-400 rounded-sm" />
          </div>
          {COLUMN_DEFS.map((col, colIndex) => (
            <div
              key={col.key}
              className="flex flex-col border-r border-[#e0e3e6]"
              style={{ width: col.width, minWidth: col.width }}
            >
              <div
                className={`flex items-center justify-center cursor-pointer select-none transition-colors relative group ${
                  selectedCell?.col === colIndex ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-[#e8eaed] text-slate-600'
                } ${sortConfig?.column === colIndex ? 'bg-blue-50 text-blue-700' : ''}`}
                style={{ height: 26 }}
                onClick={() => {
                  if (sortConfig?.column === colIndex) {
                    setSortConfig(sortConfig.direction === 'asc' ? { column: colIndex, direction: 'desc' } : null);
                  } else {
                    setSortConfig({ column: colIndex, direction: 'asc' });
                  }
                }}
              >
                <span className="text-[11px] font-medium">{getColLetter(colIndex)}</span>
                {sortConfig?.column === colIndex && (
                  <span className="ml-0.5 text-[9px]">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                )}
                <button
                  className="absolute bottom-0 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterMenu({ col: colIndex, x: e.clientX, y: e.clientY });
                  }}
                >
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </div>
              {/* Filter row */}
              {showFilterBar && (
                <div className="flex items-center px-1 border-t border-[#e0e3e6]" style={{ height: 24 }}>
                  <input
                    type="text"
                    value={filterBarValues[colIndex] || ''}
                    onChange={(e) => {
                      setFilterBarValues(prev => ({ ...prev, [colIndex]: e.target.value }));
                    }}
                    placeholder="Filter..."
                    className="w-full h-full text-[10px] text-slate-600 bg-white border border-slate-200 rounded px-1 focus:outline-none focus:border-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {filterBarValues[colIndex] && (
                    <button
                      onClick={() => clearColumnFilter(colIndex)}
                      className="absolute right-0.5"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Extra empty columns */}
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center border-r border-[#e0e3e6] text-slate-400"
              style={{ width: 100, minWidth: 100, height: showFilterBar ? 50 : 26 }}
            >
              <span className="text-[11px]">{getColLetter(COLUMN_DEFS.length + i)}</span>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {sortedTasks.map((task, rowIndex) => (
          <div key={task.id} className="flex" style={{ minHeight: 24 }}>
            {/* Row number */}
            <div
              className={`sticky left-0 z-10 flex items-center justify-center border-r border-b border-[#e0e3e6] bg-[#f8f9fa] cursor-pointer select-none text-[11px] transition-colors ${
                selectedCell?.row === rowIndex ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-[#e8eaed] text-slate-500'
              }`}
              style={{ width: 46, minWidth: 46, height: 24 }}
              onClick={() => {
                setSelectedCell({ row: rowIndex, col: 0 });
                setSelectedRange({ start: { row: rowIndex, col: 0 }, end: { row: rowIndex, col: COLUMN_DEFS.length - 1 } });
              }}
            >
              {rowIndex + 1}
            </div>
            {/* Data cells */}
            {COLUMN_DEFS.map((col, colIndex) => {
              const value = getCellValue(rowIndex, colIndex);
              const cellSelected = isSelected(rowIndex, colIndex);
              const cellInRange = isInRange(rowIndex, colIndex);
              const cellEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
              const style = gridState.styles[`${rowIndex}-${colIndex}`];
              const containerStyle = getCellContainerStyle(style);
              const note = gridState.notes[`${rowIndex}-${colIndex}`];
              const isProtected = gridState.protectedCells[`${rowIndex}-${colIndex}`];

              return (
                <div
                  key={col.key}
                  ref={(el) => { if (el) cellRefs.current.set(`${rowIndex}-${colIndex}`, el); }}
                  className={`relative border-r border-b border-[#e0e3e6] overflow-hidden cursor-cell transition-colors ${
                    cellSelected
                      ? 'outline outline-[2px] outline-blue-500 z-[5] bg-white'
                      : cellInRange
                      ? 'bg-blue-50/60'
                      : 'bg-white hover:bg-blue-50/30'
                  } ${isProtected ? 'bg-slate-50' : ''}`}
                  style={{ width: col.width, minWidth: col.width, height: 24, ...containerStyle }}
                  onClick={(e) => { e.stopPropagation(); handleCellClick(rowIndex, colIndex, e); }}
                  onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedCell({ row: rowIndex, col: colIndex });
                    setContextMenu({ x: e.clientX, y: e.clientY });
                  }}
                >
                  {!cellEditing && (
                    <div className="w-full h-full flex items-center px-1.5">
                      {renderCellContent(rowIndex, colIndex, value)}
                    </div>
                  )}
                  {/* Note indicator */}
                  {note && !cellEditing && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-amber-400 border-l-[6px] border-l-transparent" />
                  )}
                  {/* Protected indicator */}
                  {isProtected && !cellEditing && (
                    <div className="absolute bottom-0 left-0.5">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                  )}
                  {/* Selection fill handle */}
                  {cellSelected && !editingCell && (
                    <div className="absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] bg-blue-500 border border-white cursor-crosshair z-10" />
                  )}
                </div>
              );
            })}
            {/* Empty cells */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={`empty-cell-${i}`}
                className="border-r border-b border-[#e0e3e6] bg-white hover:bg-blue-50/30 cursor-cell"
                style={{ width: 100, minWidth: 100, height: 24 }}
                onClick={(e) => { e.stopPropagation(); setSelectedCell({ row: rowIndex, col: COLUMN_DEFS.length + i }); }}
              />
            ))}
          </div>
        ))}

        {/* Empty rows */}
        {Array.from({ length: 50 }).map((_, rowIndex) => {
          const actualRow = sortedTasks.length + rowIndex;
          return (
            <div key={`empty-row-${rowIndex}`} className="flex" style={{ minHeight: 24 }}>
              <div className="sticky left-0 z-10 flex items-center justify-center border-r border-b border-[#e0e3e6] bg-[#f8f9fa] text-[11px] text-slate-400 select-none" style={{ width: 46, minWidth: 46, height: 24 }}>
                {actualRow + 1}
              </div>
              {COLUMN_DEFS.map((col) => (
                <div key={col.key} className="border-r border-b border-[#e0e3e6] bg-white hover:bg-blue-50/30 cursor-cell" style={{ width: col.width, minWidth: col.width, height: 24 }} />
              ))}
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={`e-${i}`} className="border-r border-b border-[#e0e3e6] bg-white" style={{ width: 100, minWidth: 100, height: 24 }} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center border-t border-[#e0e3e6] bg-[#f8f9fa] h-[32px] px-1 flex-shrink-0">
        <button onClick={() => onAddTask()} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-500 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex items-center ml-1">
          <div className="flex items-center gap-1 px-3 py-1 bg-white border border-[#e0e3e6] border-b-white rounded-t text-[12px] text-slate-700 font-medium cursor-pointer relative -mb-px z-10">
            <span>Task Board</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-500" />
          </div>
          <button className="flex items-center gap-1 px-3 py-1 text-[12px] text-slate-500 hover:bg-slate-200/60 rounded-t transition-colors">
            <span>Summary</span>
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2 pr-2">
          {sortConfig && (
            <button
              onClick={() => setSortConfig(null)}
              className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
            >
              Sort: {COLUMN_DEFS[sortConfig.column]?.label} {sortConfig.direction === 'asc' ? '↑' : '↓'}
              <X className="w-3 h-3" />
            </button>
          )}
          {Object.keys(filterBarValues).filter(k => filterBarValues[Number(k)]).length > 0 && (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {Object.keys(filterBarValues).filter(k => filterBarValues[Number(k)]).length} filter(s) active
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {sortedTasks.length} rows × {COLUMN_DEFS.length} cols
          </span>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-[100] min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { icon: Scissors, label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
              { icon: Copy, label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
              { icon: Clipboard, label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
              { divider: true },
              { icon: Trash2, label: 'Delete values', shortcut: 'Del', action: 'delete' },
              { divider: true },
              { icon: Plus, label: 'Insert row above', action: 'insert_row_above' },
              { icon: Plus, label: 'Insert row below', action: 'insert_row_below' },
              { icon: Trash2, label: 'Delete row', action: 'delete_row' },
              { divider: true },
              { icon: SortAsc, label: 'Sort A → Z', action: 'sort_asc' },
              { icon: SortDesc, label: 'Sort Z → A', action: 'sort_desc' },
              { icon: X, label: 'Clear sort', action: 'clear_sort' },
              { divider: true },
              { icon: Eye, label: 'Insert note', action: 'add_note' },
              { icon: Lock, label: 'Protect range', action: 'protect' },
            ].map((item, i) => {
              if ('divider' in item && item.divider) return <div key={i} className="my-1 border-t border-slate-100" />;
              const Icon = item.icon!;
              return (
                <button
                  key={i}
                  onClick={() => handleContextAction(item.action!)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.shortcut && <span className="text-[10px] text-slate-400">{item.shortcut}</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter dropdown */}
      <AnimatePresence>
        {filterMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-[100] w-56"
            style={{ left: filterMenu.x, top: filterMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-semibold text-slate-600 mb-2">
              Filter {COLUMN_DEFS[filterMenu.col]?.label}
            </h4>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Type to filter..."
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400 mb-2"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilter(); }}
            />
            <div className="flex gap-1">
              <button onClick={applyFilter} className="flex-1 bg-blue-500 text-white text-xs py-1 rounded hover:bg-blue-600">
                Apply
              </button>
              <button onClick={() => { setFilterBarValues(prev => ({ ...prev, [filterMenu.col]: '' })); setFilterMenu(null); }} className="flex-1 bg-slate-100 text-slate-600 text-xs py-1 rounded hover:bg-slate-200">
                Clear
              </button>
            </div>
            {/* Show unique values */}
            <div className="mt-2 max-h-32 overflow-y-auto">
              {[...new Set(sortedTasks.map(t => String(t[COLUMN_DEFS[filterMenu.col]?.key as keyof Task] ?? '')))].filter(v => v).slice(0, 10).map((val) => (
                <button
                  key={val}
                  onClick={() => { setFilterValue(val); setFilterBarValues(prev => ({ ...prev, [filterMenu.col]: val })); setFilterMenu(null); }}
                  className="w-full text-left text-[11px] text-slate-600 px-2 py-1 hover:bg-slate-100 rounded truncate"
                >
                  {val}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
