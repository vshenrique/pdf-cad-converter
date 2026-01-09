# PDF CAD Converter

Aplicação Node.js que monitora uma pasta por arquivos PDF contendo desenhos CAD e os converte automaticamente para imagens JPEG em formato A4 portrait a 300 DPI.

Integrado com Protheus ERP para impressão de desenhos técnicos em ordens de produção.

---

## Características

- Monitoramento automático de pasta (rede ou local)
- Conversão PDF → JPEG em 300 DPI (alta qualidade)
- Redimensionamento automático para A4 portrait
- Suporte a multi-páginas (todas as páginas são convertidas)
- Suporte a tamanhos variados (A4, A3, A2, A1, landscape)
- Detecção de substituição de arquivos (reprocessa PDFs atualizados)
- Auto-restart em caso de falha (PM2)
- Cross-platform (Windows, Linux, Docker)

---

## Guia de Instalação

Escolha seu ambiente para ver as instruções detalhadas:

| Ambiente | Documentação | Status |
|----------|--------------|--------|
| [Ubuntu / Debian](UBUNTU-INSTALL.md) | [UBUNTU-INSTALL.md](UBUNTU-INSTALL.md) | ✅ Testado |
| [Windows Server](WINDOWS-INSTALL.md) | [WINDOWS-INSTALL.md](WINDOWS-INSTALL.md) | ✅ Documentado |
| [Docker (Linux)](DOCKER-DEPLOYMENT.md) | [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) | ✅ Documentado |
| [Docker + Windows](DOCKER-WINDOWS.md) | [DOCKER-WINDOWS.md](DOCKER-WINDOWS.md) | ✅ Documentado |

---

## Resumo Rápido

### Ubuntu/Debian com PM2
```bash
# Instalar dependências
sudo apt install poppler-utils
sudo npm install -g pm2

# Configurar e iniciar
npm install
cp .env.example .env
# Edite .env com seus caminhos
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Auto-start no boot
```

### Windows + Docker Desktop
```powershell
# Criar pastas
mkdir C:\pdf-converter\watch, output, logs

# Iniciar container
docker-compose up -d --build
```

### Docker (Linux)
```bash
docker-compose up -d --build
```

---

## Configuração

Edite o arquivo `.env` com as seguintes variáveis:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `WATCH_FOLDER` | Pasta a monitorar (obrigatório) | - |
| `OUTPUT_FOLDER` | Pasta de saída dos JPEGs (obrigatório) | - |
| `JPEG_QUALITY` | Qualidade JPEG (0-100) | 90 |
| `DPI` | Resolução da conversão | 300 |
| `LOG_LEVEL` | Nível de log (error, warn, info, debug) | info |
| `LOG_FOLDER` | Pasta para logs | ./logs |

### Exemplo de configuração (.env)
```bash
# Ubuntu/Debian
WATCH_FOLDER=/home/user/documents/cad
OUTPUT_FOLDER=/home/user/documents/cad_jpeg

# Windows
WATCH_FOLDER=C:\CAD\Input
OUTPUT_FOLDER=C:\CAD\Output
```

---

## Integração Protheus

### Parâmetro MV_XIMGPF

Configure no Protheus (MATA020 - SX6):

| Ambiente | Valor do MV_XIMGPF |
|----------|-------------------|
| Ubuntu local | `/home/user/documents/cad_jpeg` |
| Windows local | `C:\CAD\Output` |
| Rede (Linux) | `//server/share/cad_jpeg` |
| Rede (Windows) | `\\server\share\cad_jpeg` |

### Campos Customizados (SB1)

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `B1_X_DESEN` | Número do desenho | `ABC-123` |
| `B1_X_RECL` | Revisão cliente | `01` |

### Relatório

- **SLPCPR13.PRW** (linha 1289: `IMPRIMEDESENHOS`)
- Busca JPEGs em `MV_XIMGPF` com padrão: `<DESENHO>_<REVCLIENTE>_<PAGE>.jpg`

---

## Estrutura de Arquivos

