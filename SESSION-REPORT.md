# PDF CAD Converter - Session Report
**Date:** 2025-01-09
**Project:** SLT INDUSTRIA - PDF to JPEG Converter for Protheus ERP

---

## Executive Summary

Successfully implemented and tested a PDF-to-JPEG conversion service for CAD drawings. The service automatically converts PDF files placed in a watched folder to JPEG images in A4 portrait format at 300 DPI, compatible with Protheus report SLPCPR13.

---

## Project Status: ✅ PRODUCTION READY

| Component | Status | Notes |
|-----------|--------|-------|
| Core conversion | ✅ Complete | Multi-page PDFs working |
| File watcher | ✅ Complete | Detects new files AND file replacements |
| PM2 service | ✅ Running | Auto-start configured |
| Docker setup | ✅ Complete | Dockerfile + docker-compose.yml |
| Documentation | ✅ Complete | Ubuntu, Windows, Docker guides |
| Multi-page bug fix | ✅ Fixed | Stability check increased to 2 seconds |
| Cleanup on replace | ✅ Fixed | Old JPEGs deleted when PDF updated |

---

## Files Created/Modified

### Core Application Files
| File | Changes |
|------|----------|
| `src/pdfConverter.js` | Added Linux support (pdftoppm), fixed race condition, 10-cycle stability check |
| `src/fileWatcher.js` | Added `change` event detection, cleanupOldImages() function |
| `src/imageProcessor.js` | Fixed negative padding bug, centralized temp file cleanup |
| `.env` | Created with paths: WATCH_FOLDER and OUTPUT_FOLDER |

### New Files Created
| File | Purpose |
|------|---------|
| `Dockerfile` | Container image definition (Node 18 + Poppler) |
| `docker-compose.yml` | Multi-container orchestration |
| `.dockerignore` | Build optimization |
| `UBUNTU-INSTALL.md` | Ubuntu/Debian deployment guide |
| `WINDOWS-INSTALL.md` | Windows Server deployment guide |
| `DOCKER-DEPLOYMENT.md` | Docker deployment guide (Linux/Unix) |
| `DOCKER-WINDOWS.md` | **NEW** Docker on Windows deployment guide |
| `docker-compose.windows.yml` | **NEW** Windows-specific docker-compose template |

---

## Configuration

### Environment Variables (.env)
```bash
WATCH_FOLDER=/home/vshconsulting/Documents/clients/slt
OUTPUT_FOLDER=/home/vshconsulting/Documents/clients/slt/cad_jpeg
JPEG_QUALITY=90
DPI=300
LOG_LEVEL=info
LOG_FOLDER=./logs
```

### Protheus Integration
- **Parameter:** `MV_XIMGPF`
- **Value:** `/home/vshconsulting/Documents/clients/slt/cad_jpeg`
- **Report:** SLPCPR13.PRW (line 1289: IMPRIMEDESENHOS)
- **Expected filename format:** `DESENHO_REVCLIENTE_PAGE.jpg`
  - Example: `ABC123_01_1.jpg` (drawing ABC123, revision 01, page 1)

---

## Tests Performed

### Test 1: Single-Page PDFs ✅
- Input: `87161700_02.pdf` (1 page)
- Output: `87161700_02_1.jpg` (563 KB)
- Dimensions: 2480x3507 (A4 portrait @ 300 DPI)

### Test 2: Multi-Page PDFs ✅
- Input: `87161520_01.pdf` (2 pages)
- Output: `87161520_01_1.jpg`, `87161520_01_2.jpg`
- Both pages detected and converted (stability check fix)

### Test 3: File Replacement (2 pages → 1 page) ✅
- Original: 2-page PDF → 2 JPEGs created
- Replacement: 1-page PDF (same name) → 1 JPEG remains, old page 2 deleted
- Log: `PDF alterado/substituido: test_cleanup.pdf`

### Test 4: File Replacement (1 page → 2 pages) ✅
- Original: 1-page PDF → 1 JPEG created
- Replacement: 2-page PDF (same name) → 2 JPEGs created

---

## Current Output Files

```
/home/vshconsulting/Documents/clients/slt/cad_jpeg/
├── 87126900_02_1.jpg      (516 KB)
├── 87161520_01_1.jpg      (483 KB)
├── 87161520_01_2.jpg      (595 KB)  ← 2 pages
├── 87161700_02_1.jpg      (563 KB)
├── 87161800_02_1.jpg      (614 KB)
├── 87161900_02_1.jpg      (612 KB)
├── 87162020_01_1.jpg      (487 KB)
├── 87162100_02_1.jpg      (578 KB)
└── 87162200_02_1.jpg      (649 KB)
```

