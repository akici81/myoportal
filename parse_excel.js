const ExcelJS = require('exceljs');
const path = require('path');

async function readExcel() {
  const filePath = "C:\\Users\\enisa\\Desktop\\2025-2026 Bahar Dönemi MYO Ders Programı (1).xlsx";
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.worksheets[0];
  console.log(`Sheet Name: ${sheet.name}`);
  
  let rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 20) {
      rows.push(row.values);
    }
  });
  
  console.log(JSON.stringify(rows, null, 2));
}

readExcel().catch(console.error);
