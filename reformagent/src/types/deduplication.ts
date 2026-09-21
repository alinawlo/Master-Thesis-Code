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
  const row: string[] = [];
  let inQuotes = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  row.push(currentVal);
  return row;
}
