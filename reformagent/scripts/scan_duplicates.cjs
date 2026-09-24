const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const filesDir = "/Users/ali/Desktop/Master Thesis/files";
const processedDir = path.join(filesDir, "processed files");

function scanDirectory(dir, label) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const items = [];
  for (const f of entries) {
    if (f.toLowerCase().endsWith(".pdf")) {
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          const buf = fs.readFileSync(fullPath);
          const hash = crypto.createHash("sha256").update(buf).digest("hex");
          items.push({
            fileName: f,
            filePath: fullPath,
            sizeBytes: buf.length,
            hash,
            location: label
          });
        }
      } catch (err) {
        console.error("Error reading file:", fullPath, err.message);
      }
    }
  }
  return items;
}

console.log("=== PDF Repository Duplicate Scanner ===");
console.log("Scanning directories...");
const incomingDocs = scanDirectory(filesDir, "incoming");
const processedDocs = scanDirectory(processedDir, "processed");
const allDocs = [...incomingDocs, ...processedDocs];

console.log(`Found ${incomingDocs.length} incoming PDFs and ${processedDocs.length} processed PDFs (${allDocs.length} total).\n`);

const byHash = {};
for (const doc of allDocs) {
  if (!byHash[doc.hash]) byHash[doc.hash] = [];
  byHash[doc.hash].push(doc);
}

const duplicateGroups = Object.entries(byHash).filter(([h, list]) => list.length > 1);

if (duplicateGroups.length === 0) {
  console.log("No byte-level identical PDF duplicates found in the repository!");
  process.exit(0);
}

console.log(`Found ${duplicateGroups.length} group(s) of identical PDF files:\n`);

let totalRedundantFiles = 0;
let totalBytesSaved = 0;

duplicateGroups.forEach(([hash, files], idx) => {
  console.log(`[Group ${idx + 1}] SHA-256: ${hash.slice(0, 16)}...`);
  
  const processedFirst = [...files].sort((a, b) => (b.location === "processed" ? 1 : 0) - (a.location === "processed" ? 1 : 0));
  const primary = processedFirst[0];
  const duplicates = processedFirst.slice(1);

  console.log(`  KEEP (Primary): [${primary.location}] ${primary.fileName} (${primary.sizeBytes} bytes)`);
  duplicates.forEach(d => {
    console.log(`  DUPLICATE:      [${d.location}] ${d.fileName} -> will be removed`);
    totalRedundantFiles++;
    totalBytesSaved += d.sizeBytes;
    
    try {
      fs.unlinkSync(d.filePath);
      console.log(`    -> Successfully deleted redundant file.`);
    } catch (e) {
      console.error(`    -> Error deleting file: ${e.message}`);
    }
  });
  console.log("");
});

console.log(`Done! Cleaned up ${totalRedundantFiles} duplicate file(s) (saved ${(totalBytesSaved / 1024 / 1024).toFixed(2)} MB).`);
