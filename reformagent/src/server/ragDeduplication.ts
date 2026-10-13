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

export function syncProcessedHashesWithDisk(
  csvsDir: string,
  filesDir: string = '/Users/ali/Desktop/Master Thesis/files'
): Record<string, { hash: string; fileName: string; processedAt: string }> {
  const processedHashes = loadProcessedHashes(csvsDir);
  const processedDir = path.join(filesDir, 'processed files');

  if (!fs.existsSync(processedDir)) {
    try {
      fs.mkdirSync(processedDir, { recursive: true });
    } catch {}
    return processedHashes;
  }

  let modified = false;

  // 1. Get all PDF files actually currently present in "processed files" on disk
  const diskFiles: string[] = [];
  try {
    const rawFiles = fs.readdirSync(processedDir);
    for (const f of rawFiles) {
      if (f.startsWith('.') || !f.toLowerCase().endsWith('.pdf')) continue;
      try {
        if (fs.statSync(path.join(processedDir, f)).isFile()) {
          diskFiles.push(f);
        }
      } catch {}
    }
  } catch (err) {
    console.error('Error reading processedDir:', err);
    return processedHashes;
  }

  const diskFileSet = new Set(diskFiles);

  // 2. Remove entries for files that no longer exist in "processed files" on disk
  for (const [key, entry] of Object.entries(processedHashes)) {
    const fileName = entry.fileName || key;
    if (!diskFileSet.has(fileName)) {
      delete processedHashes[key];
      modified = true;
    }
  }

  // 3. Add or update hashes for files currently on disk
  for (const fileName of diskFiles) {
    const fullPath = path.join(processedDir, fileName);
    try {
      const stat = fs.statSync(fullPath);
      const existing = processedHashes[fileName];

      // If missing or hash is empty, compute hash
      if (!existing || !existing.hash) {
        const buf = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        processedHashes[fileName] = {
          hash,
          fileName,
          processedAt: stat.mtime.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
        };
        modified = true;
      }
    } catch (e) {
      // skip unreadable file
    }
  }

  if (modified) {
    saveProcessedHashes(csvsDir, processedHashes);
  }

  return processedHashes;
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
  thresholdParam: number | { lowerThreshold?: number; upperThreshold?: number } = 0.78
): Promise<CheckDuplicatesResult> {
  let lowerThreshold = 0.75;
  let upperThreshold = 0.88;

  if (typeof thresholdParam === 'number') {
    lowerThreshold = thresholdParam;
    upperThreshold = Math.max(0.88, thresholdParam);
  } else if (thresholdParam && typeof thresholdParam === 'object') {
    lowerThreshold = thresholdParam.lowerThreshold ?? 0.75;
    upperThreshold = thresholdParam.upperThreshold ?? 0.88;
  }

  const existingProposals = loadExistingProposals(csvsDir);
  const cache = loadEmbeddingsCache(csvsDir);
  let cacheModified = false;

  // Helper to get or compute embedding with caching
  const getCachedEmbedding = async (text: string): Promise<number[] | null> => {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    const key = hashText(trimmed);
    if (cache[key]?.embedding) {
      return cache[key].embedding;
    }
    try {
      const emb = await getEmbedding(trimmed);
      cache[key] = { embedding: emb, vorschlag: trimmed };
      cacheModified = true;
      return emb;
    } catch (err) {
      console.error(`Failed to embed "${trimmed.substring(0, 30)}...":`, err);
      return null;
    }
  };

  // 1. Ensure all existing proposals have embeddings in cache for both vorschlag and verbatim
  for (const existing of existingProposals) {
    if (existing.vorschlag) await getCachedEmbedding(existing.vorschlag);
    if (existing.verbatim) await getCachedEmbedding(existing.verbatim);
  }

  if (cacheModified) {
    saveEmbeddingsCache(csvsDir, cache);
    cacheModified = false;
  }

  const duplicates: DuplicateMatch[] = [];
  const autoMergeDuplicates: DuplicateMatch[] = [];
  const reviewDuplicates: DuplicateMatch[] = [];
  const unique: Proposal[] = [];

  // 2. Embed each incoming proposal and compare with existing proposals (Dual-Signal: max(simVorschlag, simVerbatim))
  for (const incoming of incomingProposals) {
    const incomingVorschlagEmb = incoming.vorschlag ? await getCachedEmbedding(incoming.vorschlag) : null;
    const incomingVerbatimEmb = incoming.verbatim ? await getCachedEmbedding(incoming.verbatim) : null;

    if (!incomingVorschlagEmb && !incomingVerbatimEmb) {
      unique.push(incoming);
      continue;
    }

    let maxSim = -1;
    let bestMatch: ExistingProposal | null = null;

    for (const existing of existingProposals) {
      let simVorschlag = 0;
      let simVerbatim = 0;

      if (incomingVorschlagEmb && existing.vorschlag) {
        const existingKey = hashText(existing.vorschlag);
        const existingEmb = cache[existingKey]?.embedding;
        if (existingEmb) {
          simVorschlag = cosineSimilarity(incomingVorschlagEmb, existingEmb);
        }
      }

      if (incomingVerbatimEmb && existing.verbatim) {
        const existingKey = hashText(existing.verbatim);
        const existingEmb = cache[existingKey]?.embedding;
        if (existingEmb) {
          simVerbatim = cosineSimilarity(incomingVerbatimEmb, existingEmb);
        }
      }

      // Dual-signal: match is high if either the synthesized reform statement OR the verbatim quote matches
      const combinedSim = Math.max(simVorschlag, simVerbatim);

      if (combinedSim > maxSim) {
        maxSim = combinedSim;
        bestMatch = existing;
      }
    }

    const roundedSim = Math.round(maxSim * 100) / 100;

    if (maxSim >= lowerThreshold && bestMatch) {
      const matchObj: DuplicateMatch = {
        incoming,
        existing: bestMatch,
        similarity: roundedSim,
        existingFile: bestMatch.file,
        existingRowIndex: bestMatch.rowIndex
      };

      duplicates.push(matchObj);

      if (maxSim >= upperThreshold) {
        // High confidence (Zone 1: Auto-Merge)
        autoMergeDuplicates.push(matchObj);
      } else {
        // Moderate confidence (Zone 2: Human-in-the-Loop Review Modal)
        reviewDuplicates.push(matchObj);
      }
    } else {
      // Zone 3: Distinct
      unique.push(incoming);
    }
  }

  if (cacheModified) {
    saveEmbeddingsCache(csvsDir, cache);
  }

  return { duplicates, autoMergeDuplicates, reviewDuplicates, unique };
}

