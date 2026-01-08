# PDF CAD Converter

Aplicação Node.js que monitora uma pasta por arquivos PDF contendo desenhos CAD e os converte automaticamente para imagens JPEG em formato A4 portrait a 300 DPI.

## Características

- Monitoramento automático de pasta (rede ou local)
- Conversão PDF → JPEG em 300 DPI (alta qualidade)
- Redimensionamento automático para A4 portrait
- Suporte a tamanhos variados (A4, A3, A2, A1, landscape)
- Cada página do PDF vira uma imagem separada
- Auto-restart em caso de falha (PM2)
- Cross-platform (Windows e Linux)
- Instalação automática de dependências

## Requisitos

- Windows Server ou Linux (Ubuntu/Debian/RHEL)
- Node.js 18+ (instalado automaticamente)
- Poppler (instalado automaticamente)

## Instalação Rápida

### Windows

1. Extraia o projeto ou clone o repositório
2. Execute como administrador:
   ```batch
   install-windows.bat
   ```
3. Edite o arquivo `.env` com os caminhos das pastas
4. Reinicie o serviço: `pm2 restart pdf-converter`

### Linux

1. Extraia o projeto ou clone o repositório
2. Execute:
   ```bash
   chmod +x scripts/install-linux.sh
   sudo ./scripts/install-linux.sh
   ```
3. Edite o arquivo `.env` com os caminhos das pastas
4. Reinicie o serviço: `pm2 restart pdf-converter`

## Configuração

Edite o arquivo `.env` com as seguintes variáveis:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `WATCH_FOLDER` | Pasta a monitorar (obrigatório) | - |
| `OUTPUT_FOLDER` | Pasta de saída dos JPEGs (obrigatório) | - |
| `JPEG_QUALITY` | Qualidade JPEG (0-100) | 90 |
| `DPI` | Resolução da conversão | 300 |
| `LOG_LEVEL` | Nível de log | info |
| `RETRY_INTERVAL` | Intervalo entre tentativas (ms) | 5000 |
| `MAX_RETRIES` | Número máximo de tentativas | 3 |

## Uso

Após a instalação, a aplicação roda como um serviço e é iniciada automaticamente no boot do servidor.

### Comandos PM2

```bash
pm2 list              # Lista processos
pm2 logs pdf-converter# Ver logs em tempo real
pm2 stop pdf-converter # Para o serviço
pm2 start pdf-converter# Inicia o serviço
pm2 restart pdf-converter # Reinicia
pm2 delete pdf-converter # Remove do PM2
pm2 monit             # Monitoramento em tempo real
```

### Verificar Dependências

```bash
npm run check-deps
# ou
node scripts/check-deps.js
```

## Estrutura de Arquivos

```
input/
├── desenho_abc.pdf
└── outro_xyz.pdf

output/
├── desenho_abc_1.jpg   # Página 1
├── desenho_abc_2.jpg   # Página 2
├── outro_xyz_1.jpg
└── outro_xyz_2.jpg
```

## Como Funciona

1. **Detecção**: Chokidar monitora a pasta configurada por novos arquivos `.pdf`
2. **Conversão**: pdf-poppler extrai cada página do PDF como JPEG temporário
3. **Processamento**: Sharp redimensiona e rotaciona cada imagem para A4 portrait
4. **Salvamento**: Imagens são salvas com sufixo `_1`, `_2`, etc.

## Lógica de Escala

| Original | Largura (mm) | Altura (mm) | Scale Resultante |
|----------|--------------|-------------|------------------|
| A1 landscape | 841 | 594 | ~0.25x |
| A2 landscape | 594 | 420 | ~0.35x |
| A3 landscape | 420 | 297 | ~0.5x |
| A4 landscape | 297 | 210 | ~0.71x |

A aplicação detecta automaticamente as dimensões e calcula o fator de escala para caber em A4 portrait (210×297mm) sem distorção.

## Logs

- `logs/app-YYYY-MM-DD.log`: Logs gerais
- `logs/error-YYYY-MM-DD.log`: Apenas erros
- Rotação automática diária (30 dias para app, 60 para erros)

## Troubleshooting

### Poppler não encontrado

**Windows**: Execute `install-windows.bat` novamente ou baixe manualmente:
https://github.com/oschwartz10612/poppler-windows/releases

**Linux**:
```bash
sudo apt install poppler-utils  # Debian/Ubuntu
sudo yum install poppler-utils # RHEL/CentOS
```

### Arquivo não é processado

- Verifique se o `.pdf` está na extensão (maiúscula/minúscula)
- Verifique permissões na pasta
- Consulte os logs: `pm2 logs pdf-converter`

### Servição não inicia no boot

**Windows**: Execute `pm2-startup install` como administrador

**Linux**: Execute `pm2 startup` e siga as instruções

## Licença

MIT
