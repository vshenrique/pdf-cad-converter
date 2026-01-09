# PDF CAD Converter - Instalacao no Windows Server

## Requisitos
- Windows Server 2016+ ou Windows 10+
- Node.js 18+ (https://nodejs.org/)
- Git (opcional, para clonar o projeto)

## Instalacao

### 1. Instale Node.js
1. Baixe em: https://nodejs.org/
2. Execute o instalador (LTS version)
3. Verifique: Abra PowerShell e digite `node -v`

### 2. Baixe o projeto
```powershell
# Clone ou extraia para C:\pdf-converter
cd C:\
git clone <repository-url> pdf-converter
cd pdf-converter
```

### 3. Instale Poppler

**Opcao A: Download Manual**
1. Baixe de: https://github.com/oschwartz10612/poppler-windows/releases
2. Extraia para `C:\poppler`
3. Adicione `C:\poppler\Library\bin` ao PATH do sistema

**Opcao B: Via Chocolatey**
```powershell
choco install poppler
```

### 4. Instale dependencias NPM
```powershell
npm install
npm install -g pm2
npm install -g pm2-windows-startup
```

### 5. Configure o ambiente
```powershell
# Copie o arquivo de exemplo
copy .env.example .env

# Edite com notepad
notepad .env
```

Configure:
```ini
WATCH_FOLDER=C:\path\to\pdf\input
OUTPUT_FOLDER=C:\path\to\jpeg\output
JPEG_QUALITY=90
DPI=300
LOG_LEVEL=info
POPPLER_PATH=C:\poppler\Library\bin
```

### 6. Crie as pastas
```powershell
mkdir C:\pdf-input
mkdir C:\jpeg-output
```

### 7. Inicie o servico
```powershell
# Inicie com PM2
pm2 start ecosystem.config.cjs

# Configure auto-start
pm2-startup install
pm2 save
```

## Comandos PM2

| Comando | Descricao |
|---------|-----------|
| `pm2 list` | Lista processos |
| `pm2 logs pdf-converter` | Ver logs |
| `pm2 stop pdf-converter` | Parar |
| `pm2 restart pdf-converter` | Reiniciar |
| `pm2 delete pdf-converter` | Remover |

## Teste

```powershell
# Copie um PDF
copy teste.pdf C:\pdf-input\

# Verifique o output
dir C:\jpeg-output\
```

## Integracao com Protheus

Configure `MV_XIMGPF`:
```
\\servidor\jpeg-output
```
ou use unidade mapeada (ex: `Z:\output`).

## Solucao de Problemas

### "pdftoppm nao encontrado"
- Verifique POPPLER_PATH no .env
- Confirme que `C:\poppler\Library\bin\pdftoppm.exe` existe
- Adicione ao PATH do sistema se necessario

### Firewall bloqueando
- Libere porta para Node.js (se necessario)
- Configure excecao no Windows Defender

### Servico nao inicia no boot
```powershell
# Reinstale o startup
pm2-startup uninstall
pm2-startup install
pm2 save
```

## Executar como Servico Windows (Opcional)

Para executar como servico nativo do Windows em vez de PM2:

1. Crie um arquivo `pdf-converter-service.xml`:
```xml
<service>
  <id>pdf-converter</id>
  <name>PDF CAD Converter</name>
  <description>Converte PDFs para JPEG para Protheus</description>
  <executable>C:\Program Files\nodejs\node.exe</executable>
  <arguments>C:\pdf-converter\src\index.js</arguments>
  <logpath>C:\pdf-converter\logs</logpath>
</service>
```

2. Instale o NSSM (https://nssm.cc/):
```powershell
nssm install pdf-converter "C:\Program Files\nodejs\node.exe" "C:\pdf-converter\src\index.js"
nssm set pdf-converter AppDirectory "C:\pdf-converter"
nssm start pdf-converter
```
