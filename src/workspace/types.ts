export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  format?: 'plain' | 'currency' | 'percent' | 'date';
  bgColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface CellNote {
  text: string;
  author: string;
  timestamp: Date;
}

export interface GridAction {
  type: 'edit' | 'delete' | 'paste' | 'insert_row' | 'delete_row' | 'insert_col' | 'delete_col' | 'style' | 'sort' | 'filter';
  before: unknown;
  after: unknown;
  position?: CellPosition;
  timestamp: number;
}

export interface ColumnDef {
  key: string;
  label: string;
  letter: string;
  width: number;
  type: 'text' | 'number' | 'date' | 'select' | 'email';
  options?: string[];
}

export interface SheetData {
  id: string;
  name: string;
  rows: Record<string, string | number | boolean>[];
  columnDefs: ColumnDef[];
  styles: Record<string, CellStyle>; // key: "row-col"
  notes: Record<string, CellNote>;
  protected: Record<string, boolean>;
  columnOrder: string[];
  frozenRows: number;
  frozenCols: number;
}

export interface FilterCondition {
  column: number;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater' | 'less' | 'empty' | 'not_empty';
  value: string;
}

export type SortConfig = {
  column: number;
  direction: 'asc' | 'desc';
} | null;
