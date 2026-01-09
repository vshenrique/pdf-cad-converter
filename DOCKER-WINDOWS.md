# PDF CAD Converter - Windows + Docker Deployment

## Overview

This guide explains how to run the PDF CAD Converter on Windows using Docker Desktop. The application runs in an **Alpine Linux container** (via Docker Desktop's WSL2 backend), which includes Poppler for PDF conversion.

**Key Point:** No Windows-specific Poppler installation is needed - everything runs inside the Linux container.

---

## Prerequisites

| Requirement | Version | How to Install |
|-------------|---------|----------------|
| Windows 10/11 | Pro/Enterprise | N/A |
| Docker Desktop | 4.15+ | https://www.docker.com/products/docker-desktop/ |
| WSL2 | Latest | `wsl --install` (Admin PowerShell) |

### 1. Install WSL2 (if not already installed)

Open PowerShell as Administrator:

```powershell
# Enable WSL
wsl --install

# Restart computer when prompted
# After restart, install Ubuntu from Microsoft Store if prompted
```

### 2. Install Docker Desktop

1. Download Docker Desktop for Windows from https://www.docker.com/products/docker-desktop/
2. Run installer with **"Use WSL 2 based engine"** checked
3. Complete installation and restart
4. Launch Docker Desktop

### 3. Configure Docker Desktop

**Settings → General:**
- [x] Use the WSL 2 based engine

**Settings → Resources → File Sharing:**
- Add drives or folders that contain PDF and output directories
- Example: Add `C:\` drive or specific folders

**Settings → Resources → WSL Integration:**
- Enable integration for your WSL distro (Ubuntu/Debian)

---

## Project Setup

### Directory Structure

Create project folder on Windows:

```
C:\pdf-converter\
├── src\                    # Application source code
├── package.json            # Node.js dependencies
├── Dockerfile              # Container image definition
├── docker-compose.yml      # Service orchestration
├── watch\                  # INPUT: Place PDFs here for conversion
├── output\                 # OUTPUT: Converted JPEGs appear here
└── logs\                   # Application logs
```

### Create Folders

```powershell
# Open PowerShell
mkdir C:\pdf-converter
mkdir C:\pdf-converter\watch
mkdir C:\pdf-converter\output
mkdir C:\pdf-converter\logs
```

### Copy Project Files

Copy all files from the project to `C:\pdf-converter\`:
- All `src\` files
- `package.json`
- `Dockerfile`
- `docker-compose.yml`

---

## Configuration

### docker-compose.yml for Windows

Create or edit `docker-compose.yml`:

```yaml
version: '3.8'

services:
  pdf-converter:
    build: .
    container_name: pdf-converter
    restart: unless-stopped

    # Option A: Local Windows folders (recommended for single machine)
    volumes:
      - C:/pdf-converter/watch:/app/watch
      - C:/pdf-converter/output:/app/output
      - C:/pdf-converter/logs:/app/logs

    # Option B: Network shares (if PDFs/JPEGs on file server)
    # volumes:
    #   - //fileserver/slt/cad-input:/app/watch
    #   - //fileserver/slt/cad_jpeg:/app/output
    #   - C:/pdf-converter/logs:/app/logs

    environment:
      - WATCH_FOLDER=/app/watch
      - OUTPUT_FOLDER=/app/output
      - LOG_FOLDER=/app/logs
      - LOG_LEVEL=info
      - JPEG_QUALITY=90
      - DPI=300

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

**Important:** Use forward slashes (`/`) in docker-compose.yml even on Windows.

### Volume Path Reference

| Windows Path | Docker Volume Path | Container Path |
|--------------|-------------------|----------------|
| `C:\pdf-converter\watch` | `C:/pdf-converter/watch:/app/watch` | `/app/watch` |
| `C:\pdf-converter\output` | `C:/pdf-converter/output:/app/output` | `/app/output` |
| `\\server\share\folder` | `//server/share/folder:/app/folder` | `/app/folder` |

---

## Deployment

### Start the Service

```powershell
# Navigate to project folder
cd C:\pdf-converter

# Build and start (first time)
docker-compose up -d --build

# Or just start if already built
docker-compose up -d
```

### Verify Status

```powershell
# Check container is running
docker-compose ps

# View logs
docker-compose logs -f pdf-converter

# Press Ctrl+C to exit logs view
```

Expected output in logs:
```
[INFO] Iniciando monitoramento: /app/watch
[INFO] Pasta de saída: /app/output
[INFO] Monitoramento ativo. Aguardando novos arquivos PDF...
```

---

## Testing

### Test 1: Single Page PDF

```powershell
# Copy a PDF to the watch folder
copy "C:\CAD\desenho.pdf" "C:\pdf-converter\watch\"

# Wait 2-3 seconds, check output
dir "C:\pdf-converter\output\"

# Should see: desenho_1.jpg
```

### Test 2: Multi-Page PDF

```powershell
# Copy a multi-page PDF
copy "C:\CAD\multipagina.pdf" "C:\pdf-converter\watch\"

# Check output
dir "C:\pdf-converter\output\"

# Should see: multipagina_1.jpg, multipagina_2.jpg, etc.
```

### Test 3: File Replacement

```powershell
# Replace an existing PDF with new version
copy "C:\CAD\desenho_v2.pdf" "C:\pdf-converter\watch\desenho.pdf"

# Old JPEGs should be deleted, new ones created
dir "C:\pdf-converter\output\"
```

---

## Protheus Integration

### Configure MV_XIMGPF Parameter

The `MV_XIMGPF` parameter tells Protheus where to find the JPEG files.

Access Protheus: `MATA020` (SX6 table) and set `MV_XIMGPF` based on your scenario:

| Scenario | MV_XIMGPF Value | Setup Required |
|----------|-----------------|----------------|
| **Protheus on same Windows machine** | `C:\pdf-converter\output` | None (direct path) |
| **Protheus on different server (LAN)** | `\\docker-host\output` | Share output folder via Windows file sharing |
| **Protheus on different server (SMB share)** | `\\fileserver\slt\cad_jpeg` | Use network share volume in docker-compose |

### Scenario 1: Protheus on Same Machine

Simplest setup - Protheus directly accesses the output folder:

1. Set `MV_XIMGPF = C:\pdf-converter\output`
2. Ensure Protheus service account has read access to this folder

### Scenario 2: Protheus on Different Server

Share the output folder from the Docker host:

**On Docker host (Windows):**
```powershell
# Share the output folder
net share cad_jpeg=C:\pdf-converter\output /grant:Everyone,READ
```

**On Protheus server:**
- Set `MV_XIMGPF = \\docker-host\cad_jpeg`

### Scenario 3: Using Network Share (Recommended for Production)

Both Docker and Protheus access a central SMB share:

```yaml
# docker-compose.yml
volumes:
  - //fileserver/slt/cad-input:/app/watch
  - //fileserver/slt/cad_jpeg:/app/output
```

**On Protheus:**
- Set `MV_XIMGPF = \\fileserver\slt\cad_jpeg`

---

## Network Share Configuration

### Accessing SMB Shares from Docker

To access Windows network shares from within the Docker container:

#### Option A: UNC Path in docker-compose

```yaml
volumes:
  - //server-name/share-name:/app/watch
```

**Requirements:**
- Docker Desktop must have SMB credentials
- Configure in Docker Desktop → Settings → Resources → File Sharing

#### Option B: Mapped Drive

```powershell
# Map network drive
net use Z: \\server-name\share-name /persistent:yes
```

```yaml
# docker-compose.yml
volumes:
  - Z:/app/watch
```

#### Option C: Mount Point (WSL2)

```bash
# In WSL2 terminal
sudo mkdir /mnt/share
sudo mount -t drvfs '\\server\share' /mnt/share
```

---

## Troubleshooting

### Container Won't Start

```powershell
# Check logs
docker-compose logs pdf-converter

# Check container status
docker ps -a
```

**Common causes:**
- Port conflict (unlikely - no exposed ports needed)
- Volume path incorrect
- Docker not running

### Files Not Being Detected

**Issue:** PDFs copied to `watch` folder aren't converted.

**Solutions:**
1. Verify WSL2 backend is enabled in Docker Desktop
2. Check Docker Desktop has file sharing enabled for the drive
3. Verify logs show "Monitoramento ativo"

### Network Share Not Accessible

**Issue:** Container can't access `\\server\share`

**Solutions:**
1. Verify UNC path uses forward slashes: `//server/share`
2. Check Docker Desktop credentials for SMB access
3. Try mapped drive approach instead

### Protheus Can't See JPEGs

**Issue:** MV_XIMGPF configured but Protheus can't access files.

**Solutions:**
1. Verify Protheus service account has read permissions
2. Test path from Protheus server: `dir \\docker-host\output`
3. Check firewall rules if accessing across network

### Performance Issues

**Issue:** Slow conversion or file detection.

**Solutions:**
1. Enable WSL2 backend (better performance than Hyper-V)
2. Increase Docker memory limit (Settings → Resources → Memory)
3. Use local folders instead of network shares if possible

---

## Management Commands

```powershell
# Start service
docker-compose start

# Stop service
docker-compose stop

# Restart service
docker-compose restart

# View logs (live)
docker-compose logs -f pdf-converter

# View logs (last 100 lines)
docker-compose logs --tail=100 pdf-converter

# Rebuild after code changes
docker-compose up -d --build

# Remove container and volumes
docker-compose down -v

# Check resource usage
docker stats pdf-converter
```

---

## Updates and Maintenance

### Update Application

```powershell
# 1. Stop service
docker-compose down

# 2. Copy new source files to C:\pdf-converter\

# 3. Rebuild and start
docker-compose up -d --build
```

### Backup Data

```powershell
# Backup converted JPEGs
Copy-Item -Path "C:\pdf-converter\output" -Destination "C:\backup\cad_jpeg" -Recurse

# Or use robocopy
robocopy "C:\pdf-converter\output" "C:\backup\cad_jpeg" /E
```

### Clean Old Logs

```powershell
# Remove logs older than 30 days
Get-ChildItem "C:\pdf-converter\logs\*.log" | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
```

---

## Security Considerations

### Run as Non-Root (Optional)

For production, modify `Dockerfile` to run as non-root user:

```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

### Limit Container Resources

Already configured in docker-compose.yml:
- Memory limit: 512MB
- Memory reservation: 256MB

### File Permissions

- Ensure Protheus service account has **read-only** access to output folder
- CAD users need **write** access to watch folder (or copy files there)
- Docker service needs appropriate access to volumes

---

## Appendix: File Naming Convention

```
Input PDF:              ABC123_01.pdf
Output JPEGs:           ABC123_01_1.jpg, ABC123_01_2.jpg, etc.
                        │      │  │
                        │      │  └─ Page number (1-based)
                        │      └──── Revision (REVCLIENTE in Protheus)
                        └─────────── Drawing number (DESENHO in Protheus)
```

**Protheus Field Mapping:**
- `B1_X_DESEN` → Drawing number (ABC123)
- `B1_X_RECL` → Client revision (01)
- `MV_XIMGPF` → Path to JPEG folder
- Report: `SLPCPR13.PRW` (line 1289: IMPRIMEDESENHOS)
