// Leitura de CSV/XLSX para linhas { cabeçalho: valor }. Executa apenas no servidor.
import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface Sheet {
  headers: string[];
  rows: Record<string, unknown>[];
}

export function readCsv(text: string): Sheet {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const res = Papa.parse<Record<string, unknown>>(clean, { header: true, skipEmptyLines: "greedy", delimiter, transformHeader: (h) => h.trim() });
  return { headers: res.meta.fields ?? [], rows: res.data };
}

export async function readXlsx(buf: ArrayBuffer): Promise<Sheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return { headers: [], rows: [] };
  const headers: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (c, col) => (headers[col - 1] = String(cellValue(c.value) ?? "").trim()));
  const rows: Record<string, unknown>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => h && (obj[h] = cellValue(row.getCell(i + 1).value)));
    rows.push(obj);
  });
  return { headers: headers.filter(Boolean), rows };
}

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== "object") return v;
  if ("result" in v) return (v as ExcelJS.CellFormulaValue).result ?? null;
  if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
  if ("text" in v) return (v as ExcelJS.CellHyperlinkValue).text;
  return String(v);
}

export async function readSheet(name: string, buf: ArrayBuffer): Promise<Sheet> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return readXlsx(buf);
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
    return readCsv(text);
  }
  throw new Error("Formato não suportado. Use .xlsx ou .csv (arquivos .xls antigos: abra no Excel e salve como .xlsx).");
}
