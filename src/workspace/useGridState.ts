import { useState, useCallback, useRef } from 'react';
import { Task } from '../types';
import { GridAction, CellStyle, CellNote, SortConfig, FilterCondition } from './types';

interface UseGridStateReturn {
  tasks: Task[];
  styles: Record<string, CellStyle>;
  notes: Record<string, CellNote>;
  protectedCells: Record<string, boolean>;
  sortConfig: SortConfig;
  filters: FilterCondition[];
  
  // Actions
  updateCell: (rowIndex: number, colKey: string, value: string) => void;
  addRow: () => void;
  deleteRow: (rowIndex: number) => void;
  insertRowAt: (rowIndex: number) => void;
  setCellStyle: (row: number, col: number, style: Partial<CellStyle>) => void;
  setCellNote: (row: number, col: number, note: CellNote | null) => void;
  toggleCellProtection: (row: number, col: number) => void;
  setSort: (config: SortConfig) => void;
  addFilter: (filter: FilterCondition) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Bulk operations
  batchUpdate: (updates: { rowIndex: number; colKey: string; value: string }[]) => void;
  clearRange: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
}

export function useGridState(initialTasks: Task[]): UseGridStateReturn {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [styles, setStyles] = useState<Record<string, CellStyle>>({});
  const [notes, setNotes] = useState<Record<string, CellNote>>({});
  const [protectedCells, setProtectedCells] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  
  // History for undo/redo
  const historyRef = useRef<GridAction[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushAction = useCallback((action: GridAction) => {
    // Remove any redo history
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(action);
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const updateCell = useCallback((rowIndex: number, colKey: string, value: string) => {
    setTasks(prev => {
      const task = prev[rowIndex];
      if (!task) return prev;
      
      const oldValue = String(task[colKey as keyof Task] ?? '');
      
      // Push to history
      pushAction({
        type: 'edit',
        before: { rowIndex, colKey, value: oldValue },
        after: { rowIndex, colKey, value },
        timestamp: Date.now()
      });
      
      return prev.map((t, i) => 
        i === rowIndex ? { ...t, [colKey]: value } : t
      );
    });
  }, [pushAction]);

  const addRow = useCallback(() => {
    setTasks(prev => {
      const maxId = Math.max(...prev.map(t => t.id), 0);
      const newTask: Task = {
        id: maxId + 1,
        title: '',
        assignee: '',
        status: 'Not Started',
        priority: 'Medium',
        dueDate: '',
        category: '',
        notes: ''
      };
      
      pushAction({
        type: 'insert_row',
        before: { length: prev.length },
        after: { length: prev.length + 1, task: newTask },
        timestamp: Date.now()
      });
      
      return [...prev, newTask];
    });
  }, [pushAction]);

  const deleteRow = useCallback((rowIndex: number) => {
    setTasks(prev => {
      const task = prev[rowIndex];
      if (!task) return prev;
      
      pushAction({
        type: 'delete_row',
        before: { rowIndex, task },
        after: { length: prev.length - 1 },
        timestamp: Date.now()
      });
      
      return prev.filter((_, i) => i !== rowIndex);
    });
  }, [pushAction]);

  const insertRowAt = useCallback((rowIndex: number) => {
    setTasks(prev => {
      const maxId = Math.max(...prev.map(t => t.id), 0);
      const newTask: Task = {
        id: maxId + 1,
        title: '',
        assignee: '',
        status: 'Not Started',
        priority: 'Medium',
        dueDate: '',
        category: '',
        notes: ''
      };
      
      pushAction({
        type: 'insert_row',
        before: { length: prev.length },
        after: { rowIndex, task: newTask },
        timestamp: Date.now()
      });
      
      const newTasks = [...prev];
      newTasks.splice(rowIndex, 0, newTask);
      return newTasks;
    });
  }, [pushAction]);

  const setCellStyle = useCallback((row: number, col: number, style: Partial<CellStyle>) => {
    const key = `${row}-${col}`;
    setStyles(prev => {
      const oldStyle = prev[key] || {};
      const newStyle = { ...oldStyle, ...style };
      
      pushAction({
        type: 'style',
        before: { key, style: oldStyle },
        after: { key, style: newStyle },
        timestamp: Date.now()
      });
      
      return { ...prev, [key]: newStyle };
    });
  }, [pushAction]);

  const setCellNote = useCallback((row: number, col: number, note: CellNote | null) => {
    const key = `${row}-${col}`;
    setNotes(prev => {
      const oldNote = prev[key] || null;
      
      pushAction({
        type: 'edit',
        before: { key, note: oldNote },
        after: { key, note },
        timestamp: Date.now()
      });
      
      if (note === null) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: note };
    });
  }, [pushAction]);

  const toggleCellProtection = useCallback((row: number, col: number) => {
    const key = `${row}-${col}`;
    setProtectedCells(prev => {
      const wasProtected = prev[key] || false;
      
      pushAction({
        type: 'style',
        before: { key, protected: wasProtected },
        after: { key, protected: !wasProtected },
        timestamp: Date.now()
      });
      
      return { ...prev, [key]: !wasProtected };
    });
  }, [pushAction]);

  const setSort = useCallback((config: SortConfig) => {
    setSortConfig(config);
  }, []);

  const addFilter = useCallback((filter: FilterCondition) => {
    setFilters(prev => [...prev, filter]);
  }, []);

  const removeFilter = useCallback((index: number) => {
    setFilters(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const batchUpdate = useCallback((updates: { rowIndex: number; colKey: string; value: string }[]) => {
    setTasks(prev => {
      const beforeState = updates.map(u => ({
        rowIndex: u.rowIndex,
        colKey: u.colKey,
        value: String(prev[u.rowIndex]?.[u.colKey as keyof Task] ?? '')
      }));
      
      pushAction({
        type: 'edit',
        before: beforeState,
        after: updates,
        timestamp: Date.now()
      });
      
      const newTasks = [...prev];
      updates.forEach(u => {
        if (newTasks[u.rowIndex]) {
          newTasks[u.rowIndex] = { ...newTasks[u.rowIndex], [u.colKey]: u.value };
        }
      });
      return newTasks;
    });
  }, [pushAction]);

  const clearRange = useCallback((startRow: number, startCol: number, endRow: number, endCol: number) => {
    setTasks(prev => {
      const columnKeys = ['id', 'title', 'assignee', 'status', 'priority', 'dueDate', 'category', 'notes'];
      const beforeState: any[] = [];
      const afterState: any[] = [];
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const colKey = columnKeys[c];
          if (colKey && prev[r]) {
            beforeState.push({ rowIndex: r, colKey, value: String(prev[r][colKey as keyof Task] ?? '') });
            afterState.push({ rowIndex: r, colKey, value: '' });
          }
        }
      }
      
      pushAction({
        type: 'delete',
        before: beforeState,
        after: afterState,
        timestamp: Date.now()
      });
      
      const newTasks = prev.map((task, rowIndex) => {
        if (rowIndex >= startRow && rowIndex <= endRow) {
          const newTask = { ...task };
          for (let c = startCol; c <= endCol; c++) {
            const colKey = columnKeys[c];
            if (colKey) {
              (newTask as any)[colKey] = '';
            }
          }
          return newTask;
        }
        return task;
      });
      
      return newTasks;
    });
  }, [pushAction]);

  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    
    const action = historyRef.current[historyIndexRef.current];
    historyIndexRef.current--;
    setCanUndo(historyIndexRef.current >= 0);
    setCanRedo(true);
    
    // Apply inverse of action
    if (action.type === 'edit') {
      const before = action.before as any;
      if (Array.isArray(before)) {
        // Batch edit
        setTasks(prev => {
          const newTasks = [...prev];
          before.forEach((b: any) => {
            if (newTasks[b.rowIndex]) {
              newTasks[b.rowIndex] = { ...newTasks[b.rowIndex], [b.colKey]: b.value };
            }
          });
          return newTasks;
        });
      } else {
        // Single edit
        setTasks(prev => prev.map((t, i) => 
          i === before.rowIndex ? { ...t, [before.colKey]: before.value } : t
        ));
      }
    } else if (action.type === 'insert_row') {
      const after = action.after as any;
      if (after.rowIndex !== undefined) {
        setTasks(prev => prev.filter((_, i) => i !== after.rowIndex));
      } else {
        setTasks(prev => prev.slice(0, -1));
      }
    } else if (action.type === 'delete_row') {
      const before = action.before as any;
      setTasks(prev => {
        const newTasks = [...prev];
        newTasks.splice(before.rowIndex, 0, before.task);
        return newTasks;
      });
    } else if (action.type === 'style') {
      const before = action.before as any;
      setStyles(prev => {
        if (before.style && Object.keys(before.style).length > 0) {
          return { ...prev, [before.key]: before.style };
        }
        const { [before.key]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    
    historyIndexRef.current++;
    const action = historyRef.current[historyIndexRef.current];
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    
    // Apply action
    if (action.type === 'edit') {
      const after = action.after as any;
      if (Array.isArray(after)) {
        setTasks(prev => {
          const newTasks = [...prev];
          after.forEach((a: any) => {
            if (newTasks[a.rowIndex]) {
              newTasks[a.rowIndex] = { ...newTasks[a.rowIndex], [a.colKey]: a.value };
            }
          });
          return newTasks;
        });
      } else {
        setTasks(prev => prev.map((t, i) => 
          i === after.rowIndex ? { ...t, [after.colKey]: after.value } : t
        ));
      }
    } else if (action.type === 'insert_row') {
      const after = action.after as any;
      if (after.task) {
        setTasks(prev => {
          if (after.rowIndex !== undefined) {
            const newTasks = [...prev];
            newTasks.splice(after.rowIndex, 0, after.task);
            return newTasks;
          }
          return [...prev, after.task];
        });
      }
    } else if (action.type === 'delete_row') {
      const before = action.before as any;
      setTasks(prev => prev.filter((_, i) => i !== before.rowIndex));
    } else if (action.type === 'style') {
      const after = action.after as any;
      setStyles(prev => {
        if (after.style && Object.keys(after.style).length > 0) {
          return { ...prev, [after.key]: after.style };
        }
        const { [after.key]: _, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  return {
    tasks,
    styles,
    notes,
    protectedCells,
    sortConfig,
    filters,
    updateCell,
    addRow,
    deleteRow,
    insertRowAt,
    setCellStyle,
    setCellNote,
    toggleCellProtection,
    setSort,
    addFilter,
    removeFilter,
    clearFilters,
    undo,
    redo,
    canUndo,
    canRedo,
    batchUpdate,
    clearRange
  };
}
