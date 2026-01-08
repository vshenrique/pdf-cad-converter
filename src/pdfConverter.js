const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const poppler = require('pdf-poppler');
const config = require('./config');

/**
 * Converte PDF para imagens JPEG
 * @param {string} pdfPath - Caminho do arquivo PDF
 * @returns {Promise<Object>} Resultado da conversão
 */
async function convertPdfToImages(pdfPath) {
    const tempDir = config.popplerPath || undefined;

    try {
        // Obtém informações do PDF
        const baseName = path.basename(pdfPath, path.extname(pdfPath));

        // Opções de conversão
        const options = {
            format: 'jpeg',
            out_dir: os.tmpdir(),
            out_prefix: baseName,
            page: null, // Todas as páginas
            scale: config.dpi / 72, // Escala baseada no DPI
            popplerPath: tempDir
        };

        // Executa conversão
        const document = await poppler.convert(pdfPath, options);

        // Retorna caminhos das imagens geradas
        const imagePaths = [];
        if (document && document.length > 0) {
            for (const page of document) {
                imagePaths.push(page);
            }
        }

        return {
            success: true,
            imagePaths,
            pageCount: imagePaths.length
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            pdfPath
        };
    }
}

/**
 * Processa um arquivo PDF completo
 * @param {string} pdfPath - Caminho do PDF
 * @param {string} outputFolder - Pasta de saída
 * @param {Function} imageProcessor - Função de processamento de imagem
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processPdf(pdfPath, outputFolder, imageProcessor) {
    // Primeiro converte PDF para imagens temporárias
    const convertResult = await convertPdfToImages(pdfPath);

    if (!convertResult.success) {
        return {
            success: false,
            error: convertResult.error,
            pdfPath
        };
    }

    // Depois processa cada imagem
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const processResults = await imageProcessor(
        convertResult.imagePaths,
        baseName,
        outputFolder,
        config
    );

    // Verifica se houve falhas
    const failures = processResults.filter(r => !r.success);

    return {
        success: failures.length === 0,
        totalPages: convertResult.pageCount,
        processedPages: processResults.filter(r => r.success).length,
        failedPages: failures.length,
        results: processResults
    };
}

module.exports = {
    convertPdfToImages,
    processPdf
};
