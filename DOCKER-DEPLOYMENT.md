# PDF CAD Converter - Deploy com Docker

## Requisitos
- Docker 20.10+ instalado
- Docker Compose v2.0+

## Deploy Rapido

### 1. Prepare o ambiente
```bash
# Clone ou baixe o projeto
cd /opt/pdf-converter

# Crie as pastas de volume
mkdir -p watch output logs
```

### 2. Configure (opcional)
Edite `.env` se precisar sobrescrever configuracoes:
```bash
WATCH_FOLDER=/app/watch
OUTPUT_FOLDER=/app/output
LOG_LEVEL=info
JPEG_QUALITY=90
DPI=300
```

### 3. Build e Start
```bash
# Build e inicia em um comando
docker-compose up -d --build

# Ou apenas start se ja buildou
docker-compose up -d
```

### 4. Verifique o status
```bash
docker-compose ps
docker-compose logs -f pdf-converter
```

## Uso

### Converter PDFs
```bash
# Copie PDFs para a pasta watch
cp desenho.pdf watch/

# Verifique o output
ls output/
# desenho_1.jpg, desenho_2.jpg, etc
```

### Comandos Uteis
```bash
# Ver logs
docker-compose logs -f pdf-converter

# Reiniciar
docker-compose restart pdf-converter

# Parar
docker-compose down

# Atualizar apos mudanca no codigo
docker-compose up -d --build
```

## Deploy Producao

### Auto-restart
O container ja esta configurado com `restart: unless-stopped`.

### Limitar recursos
Ja configurado no docker-compose.yml:
- Memoria maxima: 512MB
- Memoria reservada: 256MB

### Logs persistentes
O volume `./logs` mantem os logs mesmo apos reiniciar o container.

### Montagem de rede

**Opcao A: Pastas locais**
```yaml
volumes:
  - ./watch:/app/watch
  - ./output:/app/output
```

**Opcao B: Pasta de rede (NFS/SMB)**
```yaml
volumes:
  - /mnt/server/share/pdf:/app/watch
  - /mnt/server/share/jpeg:/app/output
```

**Opcao C: Docker named volume**
```yaml
volumes:
  - pdf-data:/app/data

volumes:
  pdf-data:
    driver: local
    driver_opts:
      type: none
      device: /path/to/share
      o: bind
```

## Integracao com Protheus

### Linux Host
Protheus pode acessar: `/opt/pdf-converter/output`

### Windows Host
1. Compartilhe a pasta `output` no Windows
2. No Protheus configure: `\\docker-host\output`

### Docker Network
Se Protheus estiver em outro container:
```yaml
networks:
  - protheus-net

networks:
  protheus-net:
    external: true
```

## Troubleshooting

### Container nao inicia
```bash
# Verifique os logs
docker-compose logs pdf-converter

# Entre no container para debug
docker-compose run pdf-converter sh
```

### Arquivos nao sao convertidos
```bash
# Verifique permissoes
ls -la watch/ output/

# Verifique se o container consegue escrever
docker-compose exec pdf-converter ls -la /app/output
```

### Atualizar imagem
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Backup dos Dados

Os arquivos convertidos estao no volume `./output` - faca backup regular desta pasta.

```bash
# Backup simples
tar -czf pdf-converter-backup-$(date +%Y%m%d).tar.gz output/

# Ou use rsync
rsync -av output/ /backup/location/
```

## Seguranca

### Execute como usuario nao-root
Adicione ao Dockerfile:
```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs
```

### Read-only filesystem
```yaml
cap_drop:
  - ALL
cap_add:
  - CHOWN
  - SETGID
  - SETUID
read_only: true
tmpfs:
  - /tmp
```
