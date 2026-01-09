# Docker Desktop - Instalação Windows sem WSL

Guia para instalar Docker Desktop no Windows usando Hyper-V ao invés de WSL.

---

## Requisitos

### Windows 10/11 Pro, Enterprise, or Education
- Windows 10 64-bit: Home, Pro, Enterprise, or Education, version 21H2 or higher
- Windows 11 64-bit: Home or Pro version 21H2 or higher
- **Hyper-V habilitado** (não funciona no Windows Home)

### Verificar edição do Windows
```powershell
# Ver edição
systeminfo | findstr /B /C:"Nome do SO"

# Ou via PowerShell
Get-ComputerInfo | select WindowsProductName
```

---

## Método 1: Hyper-V Backend (Recomendado para Windows Pro/Enterprise)

### 1. Habilitar Hyper-V

**Opção A: Via PowerShell (Administrador)**
```powershell
# Habilitar Hyper-V
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# Habilitar Container Feature
Enable-WindowsOptionalFeature -Online -FeatureName Containers -All

# Reiniciar o computador
Restart-Computer
```

**Opção B: Via Painel de Controle**
1. Pressione `Win + R`, digite `appwiz.cpl`, Enter
2. Clique em **Ativar ou desativar recursos do Windows**
3. Marque:
   - ☑ **Hyper-V**
     - ☑ Plataforma Hyper-V
     - ☑ Ferramentas de gerenciamento Hyper-V
   - ☑ **Contêineres**
4. Clique OK e reinicie

### 2. Baixar Docker Desktop

1. Acesse: https://www.docker.com/products/docker-desktop/
2. Baixe **Docker Desktop for Windows**
3. Execute o instalador como **Administrador**

### 3. Instalar com Hyper-V (sem WSL)

Durante a instalação:

1. **Configuration** - Aceite os termos
2. **Settings** - **DESMARQUE** "Use WSL 2 based engine"
3. **Installation** - Clique em Install
4. **Finish** - Reinicie o computador

### 4. Configurar Docker Desktop para Hyper-V

Após a reinicialização:

1. Abra **Docker Desktop**
2. Clique no ícone de engrenagem ⚙️ **Settings**
3. **General**:
   - [x] Use containerd-based processor... (deixe marcado)
   - **Desmarque** "Use the WSL 2 based engine"
4. **Resources → Virtual Machine Disk**:
   - Limite: 128 GB (ou mais se precisar)
5. **Resources → Memory**:
   - Mínimo: 4 GB
   - Recomendado: 8 GB
6. **Apply & Restart**

### 5. Verificar Instalação

```powershell
# Ver versão do Docker
docker --version

# Ver informações do sistema
docker info

# Testar com hello-world
docker run hello-world
```

---

## Método 2: Docker Toolbox (Windows Home)

Se seu Windows é **Home Edition** (não tem Hyper-V), use Docker Toolbox:

### 1. Baixar Docker Toolbox

https://github.com/docker/toolbox/releases

### 2. Instalar

1. Execute `DockerToolbox-xxx.exe`
2. Siga o instalador padrão
3. Conclua e reinicie

### 3. Usar Docker Quickstart Terminal

1. Abra **Docker Quickstart Terminal**
2. Aguarde a VM do VirtualBox iniciar
3. Teste:
```bash
docker run hello-world
```

---

## Troubleshooting

### Erro: "Hyper-V não está disponível"

**Causa:** Windows Home Edition não suporta Hyper-V

**Solução:** Use Docker Toolbox ou atualize para Windows Pro

### Erro: "Virtualização está desabilitada"

**Verificar:**
```powershell
# Verificar se virtualização está habilitada
systeminfo | findstr /i "Hyper-V"
```

**Solução:**
1. Reinicie o computador
2. Entre na BIOS/UEFI (F2, F10, ou DEL)
3. Encontre **Intel VT-x** ou **AMD-V**
4. Mude de **Disabled** para **Enabled**
5. Salve e reinicie

### Erro: "WSL install failed"

**Solução:** Desabilite WSL no Docker Desktop:
1. Docker Desktop → Settings → General
2. **Desmarque** "Use the WSL 2 based engine"
3. Apply & Restart

### Docker não inicia após instalação

```powershell
# Reiniciar Docker Desktop manualmente
# Primeiro pare o serviço
Stop-Service docker

# Depois inicie
Start-Service docker

# Ou reinicie o Docker Desktop na bandeja do sistema
```

### Erro de DNS no container

```powershell
# Configure DNS no Docker Desktop
# Settings → Resources → Proxies
# Use DNS do host: 8.8.8.8
```

---

## Testar PDF Converter com Docker (Windows)

Após Docker Desktop instalado:

### 1. Navegue até a pasta do projeto
```powershell
cd C:\pdf-converter
```

### 2. Criar pastas
```powershell
mkdir watch
mkdir output
mkdir logs
```

### 3. Iniciar container
```powershell
docker-compose up -d --build
```

### 4. Verificar status
```powershell
docker ps
docker-compose logs pdf-converter
```

### 5. Testar conversão
```powershell
# Copiar PDF para watch
copy "C:\CAD\desenho.pdf" "C:\pdf-converter\watch\"

# Verificar output
dir "C:\pdf-converter\output\"
```

---

## Desinstalar (se necessário)

```powershell
# Parar Docker Desktop
# Clique com botão direito → Quit Docker Desktop

# Desinstalar via Painel de Controle
# Configurações → Aplicativos → Docker Desktop → Desinstalar

# Remover Hyper-V (se não usar mais)
Disable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
```

---

## Comparação: WSL2 vs Hyper-V

| Característica | WSL2 | Hyper-V |
|----------------|------|---------|
| Desempenho | Melhor | Bom |
| Uso de memória | Menor | Maior |
| Compatibilidade | Excelente | Excelente |
| Windows Home | Não | Não (Toolbox) |
| Windows Pro/Enterprise | Sim | Sim |

**Recomendação:** Use WSL2 quando possível. Hyper-V é alternativa quando WSL2 não funciona.

---

## Comandos Úteis

```powershell
# Ver containers rodando
docker ps

# Ver todos os containers (parados também)
docker ps -a

# Ver logs
docker-compose logs -f pdf-converter

# Parar container
docker-compose down

# Reiniciar container
docker-compose restart

# Entrar no container (debug)
docker exec -it pdf-converter sh
```

---

## Próximos Passos

Após Docker funcionando:

1. **Teste local** com `docker-compose up -d`
2. **Configure MV_XIMGPF** no Protheus: `C:\pdf-converter\output`
3. **Teste integração** com SLPCPR13

Para mais detalhes, veja [DOCKER-WINDOWS.md](DOCKER-WINDOWS.md)
