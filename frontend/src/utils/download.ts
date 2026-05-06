export function sanitizeFileName(fileName: string): string {
  const trimmedName = fileName.trim();
  if (!trimmedName) {
    return 'download';
  }

  return trimmedName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

export function downloadBlob(blob: Blob, fileName: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('File download is not supported in this environment');
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = sanitizeFileName(fileName);
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

type CsvCellValue = string | number | boolean | null | undefined;

const CSV_FORMULA_PATTERN = /^[=+\-@]/;

export function sanitizeCsvCellValue(value: CsvCellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (typeof value !== 'string') {
    return normalized;
  }

  const trimmedStart = normalized.trimStart();
  if (trimmedStart && CSV_FORMULA_PATTERN.test(trimmedStart)) {
    return `'${normalized}`;
  }

  if (/^[\t\n\r]/.test(normalized)) {
    return `'${normalized}`;
  }

  return normalized;
}

export function escapeCsvCell(value: CsvCellValue): string {
  return `"${sanitizeCsvCellValue(value).replace(/"/g, '""')}"`;
}

export function buildCsvContent(rows: CsvCellValue[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');
}

export function downloadCsvFile(csvContent: string, fileName: string): void {
  const csvWithBom = `\uFEFF${csvContent}`;
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, fileName);
}
