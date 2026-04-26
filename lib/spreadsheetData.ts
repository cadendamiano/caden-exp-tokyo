import type { Bill, Vendor } from './data';

export type SpreadsheetSheet = {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
};

export type SpreadsheetData = {
  sheets: SpreadsheetSheet[];
};

// CellValueType: STRING = 1, NUMBER = 2 (Univer enum)
const T_STRING = 1;
const T_NUMBER = 2;

const CURRENCY_PATTERN = '"$"#,##0.00';

const HEADER_STYLE = {
  bl: 1,
  bg: { rgb: '#F0F4F8' },
  bd: { b: { s: 1, cl: { rgb: '#CBD5E0' } } },
};

function isCurrencyHeader(header: string): boolean {
  const lc = header.toLowerCase();
  return lc.includes('amount') || lc.includes('total') || lc.includes('balance') ||
         lc.includes('cost') || lc.includes('price') || lc.includes('revenue') ||
         lc.includes('spend') || lc.includes('budget') || lc.includes('paid');
}

export function transformToUniver(dataJson: string): object {
  const data: SpreadsheetData = JSON.parse(dataJson);
  const sheets: Record<string, object> = {};
  const sheetOrder: string[] = [];

  data.sheets.forEach((sheet, idx) => {
    const sheetId = `sheet_${idx}`;
    sheetOrder.push(sheetId);

    const cellData: Record<number, Record<number, object>> = {};

    // Row 0: headers
    cellData[0] = {};
    sheet.headers.forEach((header, col) => {
      cellData[0][col] = { v: header, t: T_STRING, s: HEADER_STYLE };
    });

    // Rows 1+: data
    sheet.rows.forEach((row, rowIdx) => {
      const r = rowIdx + 1;
      cellData[r] = {};
      row.forEach((cell, col) => {
        const isNum = typeof cell === 'number';
        const isCurrency = isNum && isCurrencyHeader(sheet.headers[col] ?? '');
        cellData[r][col] = {
          v: cell ?? '',
          t: isNum ? T_NUMBER : T_STRING,
          ...(isCurrency ? { n: { pattern: CURRENCY_PATTERN } } : {}),
        };
      });
    });

    sheets[sheetId] = {
      id: sheetId,
      name: sheet.name,
      tabColor: '',
      hidden: 0,
      rowCount: Math.max(sheet.rows.length + 2, 100),
      columnCount: Math.max(sheet.headers.length + 2, 26),
      defaultRowHeight: 24,
      defaultColumnWidth: 130,
      showGridlines: 1,
      cellData,
    };
  });

  return {
    id: `wb_${Date.now()}`,
    name: 'Spreadsheet',
    appVersion: '0.0.1',
    locale: 'enUS',
    styles: {},
    sheetOrder,
    sheets,
  };
}

export function billsToSpreadsheetJson(bills: Bill[], vendors: Vendor[]): string {
  const vendorMap = new Map(vendors.map(v => [v.id, v]));

  const headers = ['Vendor', 'Invoice', 'PO Ref', 'Due Date', 'Terms', 'Status', 'Amount'];
  const rows: (string | number)[][] = bills.map(bill => {
    const vendor = vendorMap.get(bill.vendor);
    return [
      vendor?.name ?? bill.vendor,
      bill.invoice,
      bill.poRef,
      bill.due,
      vendor?.terms ?? '',
      bill.status,
      bill.amount,
    ];
  });

  const data: SpreadsheetData = {
    sheets: [{ name: 'Open AP', headers, rows }],
  };
  return JSON.stringify(data);
}
