export interface Proposal {
  vorschlag: string;
  verbatim: string;
  quelldokument: string;
  seitennummer: string;
  kategorie: string;
  verarbeitungsdatum: string;
}

export interface ExistingProposal extends Proposal {
  file: string;
  rowIndex: number;
}

export interface DuplicateMatch {
  incoming: Proposal;
  existing: ExistingProposal;
  similarity: number;
  existingFile: string;
  existingRowIndex: number;
}

export interface CheckDuplicatesResult {
  duplicates: DuplicateMatch[];
  unique: Proposal[];
}

export function escapeCsvField(field: string): string {
  if (field === undefined || field === null) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvLine(line: string): string[] {
  const rows = parseCsvRows(line);
  return rows[0] || [];
}

export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++;
      }
      currentRow.push(currentVal);
      currentVal = '';
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

