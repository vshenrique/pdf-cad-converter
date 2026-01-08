@echo off
setlocal enabledelayedexpansion

echo ================================================
echo   PDF CAD Converter - Instalador Windows
echo ================================================
echo.

REM 1. Verifica Node.js
echo [1/6] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [!] Node.js nao encontrado. Baixando instalador...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs.msi'"
    echo [*] Instalando Node.js...
    msiexec /i nodejs.msi /qn
    echo [✓] Node.js instalado. Reboot pode ser necessario.
    echo     Execute este script novamente apos o reboot.
    pause
    exit /b 0
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [✓] Node.js encontrado: %NODE_VER%

REM 2. Instala dependências NPM
echo.
echo [2/6] Instalando dependencias NPM...
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo [✗] Erro ao instalar dependencias
        pause
        exit /b 1
    )
    echo [✓] Dependencias instaladas
) else (
    echo [✓] Dependencias ja instaladas
)

REM 3. Verifica Poppler
echo.
echo [3/6] Verificando Poppler...
pdftoppm -v >nul 2>&1
if errorlevel 1 (
    echo [!] Poppler nao encontrado. Baixando...
    if not exist "tools" mkdir tools
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/oschwartz10612/poppler-windows/releases/download/v23.07.0-0/Release-23.07.0-0.zip' -OutFile 'poppler.zip'"
    echo [*] Extraindo Poppler...
    powershell -Command "Expand-Archive -Path poppler.zip -DestinationPath .\tools\poppler -Force"
    del poppler.zip
    echo [✓] Poppler instalado em .\tools\poppler\Library\bin
) else (
    echo [✓] Poppler encontrado no PATH
)

REM 4. Cria arquivo .env se não existir
echo.
echo [4/6] Configurando ambiente...
if not exist ".env" (
    echo [!] Arquivo .env nao encontrado. Criando a partir de .env.example...
    copy .env.example .env >nul
    echo [✓] Arquivo .env criado. Edite-o com as configuracoes desejadas.
    notepad .env
) else (
    echo [✓] Arquivo .env ja existe
)

REM 5. Cria pastas necessárias
echo.
echo [5/6] Criando pastas...
if not exist "output" mkdir output
if not exist "logs" mkdir logs
echo [✓] Pastas criadas

REM 6. Instala e configura PM2
echo.
echo [6/6] Configurando PM2 para auto-start...
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo [*] Instalando PM2...
    call npm install -g pm2
)

pm2-startup install >nul 2>&1
pm2 start ecosystem.config.cjs
pm2 save

echo.
echo ================================================
echo [✓] Instalacao concluida!
echo ================================================
echo.
echo Servicos ativos:
pm2 list

echo.
echo Comandos uteis:
echo   pm2 logs pdf-converter  - Ver logs
echo   pm2 restart pdf-converter - Reiniciar
echo   pm2 stop pdf-converter   - Parar
echo.

pause
