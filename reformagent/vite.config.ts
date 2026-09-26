import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import fs from "fs"
import crypto from "crypto"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, '.env') })

import { 
  checkDuplicates, 
  mergeProposalRow, 
  escapeCsvField, 
  parseCsvLine, 
  parseCsvRows,
  loadProcessedHashes, 
  saveProcessedHashes,
  loadKnownDocumentsRegistry,
  registerDocumentEntry,
  getAllKnownTitlesAndUrls
} from "./src/server/ragDeduplication"
import { 
  logExtractionExecution, 
  getExecutionHistory 
} from "./src/server/executionLogger"

const CSVS_DIR = path.resolve(__dirname, './csvs');
const WORKFLOWS_DIR = path.resolve(__dirname, './workflows');
const MASTER_SOURCE = path.join(CSVS_DIR, 'reforms_master.csv');
const FILES_DIR = '/Users/ali/Desktop/Master Thesis/files';
const PROCESSED_DIR = path.join(FILES_DIR, 'processed files');
const MASTER_EXPORT_FILE = path.join(FILES_DIR, 'extracted_reforms_database.csv');

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'save-csv-middleware',
      configureServer(server) {
        // Helper function to rebuild master CSV
        const rebuildMasterCsv = () => {
          const header = 'Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n';
          
          if (!fs.existsSync(MASTER_SOURCE)) {
            fs.writeFileSync(MASTER_SOURCE, header, 'utf8');
          }
          const masterDir = path.dirname(MASTER_EXPORT_FILE);
          if (!fs.existsSync(masterDir)) {
            fs.mkdirSync(masterDir, { recursive: true });
          }
          fs.copyFileSync(MASTER_SOURCE, MASTER_EXPORT_FILE);
          try {
            fs.chmodSync(MASTER_EXPORT_FILE, 0o666);
          } catch {}
        };

        // Helper function to delete proposal rows by ID
        const deleteProposalsFromMaster = (ids: string[]) => {
          const targetRows = new Set(ids.map(id => parseInt(String(id).split('_').pop() || '0', 10)));
          if (!fs.existsSync(MASTER_SOURCE)) {
            throw new Error(`File not found: ${MASTER_SOURCE}`);
          }
          const content = fs.readFileSync(MASTER_SOURCE, 'utf8');
          const rows = parseCsvRows(content);
          if (rows.length === 0) return 0;
          const header = rows[0].map(escapeCsvField).join(',');
          const newLines = [header];
          let currentDataRowIndex = 0;
          let deletedCount = 0;
          for (let idx = 1; idx < rows.length; idx++) {
            currentDataRowIndex++;
            if (!targetRows.has(currentDataRowIndex)) {
              newLines.push(rows[idx].map(escapeCsvField).join(','));
            } else {
              deletedCount++;
            }
          }
          fs.writeFileSync(MASTER_SOURCE, newLines.join('\n') + '\n', 'utf8');
          rebuildMasterCsv();
          return deletedCount;
        };

        server.middlewares.use(async (req, res, next) => {

          if (req.url === '/api/check-duplicates' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { proposals, threshold } = JSON.parse(body);
                  if (!Array.isArray(proposals)) {
                    throw new Error('proposals array is required.');
                  }
                  const csvsDir = path.resolve(__dirname, './csvs');
                  console.log(`[DEBUG SERVER check-duplicates] Starting with ${proposals.length} proposals, threshold=${threshold}`);
                  const result = await checkDuplicates(proposals, csvsDir, threshold || 0.85);
                  console.log(`[DEBUG SERVER check-duplicates] Done: ${result.duplicates.length} duplicates, ${result.unique.length} unique`);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    success: true, 
                    duplicates: result.duplicates, 
                    unique: result.unique 
                  }));
                } catch (err: any) {
                  console.error(`[DEBUG SERVER check-duplicates] ERROR:`, err.message);
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/save-csv' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const payload = JSON.parse(body);
                  const csvsDir = path.resolve(__dirname, './csvs');
                  if (!fs.existsSync(csvsDir)) {
                    fs.mkdirSync(csvsDir, { recursive: true });
                  }
                  const masterPath = path.join(csvsDir, 'reforms_master.csv');
                  if (!fs.existsSync(masterPath)) {
                    fs.writeFileSync(masterPath, 'Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n', 'utf8');
                  }

                  // 1. Process merges if any in reforms_master.csv
                  if (Array.isArray(payload.merges) && payload.merges.length > 0) {
                    const fileContent = fs.readFileSync(masterPath, 'utf8');
                    const lines = fileContent.split('\n');
                    let currentDataRow = 0;
                    const updatedLines: string[] = [];

                    const mergeMap = new Map<number, any>();
                    for (const m of payload.merges) {
                      mergeMap.set(Number(m.existingRowIndex), m.incoming);
                    }

                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i].trim();
                      if (!line) continue;
                      if (i === 0) {
                        updatedLines.push(lines[i]);
                        continue;
                      }
                      currentDataRow++;
                      if (mergeMap.has(currentDataRow)) {
                        const incoming = mergeMap.get(currentDataRow);
                        const existingRow = parseCsvLine(line);
                        const updatedRow = mergeProposalRow(existingRow, {
                          verbatim: incoming.verbatim,
                          quelldokument: incoming.quelldokument,
                          seitennummer: incoming.seitennummer,
                          verarbeitungsdatum: incoming.verarbeitungsdatum
                        });
                        updatedLines.push(updatedRow.map(escapeCsvField).join(','));
                      } else {
                        updatedLines.push(lines[i]);
                      }
                    }
                    fs.writeFileSync(masterPath, updatedLines.join('\n') + '\n', 'utf8');
                  }

                  // 2. Process new proposals: append to reforms_master.csv
                  if (Array.isArray(payload.newProposals) && payload.newProposals.length > 0) {
                    let appendContent = '';
                    for (const prop of payload.newProposals) {
                      const row = [
                        prop.vorschlag,
                        prop.verbatim,
                        prop.quelldokument,
                        prop.seitennummer,
                        prop.kategorie,
                        prop.verarbeitungsdatum
                      ];
                      appendContent += row.map(escapeCsvField).join(',') + '\n';
                    }
                    fs.appendFileSync(masterPath, appendContent, 'utf8');
                  } else if (payload.content && typeof payload.content === 'string') {
                    // Fallback direct content writing
                    fs.writeFileSync(masterPath, payload.content, 'utf8');
                  }
                  
                  // Rebuild master copy in Thesis folder
                  rebuildMasterCsv();

                  // 3. Move processed document and record SHA-256 hash upon confirmed save
                  if (payload.documentFileName) {
                    const docName = String(payload.documentFileName).trim();
                    const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                    const processedDir = path.join(filesDir, 'processed files');
                    if (!fs.existsSync(processedDir)) {
                      fs.mkdirSync(processedDir, { recursive: true });
                    }
                    const origPath = path.join(filesDir, docName);
                    const destPath = path.join(processedDir, docName);
                    if (fs.existsSync(origPath) && origPath !== destPath) {
                      try {
                        fs.renameSync(origPath, destPath);
                        console.log(`[save-csv] Moved "${docName}" to processed files folder.`);
                      } catch {
                        try {
                          fs.copyFileSync(origPath, destPath);
                          fs.unlinkSync(origPath);
                        } catch (errCopy) {
                          console.error(`[save-csv] Error moving ${docName}:`, errCopy);
                        }
                      }
                    }
                    const targetFileForHash = fs.existsSync(destPath) ? destPath : (fs.existsSync(origPath) ? origPath : null);
                    if (targetFileForHash) {
                      const fileBuffer = fs.readFileSync(targetFileForHash);
                      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                      const processedHashes = loadProcessedHashes(csvsDir);
                      processedHashes[docName] = {
                        hash,
                        fileName: docName,
                        processedAt: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                      };
                      saveProcessedHashes(csvsDir, processedHashes);
                      console.log(`[save-csv] Recorded processed hash for "${docName}".`);
                    }
                  }
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/list-pdfs' && req.method === 'GET') {
            try {
              const filesDir = '/Users/ali/Desktop/Master Thesis/files';
              if (!fs.existsSync(filesDir)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
              }
              const csvsDir = path.resolve(__dirname, './csvs');
              const processedHashes = loadProcessedHashes(csvsDir);
              const processedFileNames = new Set(Object.values(processedHashes).map(p => p.fileName));
              const processedDir = path.join(filesDir, 'processed files');
              if (fs.existsSync(processedDir)) {
                try {
                  const pFiles = fs.readdirSync(processedDir);
                  pFiles.forEach(f => processedFileNames.add(f));
                } catch {}
              }

              const files = fs.readdirSync(filesDir);
              const pdfs = files.filter(file => {
                const fullPath = path.join(filesDir, file);
                try {
                  return fs.statSync(fullPath).isFile() && 
                         path.extname(file).toLowerCase() === '.pdf' &&
                         !processedFileNames.has(file);
                } catch {
                  return false;
                }
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(pdfs));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/list-proposals' && req.method === 'GET') {
            try {
              const csvsDir = path.resolve(__dirname, './csvs');
              const masterPath = path.join(csvsDir, 'reforms_master.csv');
              const proposals: any[] = [];
              
              if (fs.existsSync(masterPath)) {
                const content = fs.readFileSync(masterPath, 'utf8');
                const rows = parseCsvRows(content);
                let currentDataRow = 0;
                
                for (let idx = 1; idx < rows.length; idx++) {
                  const row = rows[idx];
                  if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;
                  currentDataRow++;
                  if (row.length >= 4) {
                    const text = row[0] || '';
                    const verbatim = row[1] || '';
                    const sourceText = row[2] || '';
                    const page = row[3] || '';
                    const category = row[4] || 'Sonstiges';
                    const csvProcessedAt = row[5] || '';
                    
                    proposals.push({
                      id: String(currentDataRow),
                      text,
                      verbatim,
                      source: sourceText,
                      sourceUrl: (sourceText.includes('.') && !sourceText.includes('unknown_document.pdf')) ? sourceText : '',
                      page,
                      category,
                      processedAt: csvProcessedAt
                    });
                  }
                }
              }
              
              // Keep the natural order as it is in reforms_master.csv
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(proposals));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/list-processed-documents' && req.method === 'GET') {
            try {
              const csvsDir = path.resolve(__dirname, './csvs');
              const processedHashes = loadProcessedHashes(csvsDir);
              const filesDir = '/Users/ali/Desktop/Master Thesis/files';
              const processedDir = path.join(filesDir, 'processed files');
              if (!fs.existsSync(processedDir)) {
                fs.mkdirSync(processedDir, { recursive: true });
              }
              
              // Sync files physically in "processed files" folder into processedHashes if missing
              if (fs.existsSync(processedDir)) {
                const pFiles = fs.readdirSync(processedDir);
                let cacheUpdated = false;
                for (const pf of pFiles) {
                  const fullPf = path.join(processedDir, pf);
                  try {
                    if (fs.statSync(fullPf).isFile() && path.extname(pf).toLowerCase() === '.pdf') {
                      const alreadyHashed = Object.values(processedHashes).some(v => v.fileName === pf);
                      if (!alreadyHashed) {
                        const buf = fs.readFileSync(fullPf);
                        const h = crypto.createHash('sha256').update(buf).digest('hex');
                        const stat = fs.statSync(fullPf);
                        processedHashes[pf] = {
                          hash: h,
                          fileName: pf,
                          processedAt: stat.mtime.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                        };
                        cacheUpdated = true;
                      }
                    }
                  } catch (e) {
                    // ignore stat error
                  }
                }
                if (cacheUpdated) {
                  saveProcessedHashes(csvsDir, processedHashes);
                }
              }

              const docs = Object.values(processedHashes).map(info => {
                const fileExists = fs.existsSync(path.join(processedDir, info.fileName));
                return {
                  id: info.fileName,
                  hash: info.hash,
                  fileName: info.fileName,
                  processedAt: info.processedAt,
                  hasFile: fileExists
                };
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(docs));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if ((req.url?.startsWith('/api/view-processed-pdf') || req.url?.startsWith('/api/view-pdf')) && req.method === 'GET') {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost:3000');
              const fileName = parsedUrl.searchParams.get('fileName');
              if (!fileName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'fileName is required' }));
                return;
              }
              const filesDir = '/Users/ali/Desktop/Master Thesis/files';
              const processedDir = path.join(filesDir, 'processed files');
              let targetPath = path.join(processedDir, fileName);
              if (!fs.existsSync(targetPath)) {
                targetPath = path.join(filesDir, fileName);
              }
              if (!fs.existsSync(targetPath)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `File not found: ${fileName}` }));
                return;
              }
              const stat = fs.statSync(targetPath);
              res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size,
                'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`
              });
              fs.createReadStream(targetPath).pipe(res);
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/record-processed-document' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const { fileName, fileHash, fileBase64 } = JSON.parse(body);
                  if (!fileName) {
                    throw new Error('fileName is required.');
                  }
                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  const processedDir = path.join(filesDir, 'processed files');
                  if (!fs.existsSync(processedDir)) {
                    fs.mkdirSync(processedDir, { recursive: true });
                  }
                  const origPath = path.join(filesDir, fileName);
                  const procPath = path.join(processedDir, fileName);
                  if (fs.existsSync(origPath) && origPath !== procPath) {
                    try {
                      fs.renameSync(origPath, procPath);
                    } catch (e) {
                      fs.copyFileSync(origPath, procPath);
                      fs.unlinkSync(origPath);
                    }
                  } else if (fileBase64 && !fs.existsSync(procPath)) {
                    fs.writeFileSync(procPath, Buffer.from(fileBase64, 'base64'));
                  }

                  const csvsDir = path.resolve(__dirname, './csvs');
                  const processedHashes = loadProcessedHashes(csvsDir);
                  const hash = fileHash || crypto.createHash('sha256').update(fileName + '_' + Date.now()).digest('hex');
                  processedHashes[fileName] = {
                    hash,
                    fileName,
                    processedAt: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                  };
                  saveProcessedHashes(csvsDir, processedHashes);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, hash, fileName }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/delete-processed-documents-batch' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const { hashes, fileNames } = JSON.parse(body);
                  const targets = fileNames || hashes;
                  if (!Array.isArray(targets) || targets.length === 0) {
                    throw new Error('fileNames or hashes array is required.');
                  }
                  const csvsDir = path.resolve(__dirname, './csvs');
                  const processedHashes = loadProcessedHashes(csvsDir);
                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  const processedDir = path.join(filesDir, 'processed files');
                  let deletedCount = 0;
                  for (const target of targets) {
                    const entryKey = processedHashes[target]
                      ? target
                      : Object.keys(processedHashes).find(k => processedHashes[k].hash === target);

                    if (entryKey && processedHashes[entryKey]) {
                      const fileName = processedHashes[entryKey].fileName || entryKey;
                      if (fileName) {
                        const procPath = path.join(processedDir, fileName);
                        const origPath = path.join(filesDir, fileName);
                        if (fs.existsSync(procPath)) {
                          try {
                            fs.renameSync(procPath, origPath);
                            console.log(`Returned "${fileName}" to original files directory.`);
                          } catch (mvErr) {
                            fs.copyFileSync(procPath, origPath);
                            fs.unlinkSync(procPath);
                          }
                        }
                      }
                      delete processedHashes[entryKey];
                      deletedCount++;
                    }
                  }
                  saveProcessedHashes(csvsDir, processedHashes);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, deletedCount }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/download-master-csv' && req.method === 'GET') {
            try {
              const filePath = '/Users/ali/Desktop/Master Thesis/files/extracted_reforms_database.csv';
              if (!fs.existsSync(filePath)) {
                res.writeHead(200, { 'Content-Type': 'text/csv' });
                res.end('Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n');
                return;
              }
              const fileContent = fs.readFileSync(filePath);
              res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="extracted_reforms_database.csv"'
              });
              res.end(fileContent);
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/delete-proposal' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const { id } = JSON.parse(body);
                  if (!id) {
                    throw new Error('ID is required.');
                  }
                  deleteProposalsFromMaster([id]);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/delete-proposals-batch' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const { ids } = JSON.parse(body);
                  if (!Array.isArray(ids) || ids.length === 0) {
                    throw new Error('ids array is required.');
                  }
                  const deletedCount = deleteProposalsFromMaster(ids);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, deletedCount }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/clear-all-proposals' && req.method === 'POST') {
            try {
              const masterPath = path.resolve(__dirname, './csvs/reforms_master.csv');
              const header = 'Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n';
              fs.writeFileSync(masterPath, header, 'utf8');
              rebuildMasterCsv();
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/extract-local-pdf' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { fileName, force } = JSON.parse(body);
                  if (!fileName) {
                    throw new Error('fileName is required.');
                  }
                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  const processedDir = path.join(filesDir, 'processed files');
                  if (!fs.existsSync(processedDir)) {
                    fs.mkdirSync(processedDir, { recursive: true });
                  }
                  let filePath = path.join(filesDir, fileName);
                  if (!fs.existsSync(filePath)) {
                    const inProcessed = path.join(processedDir, fileName);
                    if (fs.existsSync(inProcessed)) {
                      filePath = inProcessed;
                    } else {
                      throw new Error(`File not found: ${filePath}`);
                    }
                  }
                  const fileBuffer = fs.readFileSync(filePath);
                  const csvsDir = path.resolve(__dirname, './csvs');

                  // Check SHA-256 hash for document-level deduplication
                  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                  const processedHashes = loadProcessedHashes(csvsDir);

                  const duplicateDoc = Object.values(processedHashes).find(p => p.hash === fileHash);

                  if (!force && duplicateDoc) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                      error: `Duplicate document detected. This exact PDF was already extracted on ${duplicateDoc.processedAt} as "${duplicateDoc.fileName}".`,
                      isDuplicate: true,
                      previousFileName: duplicateDoc.fileName,
                      processedAt: duplicateDoc.processedAt
                    }));
                    return;
                  }
                  
                  // Construct FormData and post it to n8n manual webhook
                  const formData = new FormData();
                  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
                  formData.append('data', blob, fileName);

                  // Track execution timing for audit & history
                  const startTime = Date.now();
                  const startedAt = new Date().toISOString();

                  console.log(`[DEBUG SERVER extract-local-pdf] Sending to n8n: "${fileName}" force=${force}`);

                  let n8nRes: Response;
                  try {
                    n8nRes = await fetch(`http://localhost:5678/webhook/extract-reforms?fileName=${encodeURIComponent(fileName)}`, {
                      method: 'POST',
                      body: formData
                    });
                  } catch (fetchErr: any) {
                    console.error(`[DEBUG SERVER extract-local-pdf] n8n fetch FAILED:`, fetchErr.message);
                    logExtractionExecution({
                      executionId: `err_${Date.now()}`,
                      fileName,
                      status: 'error',
                      startedAt,
                      stoppedAt: new Date().toISOString(),
                      durationMs: Date.now() - startTime,
                      proposalsCount: 0,
                      error: `Could not connect to n8n: ${fetchErr.message}`,
                      timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                    });
                    throw fetchErr;
                  }

                  console.log(`[DEBUG SERVER extract-local-pdf] n8n responded: status=${n8nRes.status}`);
                  const executionIdHeader = n8nRes.headers.get('x-n8n-execution-id') || `${Date.now()}`;

                  if (!n8nRes.ok) {
                    let errorMsg = `n8n extraction failed with status ${n8nRes.status}: ${n8nRes.statusText}`;
                    try {
                      const errData = await n8nRes.json();
                      if (errData.message) errorMsg = errData.message;
                      else if (errData.error) errorMsg = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
                    } catch {}

                    logExtractionExecution({
                      executionId: executionIdHeader,
                      fileName,
                      status: 'error',
                      startedAt,
                      stoppedAt: new Date().toISOString(),
                      durationMs: Date.now() - startTime,
                      proposalsCount: 0,
                      error: errorMsg,
                      timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                    });

                    throw new Error(errorMsg);
                  }

                  const arrayBuffer = await n8nRes.arrayBuffer();
                  const csvText = Buffer.from(arrayBuffer).toString('utf8');
                  console.log(`[DEBUG SERVER extract-local-pdf] CSV received, length=${csvText.length} bytes`);

                  // Check if response is an error JSON payload from n8n
                  try {
                    const parsedJson = JSON.parse(csvText.trim());
                    if (parsedJson.message || parsedJson.error) {
                      const errorMsg = parsedJson.message || parsedJson.error || 'n8n workflow execution error';
                      logExtractionExecution({
                        executionId: executionIdHeader,
                        fileName,
                        status: 'error',
                        startedAt,
                        stoppedAt: new Date().toISOString(),
                        durationMs: Date.now() - startTime,
                        proposalsCount: 0,
                        error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
                        timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                      });
                      throw new Error(errorMsg);
                    }
                  } catch (jsonErr: any) {
                    if (jsonErr.message && !jsonErr.message.includes('JSON')) {
                      throw jsonErr;
                    }
                  }

                  // Validate CSV content: must contain header + at least 1 proposal row
                  const parsedRows = parseCsvRows(csvText);
                  console.log(`[DEBUG SERVER extract-local-pdf] Parsed ${parsedRows.length} CSV rows (incl header)`);
                  if (parsedRows.length <= 1) {
                    console.warn(`Extraction yielded 0 proposals for "${fileName}". Keeping document in original location.`);
                    const errorMsg = `Extraction failed: n8n returned 0 proposals for "${fileName}". A backend node may have failed (e.g. LLM service unavailable).`;
                    logExtractionExecution({
                      executionId: executionIdHeader,
                      fileName,
                      status: 'error',
                      startedAt,
                      stoppedAt: new Date().toISOString(),
                      durationMs: Date.now() - startTime,
                      proposalsCount: 0,
                      error: errorMsg,
                      timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                    });
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                      error: errorMsg,
                      count: 0
                    }));
                    return;
                  }

                  const proposalsCount = parsedRows.length - 1;

                  // Log successful execution record
                  logExtractionExecution({
                    executionId: executionIdHeader,
                    fileName,
                    status: 'success',
                    startedAt,
                    stoppedAt: new Date().toISOString(),
                    durationMs: Date.now() - startTime,
                    proposalsCount,
                    error: null,
                    timestamp: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
                  });

                  console.log(`[DEBUG SERVER extract-local-pdf] SUCCESS: Responding with ${proposalsCount} proposals CSV`);
                  res.writeHead(200, { 
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="reforms_${fileName.replace('.pdf', '')}.csv"`
                  });
                  res.end(Buffer.from(arrayBuffer));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/execution-history' && req.method === 'GET') {
            try {
              const history = getExecutionHistory();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(history));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url.startsWith('/api/search-documents') && req.method === 'GET') {
            try {
              const category = new URL(req.url, 'http://localhost').searchParams.get('category') || 'Random';
              const known = getAllKnownTitlesAndUrls(CSVS_DIR);

              const n8nRes = await fetch(`http://localhost:5678/webhook/discover-reforms?category=${encodeURIComponent(category)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  category,
                  knownTitles: known.titles.slice(0, 30),
                  knownUrls: known.urls.slice(0, 50)
                })
              });

              if (!n8nRes.ok) {
                throw new Error(`n8n search failed: ${n8nRes.statusText}`);
              }

              const data = await n8nRes.json();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/download-selected-pdfs' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { documents } = JSON.parse(body);
                  if (!Array.isArray(documents)) {
                    throw new Error('documents array is required.');
                  }
                  
                  let successCount = 0;
                  let skippedDuplicatesCount = 0;
                  const skippedDetails: Array<{ title: string; duplicateOf: string }> = [];

                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  const processedDir = path.join(filesDir, 'processed files');
                  if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir, { recursive: true });
                  }
                  if (!fs.existsSync(processedDir)) {
                    fs.mkdirSync(processedDir, { recursive: true });
                  }

                  // 1. Build an in-memory index of all existing PDF SHA-256 hashes across files/ and processed files/
                  const existingHashes = new Map<string, string>(); // hash -> fileName

                  // From .processed_hashes.json
                  const processedMap = loadProcessedHashes(CSVS_DIR);
                  for (const p of Object.values(processedMap)) {
                    if (p.hash && p.fileName) {
                      existingHashes.set(p.hash, p.fileName);
                    }
                  }

                  // From files on disk (both unprocessed and processed directories)
                  const scanDiskDir = (dir: string) => {
                    if (!fs.existsSync(dir)) return;
                    try {
                      const files = fs.readdirSync(dir);
                      for (const file of files) {
                        if (file.toLowerCase().endsWith('.pdf')) {
                          try {
                            const fullP = path.join(dir, file);
                            const buf = fs.readFileSync(fullP);
                            const h = crypto.createHash('sha256').update(buf).digest('hex');
                            if (!existingHashes.has(h)) {
                              existingHashes.set(h, file);
                            }
                          } catch {}
                        }
                      }
                    } catch {}
                  };

                  scanDiskDir(filesDir);
                  scanDiskDir(processedDir);

                  for (const doc of documents) {
                    try {
                      if (!doc.url) continue;
                      
                      // Emulate browser request headers to avoid Cloudflare/firewall blocks
                      const downloadRes = await fetch(doc.url, {
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                          'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                          'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                          'Cache-Control': 'no-cache',
                          'Pragma': 'no-cache'
                        }
                      });

                      if (!downloadRes.ok) {
                        console.error(`Failed to download ${doc.url}: ${downloadRes.status} ${downloadRes.statusText}`);
                        continue;
                      }

                      // Verify it is not an HTML page
                      const contentType = downloadRes.headers.get('content-type') || '';
                      if (contentType.toLowerCase().includes('text/html')) {
                        console.warn(`Skipping download from ${doc.url} because it resolved to a webpage (HTML), not a PDF.`);
                        continue;
                      }
                      
                      const arrayBuffer = await downloadRes.arrayBuffer();
                      const fileBuffer = Buffer.from(arrayBuffer);

                      // 2. LAYER 1: Compute SHA-256 of downloaded PDF bytes
                      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                      if (existingHashes.has(fileHash)) {
                        const existingName = existingHashes.get(fileHash)!;
                        console.warn(`[Download] BLOCKED DUPLICATE: "${doc.title || doc.url}" has identical SHA-256 hash to "${existingName}".`);
                        skippedDuplicatesCount++;
                        skippedDetails.push({
                          title: doc.title || 'Untitled',
                          duplicateOf: existingName
                        });

                        // Register this URL & title into known registry so it won't be searched again
                        registerDocumentEntry(CSVS_DIR, {
                          fileName: existingName,
                          hash: fileHash,
                          title: doc.title,
                          url: doc.url,
                          status: 'active'
                        });

                        continue;
                      }

                      let baseName = doc.title || 'downloaded_doc';
                      let cleanName = baseName
                        .toLowerCase()
                        .replace(/[^a-z0-9_]+/g, '_')
                        .replace(/^_+|_+$/g, '');
                      if (!cleanName) cleanName = 'document';

                      let cleanFileName = `${cleanName}.pdf`;
                      let filePath = path.join(filesDir, cleanFileName);

                      let counter = 1;
                      while (fs.existsSync(filePath)) {
                        cleanFileName = `${cleanName}_${counter}.pdf`;
                        filePath = path.join(filesDir, cleanFileName);
                        counter++;
                      }

                      fs.writeFileSync(filePath, fileBuffer);
                      existingHashes.set(fileHash, cleanFileName);

                      // Register newly downloaded document
                      registerDocumentEntry(CSVS_DIR, {
                        fileName: cleanFileName,
                        hash: fileHash,
                        title: doc.title,
                        url: doc.url,
                        status: 'active'
                      });

                      successCount++;
                    } catch (downloadErr: any) {
                      console.error(`Error downloading document from ${doc.url}:`, downloadErr.message);
                    }
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    success: true, 
                    successCount, 
                    skippedDuplicatesCount,
                    skippedDetails 
                  }));
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    watch: {
      ignored: [
        '**/csvs/**',
        '**/workflows/**',
        '**/scratch/**',
        '**/.embeddings_cache.json',
        '**/.processed_hashes.json',
        '**/.known_documents.json',
        '**/execution_history.json',
        '**/*.csv',
        /(csvs|workflows|scratch)/
      ]
    },
    proxy: {
      '/webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
