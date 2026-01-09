# PDF CAD Converter - Instalacao no Ubuntu/Debian

## Requisitos
- Ubuntu 20.04+ ou Debian 11+
- Acesso sudo para instalacao de pacotes

## Instalacao Rapida

### 1. Baixe o projeto
```bash
cd /opt
git clone <repository-url> pdf-converter
cd pdf-converter
```

Ou copie a pasta do projeto para o servidor.

### 2. Instale dependencias
```bash
# Instale Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instale Poppler
sudo apt install -y poppler-utils

# Instale dependencias NPM
npm install

# Instale PM2 globalmente
sudo npm install -g pm2
```

### 3. Configure o ambiente
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Edite a configuracao
nano .env
```

Configure as variaveis:
```bash
WATCH_FOLDER=/caminho/para/pdf/input
OUTPUT_FOLDER=/caminho/para/jpeg/output
JPEG_QUALITY=90
DPI=300
LOG_LEVEL=info
```

### 4. Crie as pastas
```bash
mkdir -p /caminho/para/pdf/input
mkdir -p /caminho/para/jpeg/output
```

### 5. Inicie o servico
```bash
# Inicie com PM2
pm2 start ecosystem.config.cjs

# Salve a configuracao
pm2 save

# Configure auto-start no boot
pm2 startup
# Execute o comando exibido acima (sudo env PATH=...)
```

## Comandos PM2 Uteis

| Comando | Descricao |
|---------|-----------|
| `pm2 list` | Lista processos |
| `pm2 logs pdf-converter` | Ver logs em tempo real |
| `pm2 stop pdf-converter` | Para o servico |
| `pm2 start pdf-converter` | Inicia o servico |
| `pm2 restart pdf-converter` | Reinicia |
| `pm2 monit` | Monitoramento em tempo real |

## Teste

```bash
# Copie um PDF para a pasta de input
cp teste.pdf /caminho/para/pdf/input/

# Verifique a pasta de output
ls /caminho/para/jpeg/output/
```

## Integracao com Protheus

Configure o parametro `MV_XIMGPF` no Protheus:
1. Acesse `MATA020` (SX6)
2. Edite `MV_XIMGPF`
3. Defina valor: `/caminho/para/jpeg/output`

## Solucao de Problemas

### Servico nao inicia
```bash
# Verifique os logs
pm2 logs pdf-converter --lines 50

# Verifique se Poppler esta instalado
pdftoppm -v
```

### PDFs nao sao processados
- Verifique permissoes das pastas
- Confirme que o .env esta configurado corretamente
- Verifique se WATCH_FOLDER existe

### Porta em uso
```bash
# Este servico nao usa porta, mas se houver conflito:
sudo lsof -i :3000
```
