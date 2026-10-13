import { useCallback, useRef } from 'react';
import { CellRange, CellPosition } from './types';

interface ClipboardData {
  values: string[][];
  range: CellRange;
  cut: boolean;
}

interface UseClipboardReturn {
  copy: (range: CellRange, getCellValue: (row: number, col: number) => string) => void;
  cut: (range: CellRange, getCellValue: (row: number, col: number) => string) => void;
  paste: (position: CellPosition, onPaste: (row: number, col: number, value: string) => void) => void;
  hasData: boolean;
}

export function useClipboard(): UseClipboardReturn {
  const clipboardRef = useRef<ClipboardData | null>(null);

  const copy = useCallback((range: CellRange, getCellValue: (row: number, col: number) => string) => {
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);

    const values: string[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = minCol; c <= maxCol; c++) {
        row.push(getCellValue(r, c));
      }
      values.push(row);
    }

    clipboardRef.current = { values, range, cut: false };

    // Also copy to system clipboard as TSV
    const tsv = values.map(row => row.join('\t')).join('\n');
    navigator.clipboard?.writeText(tsv).catch(() => {});
  }, []);

  const cut = useCallback((range: CellRange, getCellValue: (row: number, col: number) => string) => {
    copy(range, getCellValue);
    if (clipboardRef.current) {
      clipboardRef.current.cut = true;
    }
  }, [copy]);

  const paste = useCallback((position: CellPosition, onPaste: (row: number, col: number, value: string) => void) => {
    // Try system clipboard first
    navigator.clipboard?.readText().then(text => {
      if (text) {
        const rows = text.split('\n').filter(r => r.length > 0);
        const values = rows.map(row => row.split('\t'));
        
        values.forEach((row, rIdx) => {
          row.forEach((value, cIdx) => {
            onPaste(position.row + rIdx, position.col + cIdx, value);
          });
        });
      }
    }).catch(() => {
      // Fallback to internal clipboard
      if (clipboardRef.current) {
        const { values } = clipboardRef.current;
        values.forEach((row, rIdx) => {
          row.forEach((value, cIdx) => {
            onPaste(position.row + rIdx, position.col + cIdx, value);
          });
        });
      }
    });
  }, []);

  return {
    copy,
    cut,
    paste,
    hasData: clipboardRef.current !== null
  };
}