Plus many other drawings converted during testing (1028925xxx series, etc.)

---

## Key Fixes Implemented

### Fix 1: Linux Support (pdf-poppler doesn't support Linux)
**Problem:** `pdf-poppler` library only supports Windows and macOS.

**Solution:** Modified `pdfConverter.js` to use system `pdftoppm` command on Linux/macOS.

```javascript
if (platform === 'linux' || platform === 'darwin') {
    const cmd = `pdftoppm -jpeg -r ${config.dpi} "${pdfPath}" "${outputPath}"`;
    execSync(cmd, { encoding: 'utf8' });
    // Find generated files with stability check...
}
```

### Fix 2: Multi-Page Race Condition
**Problem:** Service detected only 1 of 2 pages because it checked stability too early.

**Solution:** Increased stability check from 3 cycles to 10 cycles (2 seconds).

```javascript
const MIN_STABLE_COUNT = 10;  // Was 3
// Wait until file count doesn't change for 10 consecutive checks
```

### Fix 3: Sharp Extend Negative Values
**Problem:** When image was larger than A4, `extend()` got negative padding values → crash.

**Solution:** Added `Math.max(0, ...)` to prevent negative values.

```javascript
const top = Math.max(0, Math.floor((targetHeight - metadataAfterResize.height) / 2));
```

### Fix 4: File Replacement Not Detected
**Problem:** Replacing a PDF with same name didn't trigger re-conversion.

**Solution:** Added `change` event listener to chokidar.

```javascript
watcher.on('change', (filePath) => {
    if (path.extname(filePath).toLowerCase() === '.pdf') {
        logger.info(`PDF alterado/substituido: ${path.basename(filePath)}`);
        processingFiles.delete(filePath);
        processFile(filePath, config).catch(err => {
            logger.error(`Erro no processamento: ${err.message}`);
        });
    }
});
```

### Fix 5: Old Pages Not Deleted on Update
**Problem:** When 2-page PDF replaced with 1-page PDF, old page 2 remained.

**Solution:** Added `cleanupOldImages()` function that deletes all matching JPEGs before processing.

```javascript
async function cleanupOldImages(baseName, outputFolder) {
    const pattern = new RegExp(`^${baseName}_\\d+\\.jpg$`);
    // Delete all matching files before creating new ones
}
```

---

## PM2 Service Status

```bash
pm2 list
# Currently running: pdf-converter | online | Uptime: ~18m (restarts on crash)
```

### PM2 Commands
```bash
pm2 list                    # List processes
pm2 logs pdf-converter       # View logs
pm2 restart pdf-converter     # Restart service
pm2 stop pdf-converter        # Stop service
pm2 monit                    # Real-time monitoring
pm2 save                     # Save current process list
pm2 startup                   # Configure auto-start on boot
```

**For auto-start on boot (run once):**
```bash
sudo env PATH=$PATH:/home/vshconsulting/.nvm/versions/node/v20.18.3/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u vshconsulting --hp /home/vshconsulting
```

---

## Remaining Tasks

### Optional Cleanup
| Task | Priority | Description |
|------|----------|-------------|
| Remove debug logging | Low | Remove `console.log` statements from source code |

### For Production Deployment (Windows)
| Task | Status |
|------|--------|
| Install on Windows Server | Pending |
| Configure network folder path | Pending |
| Set up Windows Service | Pending |

### For Docker Deployment
| Task | Status |
|------|--------|
| Test Docker build | Pending |
| Deploy to production server | Pending |

### For Windows + Docker Deployment (NEW)
| Task | Status |
|------|--------|
| Create Windows Docker documentation | ✅ Complete |
| Create docker-compose.windows.yml | ✅ Complete |
| Test on Windows with Docker Desktop | Pending |
| Configure Protheus MV_XIMGPF for Windows paths | Pending |

---

## Installation Guides Created

1. **UBUNTU-INSTALL.md** - Ubuntu/Debian deployment
2. **WINDOWS-INSTALL.md** - Windows Server deployment (native Node.js)
3. **DOCKER-DEPLOYMENT.md** - Docker container deployment (Linux/Unix)
4. **DOCKER-WINDOWS.md** - **NEW** Docker Desktop on Windows deployment

