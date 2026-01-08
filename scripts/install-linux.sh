#!/bin/bash
set -e

echo "=============================================="
echo "  PDF CAD Converter - Instalador Linux"
echo "=============================================="
echo ""

# Detecta distribuição
if [ -f /etc/debian_version ]; then
    PKG_MANAGER="apt"
    PKG_UPDATE="apt update"
    PKG_INSTALL="apt install -y"
elif [ -f /etc/redhat-release ]; then
    PKG_MANAGER="yum"
    PKG_UPDATE="yum check-update || true"
    PKG_INSTALL="yum install -y"
else
    echo "[!] Distribuicao nao suportada automaticamente"
    echo "    Instale Node.js 18+ e Poppler manualmente"
    exit 1
fi

# 1. Verifica/instala Node.js 18+
echo "[1/6] Verificando Node.js..."
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]; then
    echo "[*] Instalando Node.js 18 LTS..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        if ! command -v curl &> /dev/null; then
            sudo $PKG_INSTALL curl
        fi
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo $PKG_INSTALL nodejs
    else
        sudo $PKG_INSTALL nodejs18
    fi
fi
NODE_VER=$(node -v)
echo "[✓] Node.js encontrado: $NODE_VER"

# 2. Verifica/instala Poppler
echo ""
echo "[2/6] Verificando Poppler..."
if ! command -v pdftoppm &> /dev/null; then
    echo "[*] Instalando Poppler..."
    sudo $PKG_INSTALL poppler-utils
fi
POPPLER_VER=$(pdftoppm -v | head -n1)
echo "[✓] Poppler instalado"

# 3. Instala dependências NPM
echo ""
echo "[3/6] Instalando dependencias NPM..."
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "[✓] Dependencias instaladas"

# 4. Cria arquivo .env se não existir
echo ""
echo "[4/6] Configurando ambiente..."
if [ ! -f ".env" ]; then
    echo "[!] Arquivo .env nao encontrado. Criando a partir de .env.example..."
    cp .env.example .env
    echo "[✓] Arquivo .env criado."
    echo "    Edite o arquivo .env com suas configuracoes:"
    echo "    nano .env"
else
    echo "[✓] Arquivo .env ja existe"
fi

# 5. Cria pastas necessárias
echo ""
echo "[5/6] Criando pastas..."
mkdir -p output logs
echo "[✓] Pastas criadas"

# 6. Instala e configura PM2
echo ""
echo "[6/6] Configurando PM2 para auto-start..."
if ! command -v pm2 &> /dev/null; then
    echo "[*] Instalando PM2..."
    npm install -g pm2
fi

echo "[*] Configurando PM2 startup..."
pm2 startup | tail -n 1 | sudo bash
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "=============================================="
echo "[✓] Instalacao concluida!"
echo "=============================================="
echo ""
echo "Servicos ativos:"
pm2 list

echo ""
echo "Comandos uteis:"
echo "  pm2 logs pdf-converter  - Ver logs"
echo "  pm2 restart pdf-converter - Reiniciar"
echo "  pm2 stop pdf-converter   - Parar"
echo "  pm2 monit                - Monitoramento"
echo ""
