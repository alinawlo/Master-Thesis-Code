import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import fs from "fs"

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'save-csv-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Helper function to rebuild master CSV
          const rebuildMasterCsv = () => {
            const csvsDir = path.resolve(__dirname, './csvs');
            const masterFile = '/Users/ali/Desktop/Master Thesis/files/extracted_reforms_database.csv';
            let masterContent = 'Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n';
            
            if (fs.existsSync(csvsDir)) {
              const files = fs.readdirSync(csvsDir);
              for (const file of files) {
                if (path.extname(file).toLowerCase() === '.csv') {
                  const individualContent = fs.readFileSync(path.join(csvsDir, file), 'utf8');
                  const individualLines = individualContent.split('\n');
                  for (let idx = 1; idx < individualLines.length; idx++) {
                    const line = individualLines[idx].trim();
                    if (line) {
                      masterContent += line + '\n';
                    }
                  }
                }
              }
            }
            const masterDir = path.dirname(masterFile);
            if (!fs.existsSync(masterDir)) {
              fs.mkdirSync(masterDir, { recursive: true });
            }
            fs.writeFileSync(masterFile, masterContent, 'utf8');
          };

          if (req.url === '/api/save-csv' && req.method === 'POST') {
            try {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const { fileName, content } = JSON.parse(body);
                  if (!fileName || typeof content !== 'string') {
                    throw new Error('Invalid payload: fileName and content are required.');
                  }
                  const csvsDir = path.resolve(__dirname, './csvs');
                  if (!fs.existsSync(csvsDir)) {
                    fs.mkdirSync(csvsDir, { recursive: true });
                  }
                  const filePath = path.join(csvsDir, fileName);
                  fs.writeFileSync(filePath, content, 'utf8');
                  
                  // Rebuild master CSV to include the newly saved file
                  rebuildMasterCsv();
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, path: filePath }));
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
              const files = fs.readdirSync(filesDir);
              const pdfs = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(pdfs));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else if (req.url === '/api/list-proposals' && req.method === 'GET') {
            try {
              const csvsDir = path.resolve(__dirname, './csvs');
              const urlsFile = '/Users/ali/Desktop/Master Thesis/files/downloaded_urls.txt';
              
              let urls: string[] = [];
              if (fs.existsSync(urlsFile)) {
                const urlsContent = fs.readFileSync(urlsFile, 'utf8');
                urls = urlsContent.split('\n').filter(Boolean);
              }
              
              const proposals: any[] = [];
              if (fs.existsSync(csvsDir)) {
                const files = fs.readdirSync(csvsDir);
                for (const file of files) {
                  if (path.extname(file).toLowerCase() === '.csv') {
                    const filePath = path.join(csvsDir, file);
                    const processedAt = fs.statSync(filePath).mtime.toLocaleString();
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // Simple CSV parser that handles double quotes
                    const csvData: string[][] = [];
                    const lines = content.split('\n');
                    for (const line of lines) {
                      const row: string[] = [];
                      let inQuotes = false;
                      let currentVal = '';
                      for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') {
                          inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                          row.push(currentVal);
                          currentVal = '';
                        } else {
                          currentVal += char;
                        }
                      }
                      row.push(currentVal);
                      if (row.some(val => val.trim() !== '')) {
                        csvData.push(row);
                      }
                    }
                    
                    if (csvData.length > 1) {
                      const headers = csvData[0];
                      
                      // 1. Reconstruct the original PDF name from the CSV filename
                      const pdfName = file.replace(/^reforms_/, '').replace(/\.csv$/, '.pdf');

                      for (let k = 1; k < csvData.length; k++) {
                        const row = csvData[k];
                        const text = row[0] || '';
                        const verbatim = row[1] || '';
                        
                        // 2. Read the LLM-extracted value from the CSV row (e.g. www.vitako.de)
                        const llmSource = (row[2] || '').trim();
                        
                        const page = row[3] || '';
                        const category = row[4] || 'Sonstiges';
                        const csvProcessedAt = row[5] || processedAt;
                        
                        // 3. Combine: "filename.pdf (extracted_url)"
                        let sourceText = pdfName;
                        if (llmSource && llmSource !== pdfName && llmSource !== 'unknown_document.pdf') {
                          sourceText = `${pdfName} (${llmSource})`;
                        }
                        
                        proposals.push({
                          id: `${file}_${k}`,
                          text,
                          verbatim,
                          source: sourceText,
                          sourceUrl: (llmSource && llmSource.includes('.') && llmSource !== 'unknown_document.pdf') ? llmSource : '',
                          page,
                          category,
                          processedAt: csvProcessedAt
                        });
                      }
                    }
                  }
                }
              }
              
              // Sort by date descending
              proposals.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(proposals));
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
                  
                  const parts = id.split('_');
                  const rowIndex = parseInt(parts.pop() || '1', 10);
                  const fileName = parts.join('_');
                  
                  const csvsDir = path.resolve(__dirname, './csvs');
                  const filePath = path.join(csvsDir, fileName);
                  
                  if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                  }
                  
                  const content = fs.readFileSync(filePath, 'utf8');
                  const lines = content.split('\n');
                  const header = lines[0];
                  
                  const newLines = [];
                  newLines.push(header);
                  
                  let currentDataRowIndex = 0;
                  for (let idx = 1; idx < lines.length; idx++) {
                    const line = lines[idx].trim();
                    if (line) {
                      currentDataRowIndex++;
                      if (currentDataRowIndex !== rowIndex) {
                        newLines.push(lines[idx]);
                      }
                    }
                  }
                  
                  if (newLines.length <= 1) {
                    fs.unlinkSync(filePath);
                  } else {
                    fs.writeFileSync(filePath, newLines.join('\n') + '\n', 'utf8');
                  }
                  
                  // Rebuild master CSV
                  rebuildMasterCsv();
                  
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
          } else if (req.url === '/api/clear-all-proposals' && req.method === 'POST') {
            try {
              const csvsDir = path.resolve(__dirname, './csvs');
              if (fs.existsSync(csvsDir)) {
                const files = fs.readdirSync(csvsDir);
                for (const file of files) {
                  if (path.extname(file).toLowerCase() === '.csv') {
                    fs.unlinkSync(path.join(csvsDir, file));
                  }
                }
              }
              
              const masterFile = '/Users/ali/Desktop/Master Thesis/files/extracted_reforms_database.csv';
              const header = 'Vorschlag,Exaktes Verbatim,Quelldokument,Seitennummer,Kategorie,Verarbeitungsdatum\n';
              fs.writeFileSync(masterFile, header, 'utf8');
              
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
                  const { fileName } = JSON.parse(body);
                  if (!fileName) {
                    throw new Error('fileName is required.');
                  }
                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  const filePath = path.join(filesDir, fileName);
                  if (!fs.existsSync(filePath)) {
                    throw new Error(`File not found: ${filePath}`);
                  }
                  const fileBuffer = fs.readFileSync(filePath);
                  
                  // Construct FormData and post it to n8n manual webhook
                  const formData = new FormData();
                  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
                  formData.append('data', blob, fileName);

                  const n8nRes = await fetch(`http://localhost:5678/webhook/extract-reforms?fileName=${encodeURIComponent(fileName)}`, {
                    method: 'POST',
                    body: formData
                  });

                  if (!n8nRes.ok) {
                    throw new Error(`n8n extraction failed: ${n8nRes.statusText}`);
                  }

                  const arrayBuffer = await n8nRes.arrayBuffer();
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
          } else if (req.url.startsWith('/api/search-documents') && req.method === 'GET') {
            try {
              const category = new URL(req.url, 'http://localhost').searchParams.get('category') || 'Random';
              const n8nRes = await fetch(`http://localhost:5678/webhook/discover-reforms?category=${encodeURIComponent(category)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category })
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
                  const filesDir = '/Users/ali/Desktop/Master Thesis/files';
                  if (!fs.existsSync(filesDir)) {
                    fs.mkdirSync(filesDir, { recursive: true });
                  }

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

                      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
                      successCount++;
                    } catch (downloadErr: any) {
                      console.error(`Error downloading document from ${doc.url}:`, downloadErr.message);
                    }
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, successCount }));
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
    proxy: {
      '/webhook': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