```
# Entrada
WATCH_FOLDER/
├── 87161520_01.pdf     # Desenho 87161520, revisão 01
└── 87161700_02.pdf     # Desenho 87161700, revisão 02

# Saída
OUTPUT_FOLDER/
├── 87161520_01_1.jpg   # Página 1
├── 87161520_01_2.jpg   # Página 2 (multi-página)
└── 87161700_02_1.jpg   # Página 1
```

### Convenção de Nomes

```
<DESENHO>_<REVCLIENTE>_<PAGE>.jpg
    │         │         │
    │         │         └─ Número da página (1-based)
    │         └────────── Revisão cliente
    └──────────────────── Número do desenho
```

---

## Comandos PM2

```bash
pm2 list                    # Lista processos
pm2 logs pdf-converter      # Ver logs em tempo real
pm2 logs pdf-converter --lines 100  # Últimas 100 linhas
pm2 stop pdf-converter      # Para o serviço
pm2 start pdf-converter     # Inicia o serviço
pm2 restart pdf-converter   # Reinicia
pm2 delete pdf-converter    # Remove do PM2
pm2 monit                   # Monitoramento em tempo real
pm2 save                    # Salva lista de processos
pm2 startup                 # Configura auto-start no boot
```

---

## Como Funciona

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CAD salva     │───▶│  File Watcher    │───▶│  PDF Converter  │
│   arquivo PDF   │    │  (Chokidar)      │    │  (pdftoppm)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Protheus       │◀───│  JPEG Output     │◀───│  Image Processor│
│  (SLPCPR13)     │    │  <DESENHO>_<REV> │    │  (Sharp)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

1. **Detecção**: Chokidar monitora a pasta por novos/alterados `.pdf`
2. **Conversão**: pdftoppm extrai cada página como JPEG temporário
3. **Processamento**: Sharp redimensiona para A4 portrait @ 300 DPI
4. **Salvamento**: JPEGs salvos com sufixo `_1`, `_2`, etc.
5. **Limpeza**: Arquivos temporários deletados após sucesso

---

## Lógica de Escala

| Original | Largura (mm) | Altura (mm) | Scale Resultante |
|----------|--------------|-------------|------------------|
| A1 landscape | 841 | 594 | ~0.25x |
| A2 landscape | 594 | 420 | ~0.35x |
| A3 landscape | 420 | 297 | ~0.5x |
| A4 landscape | 297 | 210 | ~0.71x |
| **A4 portrait** | **210** | **297** | **1.0x** |

A aplicação detecta automaticamente as dimensões e calcula o fator de escala para caber em A4 portrait (210×297mm) sem distorção, com centralização.

---

## Troubleshooting

### Problema: PDFs não são processados

**Verificações:**
```bash
# PM2 está rodando?
pm2 list

# Ver logs
pm2 logs pdf-converter

# Poppler instalado?
pdftoppm -v    # Linux
# ou verifique install-windows.bat (Windows)
```

### Problema: Apenas 1 página de multi-página PDF

**Solução:** Já corrigido - stability check de 10 ciclos (2 segundos) garante que todas as páginas sejam detectadas.

### Problema: Páginas antigas permanecem após atualizar PDF

**Solução:** Já corrigido - cleanup automático deleta JPEGs antigos antes de reprocessar.

### Problema: Erro "linux is NOT supported"

**Solução:** Já corrigido - usa `pdftoppm` do sistema em vez de pdf-poppler.

---

## Documentação Adicional

| Arquivo | Descrição |
|---------|-----------|
| [SESSION-REPORT.md](SESSION-REPORT.md) | Relatório completo da sessão de desenvolvimento |
| [UBUNTU-INSTALL.md](UBUNTU-INSTALL.md) | Guia de instalação Ubuntu/Debian |
| [WINDOWS-INSTALL.md](WINDOWS-INSTALL.md) | Guia de instalação Windows Server |
| [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) | Deploy com Docker (Linux) |
| [DOCKER-WINDOWS.md](DOCKER-WINDOWS.md) | Deploy com Docker Desktop no Windows |

---

## Logs

- `logs/app-YYYY-MM-DD.log`: Logs gerais
- `logs/error-YYYY-MM-DD.log`: Apenas erros
- Rotação automática diária

---

## Licença

MIT