---

## Windows + Docker Deployment (NEW)

### Architecture Overview

The PDF converter runs in an **Alpine Linux container** via Docker Desktop for Windows (WSL2 backend). No Windows-specific Poppler installation is needed - everything runs inside the container.

### Key Components

| Component | Purpose |
|-----------|---------|
| Docker Desktop | Runs Linux containers on Windows via WSL2 |
| Alpine Linux image | Lightweight base with Poppler pre-installed |
| Volume mapping | Maps Windows folders to container paths |

### Docker Desktop Configuration

**Required Settings:**
- **General**: Enable WSL 2 based engine
- **Resources → File Sharing**: Add drives containing PDF/output folders
- **Resources → WSL Integration**: Enable for WSL distro

### Volume Mapping Options

| Option | docker-compose.yml | MV_XIMGPF (Protheus) | Use Case |
|--------|-------------------|----------------------|----------|
| A: Local | `C:/pdf-converter/output:/app/output` | `C:\pdf-converter\output` | Protheus on same machine |
| B: Network | `//server/share:/app/output` | `\\server\share` | Central file server |
| C: Mixed | Local watch + network output | Network path | Distributed CAD team |

### Quick Start (Windows)

```powershell
# 1. Create project folder
mkdir C:\pdf-converter
mkdir C:\pdf-converter\watch
mkdir C:\pdf-converter\output
mkdir C:\pdf-converter\logs

# 2. Copy project files to C:\pdf-converter\

# 3. Start container
cd C:\pdf-converter
docker-compose up -d --build

# 4. Test
copy "C:\CAD\desenho.pdf" "C:\pdf-converter\watch\"
dir "C:\pdf-converter\output\"
```

### Files Created for Windows Docker

| File | Purpose |
|------|---------|
| `DOCKER-WINDOWS.md` | Complete Windows deployment guide |
| `docker-compose.windows.yml` | Windows-specific template with 3 volume options |

---

## Troubleshooting

### Issue: PDFs not being processed
**Check:**
1. `pm2 list` - Is service running?
2. `pm2 logs pdf-converter` - Any errors?
3. `pdftoppm -v` - Is Poppler installed?

### Issue: Only 1 page converted from multi-page PDF
**Fixed:** Stability check increased to 10 cycles. If persists, check logs for "found files: X".

### Issue: Old pages remain after PDF update
**Fixed:** Cleanup function now deletes old JPEGs before processing.

### Issue: "linux is NOT supported"
**Fixed:** Now uses system `pdftoppm` on Linux instead of pdf-poppler.

---

## File Naming Convention

```
Input PDF:              ABC123_01.pdf
Output JPEGs:           ABC123_01_1.jpg, ABC123_01_2.jpg, etc.
                        │      │  │
                        │      │  └─ Page number (1-based)
                        │      └──── Revision (REVCLIENTE in Protheus)
                        └─────────── Drawing number (DESENHO in Protheus)
```

**Protheus Field Mapping:**
- `B1_X_DESEN` → Drawing number
- `B1_X_RECL` → Client revision
- `MV_XIMGPF` → Path to JPEG folder

---

## Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Poppler | 24.02.0 | PDF to image conversion |
| npm packages | See package.json | - |
| PM2 | 6.0.14 | Process manager |

**System dependencies:**
```bash
sudo apt install poppler-utils  # Ubuntu/Debian
sudo npm install -g pm2            # Process manager
```

---

## Next Session Tasks

1. **Remove debug logging** - Clean up `console.log` from `pdfConverter.js`
2. **Windows deployment** - Install on Windows Server for production
3. **Docker testing** - Test container build and deployment
4. **Protheus configuration** - Set `MV_XIMGPF` parameter in Protheus
5. **Network folder setup** - Configure shared folder for CAD team access

---

## Important Paths

```
Project:        /home/vshconsulting/Documents/protheus/codes/slt/pdf-converter
Watch folder:   /home/vshconsulting/Documents/clients/slt
Output folder:  /home/vshconsulting/Documents/clients/slt/cad_jpeg
Logs:           ./logs/ (in project folder)
PM2 dump:       /home/vshconsulting/.pm2/dump.pm2
```

---

## Contact Information

**SLT INDÚSTIA** - Metalworking/Manufacturing
- Protheus ERP integration
- CAD drawing automation
- Precision-critical workflow (no missing pages!)

**Service maintains:** All drawings must be converted, every page, every time.
