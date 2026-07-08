import * as XLSX from 'xlsx';
import path from 'path';

const filePath = path.resolve('..', 'doc', 'dieta_2026-07-08 (2).xlsx');
const wb = XLSX.readFile(filePath);

console.log('Abas (sheets):', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  console.log(`\n===== ABA: "${sheetName}" =====`);
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`Linha ${i}:`, JSON.stringify(row));
  });
  console.log(`Total de linhas: ${rows.length}`);
});
