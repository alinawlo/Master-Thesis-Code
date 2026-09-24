import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from '@huggingface/transformers';
import { 
  Proposal, 
  ExistingProposal, 
  DuplicateMatch, 
  CheckDuplicatesResult, 
  parseCsvLine, 
  parseCsvRows,
  escapeCsvField 
} from '../types/deduplication';

export type { 
  Proposal, 
  ExistingProposal, 
  DuplicateMatch, 
  CheckDuplicatesResult 
};
export {
  parseCsvLine, 
  parseCsvRows,
  escapeCsvField 
};

export const EMBEDDING_MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
export const EMBEDDING_DIMENSION = 384;

let embeddingPipelinePromise: Promise<any> | null = null;

async function getEmbeddingPipeline() {
  if (!embeddingPipelinePromise) {
    console.log(`[ragDeduplication] Initializing local multilingual embedding model: ${EMBEDDING_MODEL_NAME}`);
    embeddingPipelinePromise = pipeline('feature-extraction', EMBEDDING_MODEL_NAME, {
      dtype: 'fp32'
    });
  }
  return embeddingPipelinePromise;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hashText(text: string): string {
  return crypto.createHash('sha256').update((text || '').trim().toLowerCase()).digest('hex');
}

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const extractor = await getEmbeddingPipeline();
    const output = await extractor(text.trim(), { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (err: any) {
    console.error('Error generating local embedding:', err.message);
    throw err;
  }
}

export function loadEmbeddingsCache(csvsDir: string): Record<string, { embedding: number[]; vorschlag: string }> {
  const cachePath = path.join(csvsDir, '.embeddings_cache.json');
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf8');
      const parsed = JSON.parse(content);
      // Validate vector dimension (384 for paraphrase-multilingual-MiniLM-L12-v2)
      // If legacy cache has 768-dim Gemini embeddings, invalidate so it auto-re-embeds cleanly
      const firstEntry = Object.values(parsed)[0] as any;
      if (firstEntry && Array.isArray(firstEntry.embedding) && firstEntry.embedding.length !== EMBEDDING_DIMENSION) {
        console.log(`[ragDeduplication] Migrating cache: replacing legacy ${firstEntry.embedding.length}-dim embeddings with ${EMBEDDING_DIMENSION}-dim local multilingual embeddings.`);
        return {};
      }
      return parsed;
    } catch (e) {
      console.error('Error reading embeddings cache:', e);
    }
  }
  return {};
}

export function saveEmbeddingsCache(
  csvsDir: string,
  cache: Record<string, { embedding: number[]; vorschlag: string }>
): void {
  const cachePath = path.join(csvsDir, '.embeddings_cache.json');
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving embeddings cache:', e);
  }
}

export function loadProcessedHashes(csvsDir: string): Record<string, { hash: string; fileName: string; processedAt: string }> {
  const hashPath = path.join(csvsDir, '.processed_hashes.json');
  if (fs.existsSync(hashPath)) {
    try {
      const content = fs.readFileSync(hashPath, 'utf8');
      const raw = JSON.parse(content);
      const normalized: Record<string, { hash: string; fileName: string; processedAt: string }> = {};
      for (const [key, val] of Object.entries(raw as Record<string, any>)) {
        const fileName = val.fileName || key;
        const hash = val.hash || (key.length === 64 ? key : '');
        normalized[fileName] = {
          hash,
          fileName,
          processedAt: val.processedAt || ''
        };
      }
      return normalized;
    } catch (e) {
      console.error('Error reading processed hashes:', e);
    }
  }
  return {};
}

