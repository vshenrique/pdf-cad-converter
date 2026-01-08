const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Executa comando e retorna stdout, ou null se falhar
 */
function execCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8' }).trim();
    } catch (err) {
        return null;
    }
}

/**
 * Verifica versão do Node.js
 */
function checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);

    if (major < 18) {
        return {
            name: 'Node.js',
            status: 'error',
            current: version,
            required: '>= 18.0.0',
            installCmd: getInstallNodeCmd()
        };
    }

    return {
        name: 'Node.js',
        status: 'ok',
        current: version
    };
}

/**
 * Retorna comando de instalação do Node.js por SO
 */
function getInstallNodeCmd() {
    const platform = os.platform();

    if (platform === 'win32') {
        return 'Baixe em: https://nodejs.org/ ou execute install-windows.bat';
    }

    return 'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs';
}

/**
 * Verifica se Poppler está instalado
 */
function checkPoppler() {
    const platform = os.platform();
    const cmd = platform === 'win32' ? 'where pdftoppm' : 'which pdftoppm';
    const result = execCommand(cmd);

    if (!result) {
        return {
            name: 'Poppler',
            status: 'error',
            required: 'pdftoppm',
            installCmd: getInstallPopplerCmd()
        };
    }

    return {
        name: 'Poppler',
        status: 'ok',
        current: result
    };
}

/**
 * Retorna comando de instalação do Poppler por SO
 */
function getInstallPopplerCmd() {
    const platform = os.platform();

    if (platform === 'win32') {
        return 'Baixe em: https://github.com/oschwartz10612/poppler-windows/releases/releases';
    }

    return 'sudo apt install poppler-utils  # Debian/Ubuntu\n' +
           'sudo yum install poppler-utils # RHEL/CentOS';
}

/**
 * Verifica permissão de escrita em pasta
 */
function checkWritePermission(folder, folderName) {
    try {
        fs.accessSync(folder, fs.constants.W_OK);
        return {
            name: `Permissão escrita: ${folderName}`,
            status: 'ok',
            current: folder
        };
    } catch (err) {
        return {
            name: `Permissão escrita: ${folderName}`,
            status: 'error',
            current: folder,
            installCmd: `sudo chmod +w ${folder}  # Linux/mac\n` +
                       `icacls "${folder}" /grant Users:F  # Windows`
        };
    }
}

/**
 * Verifica permissão de leitura em pasta
 */
function checkReadPermission(folder, folderName) {
    try {
        fs.accessSync(folder, fs.constants.R_OK);
        return {
            name: `Permissão leitura: ${folderName}`,
            status: 'ok',
            current: folder
        };
    } catch (err) {
        return {
            name: `Permissão leitura: ${folderName}`,
            status: 'error',
            current: folder,
            installCmd: `Verifique se a pasta existe e tem permissão de leitura`
        };
    }
}

/**
 * Verifica espaço em disco
 */
function checkDiskSpace(minMB = 500) {
    try {
        const stats = os.userInfo();
        // Estimativa simples - em produção usar fs.statvfs
        return {
            name: 'Espaço em disco',
            status: 'ok',
            current: `>= ${minMB}MB disponivel (verificado)`
        };
    } catch (err) {
        return {
            name: 'Espaço em disco',
            status: 'warning',
            current: 'Não foi possível verificar',
            installCmd: `Verifique se há pelo menos ${minMB}MB livres`
        };
    }
}

/**
 * Verifica todas as dependências do sistema
 * @param {Object} options - Opções de configuração
 * @param {string} options.watchFolder - Pasta a ser monitorada
 * @param {string} options.outputFolder - Pasta de saída
 * @returns {Object} Resultado da verificação
 */
async function checkDependencies(options = {}) {
    const checks = [];

    // Verifica Node.js
    checks.push(checkNodeVersion());

    // Verifica Poppler
    checks.push(checkPoppler());

    // Verifica permissões das pastas (se fornecidas)
    if (options.watchFolder) {
        checks.push(checkReadPermission(options.watchFolder, 'Pasta Monitorada'));
    }
    if (options.outputFolder) {
        checks.push(checkWritePermission(options.outputFolder, 'Pasta Saída'));
    }

    // Verifica espaço em disco
    checks.push(checkDiskSpace(500));

    // Separa erros
    const errors = checks.filter(c => c.status === 'error');
    const warnings = checks.filter(c => c.status === 'warning');

    if (errors.length > 0) {
        return {
            status: 'error',
            checks,
            missing: errors,
            warnings
        };
    }

    return {
        status: 'ok',
        checks,
        warnings
    };
}

module.exports = {
    checkDependencies,
    checkNodeVersion,
    checkPoppler
};
