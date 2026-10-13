import { CellStyle } from './types';

export function formatCellValue(value: string, style?: CellStyle): string {
  if (!value) return '';
  
  if (!style?.format || style.format === 'plain') {
    return value;
  }

  switch (style.format) {
    case 'currency': {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return value;
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'percent': {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return value;
      // If value is like "50", treat as 50%. If "0.5", treat as 50%
      const percent = num > 1 ? num : num * 100;
      return `${percent.toFixed(0)}%`;
    }
    case 'date': {
      // Try to parse and format date
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    default:
      return value;
  }
}

export function parseFormulaInput(value: string): { isFormula: boolean; formula: string; rawValue: string } {
  if (value.startsWith('=')) {
    return { isFormula: true, formula: value.slice(1), rawValue: value };
  }
  return { isFormula: false, formula: '', rawValue: value };
}

export function getCellTextStyle(style?: CellStyle): React.CSSProperties {
  if (!style) return {};
  
  const css: React.CSSProperties = {};
  
  if (style.bold) css.fontWeight = 'bold';
  if (style.italic) css.fontStyle = 'italic';
  if (style.underline) css.textDecoration = 'underline';
  if (style.align) css.textAlign = style.align;
  if (style.fontSize) css.fontSize = `${style.fontSize}px`;
  if (style.fontFamily) css.fontFamily = style.fontFamily;
  if (style.textColor) css.color = style.textColor;
  if (style.bgColor) css.backgroundColor = style.bgColor;
  
  return css;
}

export function getCellContainerStyle(style?: CellStyle): React.CSSProperties {
  if (!style) return {};
  
  const css: React.CSSProperties = {};
  
  if (style.bgColor) css.backgroundColor = style.bgColor;
  if (style.align) css.textAlign = style.align;
  
  return css;
}

export function detectCellFormat(value: string): 'currency' | 'percent' | 'date' | 'plain' {
  if (!value) return 'plain';
  
  // Currency detection
  if (/^\$[\d,]+\.?\d*$/.test(value) || /^[\d,]+\.?\d*$/.test(value) && value.includes('$')) {
    return 'currency';
  }
  
  // Percent detection
  if (/^\d+\.?\d*%$/.test(value)) {
    return 'percent';
  }
  
  // Date detection
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) {
    return 'date';
  }
  
  return 'plain';
}
