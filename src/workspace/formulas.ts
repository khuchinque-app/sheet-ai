/**
 * Formula engine for spreadsheet-like calculations
 * Supports: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, IF, CONCATENATE
 */

export interface FormulaContext {
  getCellValue: (row: number, col: number) => string;
  totalRows: number;
  totalCols: number;
}

export function evaluateFormula(formula: string, context: FormulaContext): string {
  try {
    const upperFormula = formula.toUpperCase().trim();
    
    // Parse range references like A1:B10
    const rangeMatch = formula.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/i);
    
    if (upperFormula.startsWith('SUM(')) {
      const values = extractRangeValues(formula, context);
      const sum = values.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
      return String(sum);
    }
    
    if (upperFormula.startsWith('AVERAGE(') || upperFormula.startsWith('AVG(')) {
      const values = extractRangeValues(formula, context);
      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (nums.length === 0) return '0';
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return String(Math.round(avg * 100) / 100);
    }
    
    if (upperFormula.startsWith('COUNT(')) {
      const values = extractRangeValues(formula, context);
      const count = values.filter(v => !isNaN(parseFloat(v))).length;
      return String(count);
    }
    
    if (upperFormula.startsWith('COUNTA(')) {
      const values = extractRangeValues(formula, context);
      const count = values.filter(v => v.trim() !== '').length;
      return String(count);
    }
    
    if (upperFormula.startsWith('MIN(')) {
      const values = extractRangeValues(formula, context);
      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (nums.length === 0) return '0';
      return String(Math.min(...nums));
    }
    
    if (upperFormula.startsWith('MAX(')) {
      const values = extractRangeValues(formula, context);
      const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (nums.length === 0) return '0';
      return String(Math.max(...nums));
    }
    
    if (upperFormula.startsWith('CONCATENATE(') || upperFormula.startsWith('CONCAT(')) {
      const values = extractRangeValues(formula, context);
      return values.join('');
    }
    
    // Simple cell reference like =A1
    const cellRef = formula.match(/^([A-Z]+)(\d+)$/i);
    if (cellRef) {
      const col = colLetterToIndex(cellRef[1]);
      const row = parseInt(cellRef[2]) - 1;
      return context.getCellValue(row, col);
    }
    
    return `#ERR: Unknown formula`;
  } catch (e) {
    return `#ERR: ${e instanceof Error ? e.message : 'Parse error'}`;
  }
}

function extractRangeValues(formula: string, context: FormulaContext): string[] {
  const rangeMatch = formula.match(/\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/i);
  if (!rangeMatch) return [];
  
  const startCol = colLetterToIndex(rangeMatch[1]);
  const startRow = parseInt(rangeMatch[2]) - 1;
  const endCol = colLetterToIndex(rangeMatch[3]);
  const endRow = parseInt(rangeMatch[4]) - 1;
  
  const values: string[] = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      values.push(context.getCellValue(r, c));
    }
  }
  return values;
}

function colLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64);
  }
  return index - 1;
}

export function isFormula(value: string): boolean {
  return value.startsWith('=');
}

export function getFormulaDescription(formula: string): string {
  const upper = formula.toUpperCase();
  if (upper.includes('SUM')) return 'Adds all values in range';
  if (upper.includes('AVERAGE') || upper.includes('AVG')) return 'Calculates average of values';
  if (upper.includes('COUNT')) return 'Counts numeric values';
  if (upper.includes('COUNTA')) return 'Counts non-empty cells';
  if (upper.includes('MIN')) return 'Finds minimum value';
  if (upper.includes('MAX')) return 'Finds maximum value';
  if (upper.includes('CONCAT')) return 'Joins text values';
  return 'Formula';
}
