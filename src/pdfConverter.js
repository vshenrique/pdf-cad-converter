const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const { execSync } = require('child_process');
const config = require('./config');

/**
 * Converte PDF para imagens JPEG usando pdftoppm (Linux/macOS) ou pdf-poppler (Windows)
 * @param {string} pdfPath - Caminho do arquivo PDF
 * @returns {Promise<Object>} Resultado da conversão
 */
async function convertPdfToImages(pdfPath) {
    const platform = os.platform();
    const baseName = path.basename(pdfPath, path.extname(pdfPath));
    const tempDir = os.tmpdir();

    try {
        let imagePaths = [];

        // Verifica se o PDF existe e tem tamanho maior que 0
        try {
            const pdfStats = await fs.stat(pdfPath);
            if (pdfStats.size === 0) {
                throw new Error('PDF file is empty');
            }
        } catch (err) {
            throw new Error(`PDF file not accessible: ${err.message}`);
        }

        // Linux/macOS: usa pdftoppm do sistema
        if (platform === 'linux' || platform === 'darwin') {
            const outputPath = path.join(tempDir, baseName);

            // Comando: pdftoppm -jpeg -r 300 input.pdf /path/to/output
            const cmd = `pdftoppm -jpeg -r ${config.dpi} "${pdfPath}" "${outputPath}"`;

            try {
                execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
            } catch (err) {
                throw new Error(`pdftoppm failed: ${err.message}`);
            }

            // Aguarda os arquivos aparecerem E ficarem estaveis
            // pdftoppm pode levar tempo para escrever todas as paginas
            let matchingFiles = [];
            let lastCount = -1;
            let stableCount = 0;
            const MAX_WAIT_MS = 30000; // Max 30 segundos
            const CHECK_INTERVAL = 200; // Checa a cada 200ms
            const MIN_STABLE_COUNT = 10; // Precisa estar estavel por 10 ciclos (2 segundos)

            const startTime = Date.now();

            while (Date.now() - startTime < MAX_WAIT_MS) {
                await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));

                const files = await fs.readdir(tempDir);
                matchingFiles = files
                    .filter(f => f.startsWith(baseName + '-') && f.endsWith('.jpg'))
                    .sort();

                // Verifica se a contagem de arquivos parou de mudar
                if (matchingFiles.length === lastCount && matchingFiles.length > 0) {
                    stableCount++;
                    if (stableCount >= MIN_STABLE_COUNT) {
                        // Estavel por tempo suficiente - todos os arquivos foram escritos
                        break;
                    }
                } else if (matchingFiles.length !== lastCount) {
                    // Contagem mudou, reseta o contador de estabilidade
                    stableCount = 0;
                    lastCount = matchingFiles.length;
                }
            }

            console.log(`[DEBUG] baseName: ${baseName}, found files: ${matchingFiles.length}, stable cycles: ${stableCount}`);

            for (const file of matchingFiles) {
                imagePaths.push(path.join(tempDir, file));
            }
        }
        // Windows: usa pdf-poppler
        else if (platform === 'win32') {
            const poppler = require('pdf-poppler');
            const options = {
                format: 'jpeg',
                out_dir: tempDir,
                out_prefix: baseName,
                page: null,
                scale: config.dpi / 72,
                popplerPath: config.popplerPath
            };

            const document = await poppler.convert(pdfPath, options);
            if (document && document.length > 0) {
                imagePaths = document;
            }
        } else {
            throw new Error(`Platform ${platform} not supported`);
        }

        if (imagePaths.length === 0) {
            throw new Error('No images generated from PDF');
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

    // Limpa arquivos temporários APENAS se todos foram processados com sucesso
    // Se houve falha, os temporários são mantidos para possível retry manual
    if (processResults.every(r => r.success)) {
        for (const tempPath of convertResult.imagePaths) {
            try {
                await fs.unlink(tempPath);
            } catch (err) {
                // Ignore error ao deletar temp
            }
        }
    }

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
