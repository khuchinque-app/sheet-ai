import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  DollarSign, Percent, Minus, Paintbrush, Filter, ChevronDown,
  Plus, FunctionSquare, History, Redo2, Printer, ZoomIn, ZoomOut,
  Sigma, Link2, Image, Smile, ChevronRight, MoreHorizontal,
  Copy, Scissors, Clipboard, Trash2, ArrowUpDown, SortAsc, SortDesc,
  Eye, EyeOff, Lock, Unlock, Merge, WrapText, TextCursorInput
} from 'lucide-react';
import { Task } from '../types';
import { statusColors, priorityColors } from '../data';

interface DataGridProps {
  tasks: Task[];
  onUpdateTask: (id: number, field: string, value: string) => void;
  onAddTask: () => void;
}

// Column definitions mapped to spreadsheet columns
const COLUMN_DEFS = [
  { key: 'id' as keyof Task, label: 'ID', letter: 'A', width: 60 },
  { key: 'title' as keyof Task, label: 'Task', letter: 'B', width: 220 },
  { key: 'assignee' as keyof Task, label: 'Assignee', letter: 'C', width: 150 },
  { key: 'status' as keyof Task, label: 'Status', letter: 'D', width: 120 },
  { key: 'priority' as keyof Task, label: 'Priority', letter: 'E', width: 110 },
  { key: 'dueDate' as keyof Task, label: 'Due Date', letter: 'F', width: 110 },
  { key: 'category' as keyof Task, label: 'Category', letter: 'G', width: 120 },
  { key: 'notes' as keyof Task, label: 'Notes', letter: 'H', width: 200 },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function getColLetter(index: number): string {
  if (index < 26) return ALPHABET[index];
  return ALPHABET[Math.floor(index / 26) - 1] + ALPHABET[index % 26];
}

export default function DataGrid({ tasks, onUpdateTask, onAddTask }: DataGridProps) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ start: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; row: number; col: number } | null>(null);
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [sheetName] = useState('Task Board');
  const [showFormulas, setShowFormulas] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Sorted tasks
  const sortedTasks = useMemo(() => {
    if (sortColumn === null) return tasks;
    const key = COLUMN_DEFS[sortColumn]?.key;
    if (!key) return tasks;
    return [...tasks].sort((a, b) => {
      const aVal = String(a[key]);
      const bVal = String(b[key]);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortColumn, sortDir]);

  // Get cell value
  const getCellValue = (rowIndex: number, colIndex: number): string => {
    if (rowIndex >= sortedTasks.length) return '';
    const task = sortedTasks[rowIndex];
    const key = COLUMN_DEFS[colIndex]?.key;
    if (!key) return '';
    return String(task[key] ?? '');
  };

  // Get cell reference (like A1, B5)
  const getCellRef = (row: number, col: number): string => {
    return `${getColLetter(col)}${row + 1}`;
  };

  // Get formula bar content
  const getFormulaBarContent = (): string => {
    if (!selectedCell) return '';
    return getCellValue(selectedCell.row, selectedCell.col);
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number, e?: React.MouseEvent) => {
    if (e?.shiftKey && selectedCell) {
      setSelectedRange({ start: selectedCell, end: { row, col } });
    } else {
      setSelectedCell({ row, col });
      setSelectedRange(null);
    }
    setContextMenu(null);
  };

  // Handle cell double-click (edit mode)
  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setEditValue(getCellValue(row, col));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handle cell edit commit
  const commitEdit = () => {
    if (editingCell) {
      const task = sortedTasks[editingCell.row];
      const key = COLUMN_DEFS[editingCell.col]?.key;
      if (task && key) {
        onUpdateTask(task.id, key, editValue);
      }
    }
    setEditingCell(null);
  };

  // Handle cell edit cancel
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === 'Enter') {
        commitEdit();
        // Move down
        if (selectedCell && selectedCell.row < sortedTasks.length - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
        }
      } else if (e.key === 'Escape') {
        cancelEdit();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        commitEdit();
        if (selectedCell) {
          if (e.shiftKey && selectedCell.col > 0) {
            setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
          } else if (!e.shiftKey && selectedCell.col < COLUMN_DEFS.length - 1) {
            setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
          }
        }
      }
      return;
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
        {
          const task = sortedTasks[selectedCell.row];
          const key = COLUMN_DEFS[selectedCell.col]?.key;
          if (task && key) {
            onUpdateTask(task.id, key, '');
          }
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
        // Start typing to edit
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          setEditingCell({ row: selectedCell.row, col: selectedCell.col });
          setEditValue(e.key);
          setTimeout(() => inputRef.current?.focus(), 0);
        }
        break;
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    setSelectedCell({ row, col });
    setContextMenu({ x: e.clientX, y: e.clientY, row, col });
  };

  // Handle sort
  const handleSort = (colIndex: number) => {
    if (sortColumn === colIndex) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colIndex);
      setSortDir('asc');
    }
  };

  // Check if cell is in selected range
  const isInSelectedRange = (row: number, col: number): boolean => {
    if (!selectedRange) return false;
    const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
    const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
    const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
    const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // Check if cell is selected
  const isSelected = (row: number, col: number): boolean => {
    if (!selectedCell) return false;
    return selectedCell.row === row && selectedCell.col === col;
  };

  // Handle formula bar edit
  const handleFormulaBarChange = (value: string) => {
    if (selectedCell) {
      setEditingCell(selectedCell);
      setEditValue(value);
    }
  };

  // Render cell content with styling
  const renderCellContent = (row: number, col: number, value: string) => {
    const key = COLUMN_DEFS[col]?.key;

    switch (key) {
      case 'status':
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${statusColors[value] || ''}`}>
            {value}
          </span>
        );
      case 'priority':
        return (
          <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${priorityColors[value] || ''}`}>
            {value}
          </span>
        );
      case 'assignee':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
              {value.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <span className="truncate text-[12px]">{value}</span>
          </div>
        );
      case 'id':
        return <span className="text-slate-500 font-mono text-[11px]">{value}</span>;
      default:
        return <span className="truncate text-[12px]">{value}</span>;
    }
  };

  // Total width
  const totalWidth = COLUMN_DEFS.reduce((sum, col) => sum + col.width, 0);

  return (
    <div className="flex flex-col h-full bg-white" onKeyDown={handleKeyDown} tabIndex={0} style={{ outline: 'none' }}>
      {/* Toolbar - Google Sheets style */}
      <div className="bg-[#f9fbfd] border-b border-[#e0e3e6]">
        {/* Menu bar */}
        <div className="flex items-center px-2 py-1 gap-1 border-b border-[#e0e3e6]">
          <div className="flex items-center gap-1 mr-3">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded flex items-center justify-center">
              <Sigma className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 ml-1">{sheetName}</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Shared</span>
          </div>
          {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'].map((menu) => (
            <button key={menu} className="px-2 py-0.5 text-[12px] text-slate-600 hover:bg-slate-200/60 rounded transition-colors">
              {menu}
            </button>
          ))}
        </div>

        {/* Action toolbar */}
        <div className="flex items-center px-2 py-1 gap-0.5">
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <History className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Redo2 className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Printer className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button className="h-7 px-1.5 flex items-center gap-0.5 rounded hover:bg-slate-200/60 text-slate-600 text-[12px] transition-colors">
            <span className="text-[11px]">Arial</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="h-7 w-12 flex items-center border border-slate-300 rounded px-1">
            <span className="text-[11px] text-slate-600">10</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-auto" />
          </div>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Bold className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Italic className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <DollarSign className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Percent className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Paintbrush className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFormulas(!showFormulas)}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${showFormulas ? 'bg-slate-200 text-green-600' : 'hover:bg-slate-200/60 text-slate-600'}`}
          >
            <FunctionSquare className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1" />
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-600 w-8 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom(Math.min(200, zoom + 10))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-600 transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      <div className="flex items-center border-b border-[#e0e3e6] bg-white h-[29px]">
        {/* Cell reference */}
        <div className="flex items-center h-full px-2 border-r border-[#e0e3e6] min-w-[70px] bg-[#f9fbfd]">
          <span className="text-[12px] text-slate-600 font-mono">
            {selectedCell ? getCellRef(selectedCell.row, selectedCell.col) : ''}
          </span>
        </div>
        {/* fx icon */}
        <div className="flex items-center justify-center w-7 h-full border-r border-[#e0e3e6]">
          <span className="text-[12px] text-slate-400 italic font-serif">fx</span>
        </div>
        {/* Formula input */}
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
              value={getFormulaBarContent()}
              onChange={(e) => handleFormulaBarChange(e.target.value)}
              onFocus={(e) => {
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

      {/* Grid area */}
      <div ref={gridRef} className="flex-1 overflow-auto relative" onClick={() => setContextMenu(null)}>
        <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', minWidth: totalWidth + 50 }}>
          {/* Column headers */}
          <div className="sticky top-0 z-20 flex bg-[#f8f9fa] border-b border-[#e0e3e6]" style={{ minHeight: 26 }}>
            {/* Top-left corner (select all) */}
            <div
              className="sticky left-0 z-30 flex items-center justify-center border-r border-[#e0e3e6] bg-[#f8f9fa] cursor-pointer hover:bg-[#e8eaed] transition-colors"
              style={{ width: 46, minWidth: 46 }}
              onClick={() => {
                setSelectedRange({ start: { row: 0, col: 0 }, end: { row: sortedTasks.length - 1, col: COLUMN_DEFS.length - 1 } });
              }}
            >
              <div className="w-2.5 h-2.5 border border-slate-400 rounded-sm" />
            </div>
            {/* Column letters */}
            {COLUMN_DEFS.map((col, colIndex) => (
              <div
                key={col.letter}
                className={`flex items-center justify-center border-r border-[#e0e3e6] cursor-pointer select-none transition-colors relative group ${
                  selectedCell?.col === colIndex ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-[#e8eaed] text-slate-600'
                }`}
                style={{ width: col.width, minWidth: col.width, height: 26 }}
                onClick={() => handleSort(colIndex)}
              >
                <span className="text-[11px] font-medium">{col.letter}</span>
                {sortColumn === colIndex && (
                  <span className="ml-0.5 text-[9px]">
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
                {/* Filter indicator */}
                <div className="absolute bottom-0 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            ))}
            {/* Empty columns to fill space */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center justify-center border-r border-[#e0e3e6] text-slate-400"
                style={{ width: 100, minWidth: 100, height: 26 }}
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
                const cellIsSelected = isSelected(rowIndex, colIndex);
                const cellInRange = isInSelectedRange(rowIndex, colIndex);
                const cellIsEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;

                return (
                  <div
                    key={col.letter}
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${rowIndex}-${colIndex}`, el);
                    }}
                    className={`relative border-r border-b border-[#e0e3e6] overflow-hidden cursor-cell transition-colors ${
                      cellIsSelected
                        ? 'outline outline-[2px] outline-blue-500 z-[5] bg-white'
                        : cellInRange
                        ? 'bg-blue-50/60'
                        : 'bg-white hover:bg-blue-50/30'
                    }`}
                    style={{ width: col.width, minWidth: col.width, height: 24 }}
                    onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                  >
                    {!cellIsEditing && (
                      <div className="w-full h-full flex items-center px-1.5">
                        {renderCellContent(rowIndex, colIndex, value)}
                      </div>
                    )}
                    {/* Selection fill handle */}
                    {cellIsSelected && !editingCell && (
                      <div className="absolute -bottom-[3px] -right-[3px] w-[6px] h-[6px] bg-blue-500 border border-white cursor-crosshair z-10" />
                    )}
                  </div>
                );
              })}
              {/* Empty cells to fill */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={`empty-cell-${i}`}
                  className="border-r border-b border-[#e0e3e6] bg-white hover:bg-blue-50/30 cursor-cell"
                  style={{ width: 100, minWidth: 100, height: 24 }}
                  onClick={() => setSelectedCell({ row: rowIndex, col: COLUMN_DEFS.length + i })}
                />
              ))}
            </div>
          ))}

          {/* Empty rows below data */}
          {Array.from({ length: 30 }).map((_, rowIndex) => {
            const actualRow = sortedTasks.length + rowIndex;
            return (
              <div key={`empty-row-${rowIndex}`} className="flex" style={{ minHeight: 24 }}>
                <div
                  className="sticky left-0 z-10 flex items-center justify-center border-r border-b border-[#e0e3e6] bg-[#f8f9fa] text-[11px] text-slate-400 select-none"
                  style={{ width: 46, minWidth: 46, height: 24 }}
                >
                  {actualRow + 1}
                </div>
                {COLUMN_DEFS.map((col) => (
                  <div
                    key={col.letter}
                    className="border-r border-b border-[#e0e3e6] bg-white hover:bg-blue-50/30 cursor-cell"
                    style={{ width: col.width, minWidth: col.width, height: 24 }}
                    onClick={() => setSelectedCell({ row: actualRow, col: COLUMN_DEFS.indexOf(col) })}
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`empty-cell-${i}`}
                    className="border-r border-b border-[#e0e3e6] bg-white hover:bg-blue-50/30 cursor-cell"
                    style={{ width: 100, minWidth: 100, height: 24 }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center border-t border-[#e0e3e6] bg-[#f8f9fa] h-[32px] px-1">
        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-200/60 text-slate-500 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex items-center ml-1">
          <div className="flex items-center gap-1 px-3 py-1 bg-white border border-[#e0e3e6] border-b-white rounded-t text-[12px] text-slate-700 font-medium cursor-pointer relative -mb-px z-10">
            <span>{sheetName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-500" />
          </div>
          <button className="flex items-center gap-1 px-3 py-1 text-[12px] text-slate-500 hover:bg-slate-200/60 rounded-t transition-colors">
            <span>Summary</span>
          </button>
          <button className="flex items-center justify-center w-6 h-6 text-slate-400 hover:bg-slate-200/60 rounded transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1 pr-2">
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
            className="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-[100] min-w-[180px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {[
              { icon: Scissors, label: 'Cut', shortcut: 'Ctrl+X' },
              { icon: Copy, label: 'Copy', shortcut: 'Ctrl+C' },
              { icon: Clipboard, label: 'Paste', shortcut: 'Ctrl+V' },
              { divider: true },
              { icon: Trash2, label: 'Delete values', shortcut: 'Del' },
              { divider: true },
              { icon: ArrowUpDown, label: 'Sort A → Z', action: () => { setSortColumn(contextMenu.col); setSortDir('asc'); } },
              { icon: ArrowUpDown, label: 'Sort Z → A', action: () => { setSortColumn(contextMenu.col); setSortDir('desc'); } },
              { divider: true },
              { icon: Eye, label: 'Insert note' },
              { icon: Lock, label: 'Protect range' },
            ].map((item, i) => {
              if ('divider' in item) {
                return <div key={i} className="my-1 border-t border-slate-100" />;
              }
              const Icon = item.icon!;
              return (
                <button
                  key={i}
                  onClick={() => { item.action?.(); setContextMenu(null); }}
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
    </div>
  );
}
