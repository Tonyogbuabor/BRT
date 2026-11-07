import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AUTHORITATIVE_COLUMNS, matchColumn, normaliseHeader } from './schemaRegistry';
import { ColumnDefinition } from '../types/schema';

export interface ParsedFileResult {
  fileName: string;
  fileSize: number;
  totalRows: number;
  rawHeaders: string[];
  rawRows: any[];
  sheets?: string[];
  selectedSheet?: string;
}

export interface ColumnMappingItem {
  rawHeader: string;
  mappedKey: string | null;
  targetColumn: ColumnDefinition | null;
  confidence: number;
  manualOverride: boolean;
}

/**
 * Parses any supported file format (.csv, .tsv, .txt, .xlsx, .xls, .ods, .json, .ndjson)
 */
export async function parseUploadedFile(file: File, sheetName?: string): Promise<ParsedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(extension)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheets = workbook.SheetNames;
    const targetSheet = sheetName && sheets.includes(sheetName) ? sheetName : sheets[0];
    const worksheet = workbook.Sheets[targetSheet];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
    
    const rawHeaders: string[] = json.length > 0 ? Object.keys(json[0]) : [];
    return {
      fileName: file.name,
      fileSize: file.size,
      totalRows: json.length,
      rawHeaders,
      rawRows: json,
      sheets,
      selectedSheet: targetSheet
    };
  }

  if (['json', 'ndjson'].includes(extension)) {
    const text = await file.text();
    let rows: any[] = [];
    if (extension === 'ndjson' || text.trim().startsWith('{') && text.includes('\n{')) {
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      rows = lines.map(line => JSON.parse(line));
    } else {
      const parsed = JSON.parse(text);
      rows = Array.isArray(parsed) ? parsed : (parsed.data || parsed.records || parsed.customers || []);
    }
    const rawHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
    return {
      fileName: file.name,
      fileSize: file.size,
      totalRows: rows.length,
      rawHeaders,
      rawRows: rows
    };
  }

  // Default: CSV, TSV, TXT with PapaParse
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (results) => {
        const rawHeaders = (results.meta.fields || []).map(h => h.replace(/^\uFEFF/, '').trim());
        resolve({
          fileName: file.name,
          fileSize: file.size,
          totalRows: results.data.length,
          rawHeaders,
          rawRows: results.data as any[]
        });
      },
      error: (err: any) => reject(err)
    });
  });
}

/**
 * Builds automated column mappings with confidence scores
 */
export function buildAutoColumnMappings(rawHeaders: string[]): ColumnMappingItem[] {
  return rawHeaders.map(rawHeader => {
    const cleanHeader = rawHeader.replace(/^\uFEFF/, '').trim();
    const { col, confidence } = matchColumn(cleanHeader);
    return {
      rawHeader: cleanHeader,
      mappedKey: col ? col.key : null,
      targetColumn: col,
      confidence,
      manualOverride: false
    };
  });
}

/**
 * Download blank CSV template with all 38 authoritative headers
 */
export function downloadBlankCsvTemplate(): void {
  const headers = AUTHORITATIVE_COLUMNS.map(c => `"${c.name}"`).join(',');
  const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BritConnect_Customer_Data_Template_38_Columns.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download blank XLSX template with all 38 authoritative headers
 */
export function downloadBlankXlsxTemplate(): void {
  const headers = AUTHORITATIVE_COLUMNS.map(c => c.name);
  const sampleRow = AUTHORITATIVE_COLUMNS.map(c => {
    if (c.type === 'Whole Number') return 0;
    if (c.type === 'Decimal Number') return 0.0;
    if (c.type === 'Date') return '2026-01-01';
    return 'Sample Text';
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  // Set column widths
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 15) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customer Data');
  XLSX.writeFile(wb, 'BritConnect_Customer_Data_Template.xlsx');
}

/**
 * Download authoritative Data Dictionary CSV
 */
export function downloadDataDictionaryCsv(): void {
  const rows = [
    ['No.', 'Column Name', 'Data Type', 'Description']
  ];
  for (const c of AUTHORITATIVE_COLUMNS) {
    rows.push([c.index.toString(), c.name, c.type, `"${c.description.replace(/"/g, '""')}"`]);
  }
  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'BritConnect_Data_Dictionary.csv';
  a.click();
  URL.revokeObjectURL(url);
}
