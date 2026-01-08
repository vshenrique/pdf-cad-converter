const path = require('path');
require('dotenv').config();

/**
 * Valida e carrega configurações do ambiente
 * @throws {Error} Se configurações obrigatórias estiverem faltando
 */
function validateConfig() {
    const requiredVars = ['WATCH_FOLDER', 'OUTPUT_FOLDER'];
    const missing = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Variaveis de ambiente obrigatorias faltando: ${missing.join(', ')}\n` +
            'Copie .env.example para .env e configure os caminhos.'
        );
    }
}

/**
 * Configurações da aplicação
 */
const config = {
    // Pastas
    watchFolder: path.resolve(process.env.WATCH_FOLDER),
    outputFolder: path.resolve(process.env.OUTPUT_FOLDER),

    // Conversão
    dpi: parseInt(process.env.DPI) || 300,
    jpegQuality: parseInt(process.env.JPEG_QUALITY) || 90,

    // A4 portrait em pixels @ 300 DPI (210mm x 297mm)
    // 210mm / 25.4 * 300 = 2480 pixels
    // 297mm / 25.4 * 300 = 3508 pixels
    a4Width: 2480,
    a4Height: 3508,

    // Retries
    retryInterval: parseInt(process.env.RETRY_INTERVAL) || 5000,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    logFolder: path.resolve(process.env.LOG_FOLDER || './logs'),

    // Poppler
    popplerPath: process.env.POPPLER_PATH || null,

    // Ambiente
    env: process.env.NODE_ENV || 'production'
};

// Valida configurações ao carregar
validateConfig();

module.exports = config;
