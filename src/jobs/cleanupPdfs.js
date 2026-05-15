/**
 * Limpia archivos temporales de public/pdfs/ y public/uploads/scan-*
 * que superen los 30 días de antigüedad.
 *
 * Cron recomendado (3 AM diario, después del backup):
 *   0 3 * * * cd /opt/edusaas && node src/jobs/cleanupPdfs.js >> /opt/edusaas/backups/cleanup.log 2>&1
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.join(__dirname, '..', '..');
const PDF_DIR      = path.join(ROOT, 'public', 'pdfs');
const UPLOADS_DIR  = path.join(ROOT, 'public', 'uploads');
const MAX_AGE_DAYS = 30;
const MAX_AGE_MS   = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function deleteOldFiles(dir, matchFn) {
  if (!fs.existsSync(dir)) return { count: 0, bytes: 0 };

  const now   = Date.now();
  let count   = 0;
  let bytes   = 0;

  for (const name of fs.readdirSync(dir)) {
    if (!matchFn(name)) continue;
    const filePath = path.join(dir, name);
    try {
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > MAX_AGE_MS) {
        bytes += stat.size;
        fs.unlinkSync(filePath);
        count++;
      }
    } catch {
      // Ignorar errores por archivo individual (ya borrado, permiso, etc.)
    }
  }

  return { count, bytes };
}

function run() {
  const ts = new Date().toISOString();

  const pdfs    = deleteOldFiles(PDF_DIR,     n => n.endsWith('.pdf'));
  const scans   = deleteOldFiles(UPLOADS_DIR, n => n.startsWith('scan-'));

  const totalCount = pdfs.count + scans.count;
  const totalMB    = ((pdfs.bytes + scans.bytes) / (1024 * 1024)).toFixed(2);

  console.log(
    `[cleanup] ${ts} — PDFs: ${pdfs.count} | Scans: ${scans.count} | Total: ${totalCount} archivos, ${totalMB} MB liberados`
  );
}

run();