export function saveProcessedHashes(
  csvsDir: string,
  hashes: Record<string, { hash: string; fileName: string; processedAt: string }>
): void {
  const hashPath = path.join(csvsDir, '.processed_hashes.json');
  try {
    fs.writeFileSync(hashPath, JSON.stringify(hashes, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving processed hashes:', e);
  }
}

export function loadExistingProposals(csvsDir: string): ExistingProposal[] {
  const proposals: ExistingProposal[] = [];
  if (!fs.existsSync(csvsDir)) return proposals;

  const files = fs.readdirSync(csvsDir);
  for (const file of files) {
    if (file.startsWith('.') || path.extname(file).toLowerCase() !== '.csv') continue;
    const filePath = path.join(csvsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCsvRows(content);
    let currentDataRow = 0;
    for (let idx = 1; idx < rows.length; idx++) {
      const row = rows[idx];
      currentDataRow++;
      if (row.length >= 4) {
        proposals.push({
          vorschlag: (row[0] || '').trim(),
          verbatim: (row[1] || '').trim(),
          quelldokument: (row[2] || '').trim(),
          seitennummer: (row[3] || '').trim(),
          kategorie: (row[4] || 'Sonstiges').trim(),
          verarbeitungsdatum: (row[5] || '').trim(),
          file,
          rowIndex: currentDataRow
        });
      }
    }
  }
  return proposals;
}

export async function checkDuplicates(
  incomingProposals: Proposal[],
  csvsDir: string,
  threshold: number = 0.85
): Promise<CheckDuplicatesResult> {
  const existingProposals = loadExistingProposals(csvsDir);
  const cache = loadEmbeddingsCache(csvsDir);
  let cacheModified = false;

  // 1. Ensure all existing proposals have embeddings in cache
  for (const existing of existingProposals) {
    const key = hashText(existing.vorschlag);
    if (!cache[key]) {
      try {
        const emb = await getEmbedding(existing.vorschlag);
        cache[key] = { embedding: emb, vorschlag: existing.vorschlag };
        cacheModified = true;
      } catch (err) {
        console.error(`Failed to embed existing proposal "${existing.vorschlag.substring(0, 30)}...":`, err);
      }
    }
  }

  if (cacheModified) {
    saveEmbeddingsCache(csvsDir, cache);
    cacheModified = false;
  }

  const duplicates: DuplicateMatch[] = [];
  const unique: Proposal[] = [];

  // 2. Embed each incoming proposal and compare with existing proposals
  for (const incoming of incomingProposals) {
    const incomingKey = hashText(incoming.vorschlag);
    let incomingEmb = cache[incomingKey]?.embedding;

    if (!incomingEmb) {
      try {
        incomingEmb = await getEmbedding(incoming.vorschlag);
        cache[incomingKey] = { embedding: incomingEmb, vorschlag: incoming.vorschlag };
        cacheModified = true;
      } catch (err) {
        console.error(`Failed to embed incoming proposal "${incoming.vorschlag.substring(0, 30)}...":`, err);
      }
    }

    if (!incomingEmb) {
      unique.push(incoming);
      continue;
    }

    let maxSim = -1;
    let bestMatch: ExistingProposal | null = null;

    for (const existing of existingProposals) {
      const existingKey = hashText(existing.vorschlag);
      const existingEmb = cache[existingKey]?.embedding;
      if (existingEmb) {
        const sim = cosineSimilarity(incomingEmb, existingEmb);
        if (sim > maxSim) {
          maxSim = sim;
          bestMatch = existing;
        }
      }
    }

    if (maxSim >= threshold && bestMatch) {
      duplicates.push({
        incoming,
        existing: bestMatch,
        similarity: Math.round(maxSim * 100) / 100,
        existingFile: bestMatch.file,
        existingRowIndex: bestMatch.rowIndex
      });
    } else {
      unique.push(incoming);
    }
  }

  if (cacheModified) {
    saveEmbeddingsCache(csvsDir, cache);
  }

  return { duplicates, unique };
}

export function mergeProposalRow(
  existingRow: string[],
  incoming: { verbatim: string; quelldokument: string; seitennummer: string; verarbeitungsdatum: string }
): string[] {
  const vorschlag = existingRow[0] || '';
  const currentVerbatim = existingRow[1] || '';
  const currentSource = existingRow[2] || '';
  const currentPage = existingRow[3] || '';
  const kategorie = existingRow[4] || 'Sonstiges';
  const currentDate = existingRow[5] || '';

  const matches = currentVerbatim.match(/\b\d+\)/g);
  const nextNum = matches ? matches.length + 1 : 2;

  let newVerbatim = '';
  let newSource = '';
  let newPage = '';
  let newDate = '';

  if (!matches) {
    newVerbatim = `1) ${currentVerbatim} 2) ${incoming.verbatim}`;
    newSource = `1) ${currentSource} 2) ${incoming.quelldokument}`;
    newPage = `1) ${currentPage} 2) ${incoming.seitennummer}`;
    newDate = `1) ${currentDate} 2) ${incoming.verarbeitungsdatum}`;
  } else {
    newVerbatim = `${currentVerbatim} ${nextNum}) ${incoming.verbatim}`;
    newSource = `${currentSource} ${nextNum}) ${incoming.quelldokument}`;
    newPage = `${currentPage} ${nextNum}) ${incoming.seitennummer}`;
    newDate = `${currentDate} ${nextNum}) ${incoming.verarbeitungsdatum}`;
  }

  return [
    vorschlag,
    newVerbatim,
    newSource,
    newPage,
    kategorie,
    newDate
  ];
}

// -------------------------------------------------------------
// Known Documents & Exclusion Registry (Prevents Duplicate Retrieval)
// -------------------------------------------------------------

export interface KnownDocumentRecord {
  fileName: string;
  hash: string;
  titles: string[];
  urls: string[];
  status: 'active' | 'processed' | 'rejected';
  addedAt: string;
}

export function loadKnownDocumentsRegistry(csvsDir: string): Record<string, KnownDocumentRecord> {
  const regPath = path.join(csvsDir, '.known_documents_registry.json');
  if (fs.existsSync(regPath)) {
    try {
      const content = fs.readFileSync(regPath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('[KnownDocsRegistry] Error reading registry:', e);
    }
  }
  return {};
}

export function saveKnownDocumentsRegistry(csvsDir: string, reg: Record<string, KnownDocumentRecord>): void {
  const regPath = path.join(csvsDir, '.known_documents_registry.json');
  try {
    fs.writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf8');
  } catch (e) {
    console.error('[KnownDocsRegistry] Error saving registry:', e);
  }
}

export function registerDocumentEntry(
  csvsDir: string, 
  entry: { fileName: string; hash: string; title?: string; url?: string; status?: 'active' | 'processed' | 'rejected' }
): void {
  const registry = loadKnownDocumentsRegistry(csvsDir);
  const key = entry.hash || entry.fileName;
  
  if (!registry[key]) {
    registry[key] = {
      fileName: entry.fileName,
      hash: entry.hash,
      titles: entry.title ? [entry.title] : [],
      urls: entry.url ? [entry.url] : [],
      status: entry.status || 'active',
      addedAt: new Date().toISOString()
    };
  } else {
    if (entry.title && !registry[key].titles.includes(entry.title)) {
      registry[key].titles.push(entry.title);
    }
    if (entry.url && !registry[key].urls.includes(entry.url)) {
      registry[key].urls.push(entry.url);
    }
    if (entry.status) {
      registry[key].status = entry.status;
    }
  }
  saveKnownDocumentsRegistry(csvsDir, registry);
}

export function getAllKnownTitlesAndUrls(csvsDir: string): { titles: string[]; urls: string[] } {
  const registry = loadKnownDocumentsRegistry(csvsDir);
  const titlesSet = new Set<string>();
  const urlsSet = new Set<string>();

  for (const item of Object.values(registry)) {
    item.titles.forEach(t => t && titlesSet.add(t));
    item.urls.forEach(u => u && urlsSet.add(u));
  }

  // Also read .processed_hashes.json for any filenames not yet in registry
  const processed = loadProcessedHashes(csvsDir);
  for (const p of Object.values(processed)) {
    if (p.fileName) {
      const clean = p.fileName.replace(/\.pdf$/i, '').replace(/_/g, ' ');
      titlesSet.add(clean);
    }
  }

  return {
    titles: Array.from(titlesSet),
    urls: Array.from(urlsSet)
  };
}