export function mergeProposalRow(
  existingRow: string[],
  incoming: { vorschlag?: string; verbatim: string; quelldokument: string; seitennummer: string; kategorie?: string; cluster?: string; verarbeitungsdatum: string }
): string[] {
  const currentVorschlag = existingRow[0] || '';
  const currentVerbatim = existingRow[1] || '';
  const currentSource = existingRow[2] || '';
  const currentPage = existingRow[3] || '';
  const kategorie = existingRow[4] || 'Sonstiges';
  const cluster = existingRow.length >= 7 ? (existingRow[5] || 'Allgemein') : (incoming.cluster || 'Allgemein');
  const currentDate = existingRow.length >= 7 ? (existingRow[6] || '') : (existingRow[5] || '');

  const matches = currentVerbatim.match(/\b\d+\)/g);
  const nextNum = matches ? matches.length + 1 : 2;

  let newVorschlag = '';
  let newVerbatim = '';
  let newSource = '';
  let newPage = '';
  let newDate = '';

  if (!matches) {
    newVorschlag = incoming.vorschlag ? `1) ${currentVorschlag} 2) ${incoming.vorschlag}` : currentVorschlag;
    newVerbatim = `1) ${currentVerbatim} 2) ${incoming.verbatim}`;
    newSource = `1) ${currentSource} 2) ${incoming.quelldokument}`;
    newPage = `1) ${currentPage} 2) ${incoming.seitennummer}`;
    newDate = `1) ${currentDate} 2) ${incoming.verarbeitungsdatum}`;
  } else {
    newVorschlag = incoming.vorschlag ? `${currentVorschlag} ${nextNum}) ${incoming.vorschlag}` : currentVorschlag;
    newVerbatim = `${currentVerbatim} ${nextNum}) ${incoming.verbatim}`;
    newSource = `${currentSource} ${nextNum}) ${incoming.quelldokument}`;
    newPage = `${currentPage} ${nextNum}) ${incoming.seitennummer}`;
    newDate = `${currentDate} ${nextNum}) ${incoming.verarbeitungsdatum}`;
  }

  return [
    newVorschlag,
    newVerbatim,
    newSource,
    newPage,
    kategorie,
    cluster,
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
