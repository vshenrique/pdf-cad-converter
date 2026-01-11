# PDF CAD Converter - Deploy com Docker (Linux)

## Requisitos
- Docker 20.10+ instalado
- Docker Compose v2.0+ (comando: `docker compose`)

## Instalação do Docker

### Ubuntu/Debian
```bash
# 1. Atualizar pacotes
sudo apt-get update

# 2. Instalar dependências
sudo apt-get install -y ca-certificates curl gnupg

# 3. Adicionar chave GPG oficial do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 4. Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Adicionar usuário ao grupo docker (importante!)
sudo usermod -aG docker $USER

# 7. Fazer logout e login novamente para aplicar grupo

# 8. Verificar instalação
docker --version
docker compose version
```

## Deploy Rápido

### 1. Prepare o ambiente
```bash
# Clone ou baixe o projeto
cd /opt/pdf-converter

# Crie as pastas de volume
mkdir -p watch output logs
```

### 2. Configure (opcional)
Edite `.env` se precisar sobrescrever configurações:
```bash
WATCH_FOLDER=/app/watch
OUTPUT_FOLDER=/app/output
LOG_LEVEL=info
JPEG_QUALITY=90
DPI=300
USE_POLLING=false  # Use true para pastas de rede/NFS
```

### 3. Build e Start
```bash
# Build e inicia em um comando
docker compose up -d --build

# Ou apenas start se já buildou
docker compose up -d
```

### 4. Verifique o status
```bash
docker compose ps
docker compose logs -f pdf-converter
```

## Teste Local (Ambiente de Desenvolvimento)

Para testar sem afetar o ambiente de produção:

```bash
# 1. Criar pastas de teste
mkdir -p docker-test/watch docker-test/output docker-test/logs

# 2. Usar docker-compose de teste
docker compose -f docker-compose.test.yml up -d --build

# 3. Copiar PDF para teste
cp arquivo.pdf docker-test/watch/

# 4. Verificar resultado
ls -la docker-test/output/

# 5. Ver logs
docker compose logs -f pdf-converter
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

### Comandos Úteis
```bash
# Ver logs (Docker Compose v2)
docker compose logs -f pdf-converter

# Reiniciar
docker compose restart pdf-converter

# Parar
docker compose down

# Atualizar após mudança no código
docker compose up -d --build

# Ver status dos containers
docker compose ps
```

## Deploy Produção

### Auto-restart
O container já está configurado com `restart: unless-stopped`.

### Limitar recursos
Já configurado no docker-compose.yml:
- Memória máxima: 512MB
- Memória reservada: 256MB

### Logs persistentes
O volume `./logs` mantém os logs mesmo após reiniciar o container.

### Montagem de rede

**Opção A: Pastas locais**
```yaml
volumes:
  - ./watch:/app/watch
  - ./output:/app/output
```

**Opção B: Pasta de rede (NFS/SMB)**
```yaml
volumes:
  - /mnt/server/share/pdf:/app/watch
  - /mnt/server/share/jpeg:/app/output
```

**Opção C: Docker named volume**
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

## Integração com Protheus

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

### Permission denied
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout e login
# Ou executar:
newgrp docker
```

### Container não inicia
```bash
# Verifique os logs
docker compose logs pdf-converter

# Entre no container para debug
docker compose run pdf-converter sh
```

### Arquivos não são convertidos
```bash
# Verifique permissões
ls -la watch/ output/

# Verifique se o container consegue escrever
docker compose exec pdf-converter ls -la /app/output
```

### Atualizar imagem
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## Backup dos Dados

Os arquivos convertidos estão no volume `./output` - faça backup regular desta pasta.

```bash
# Backup simples
tar -czf pdf-converter-backup-$(date +%Y%m%d).tar.gz output/

# Ou use rsync
rsync -av output/ /backup/location/
```

## Segurança

### Execute como usuário não-root
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

## Notas Importantes

### Docker Compose v1 vs v2
- **v1**: `docker-compose` (hífen)
- **v2**: `docker compose` (sem hífen) - **Recomendado**

Esta documentação usa comandos da v2. Se estiver usando v1, substitua `docker compose` por `docker-compose`.
