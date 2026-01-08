const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Processa imagem: escala para A4 portrait e rotaciona se necessário
 * @param {string} inputPath - Caminho da imagem de entrada
 * @param {string} outputPath - Caminho da imagem de saída
 * @param {Object} config - Configurações (a4Width, a4Height, jpegQuality)
 * @returns {Promise<Object>} Resultado do processamento
 */
async function processImage(inputPath, outputPath, config) {
    try {
        // Obtém metadados da imagem
        const metadata = await sharp(inputPath).metadata();

        const { width, height } = metadata;
        const targetWidth = config.a4Width;
        const targetHeight = config.a4Height;

        // Detecta orientação: landscape se largura > altura
        const isLandscape = width > height;

        // Calcula dimensões de redimensionamento
        // Queremos que a imagem caiba dentro de A4 portrait mantendo proporção
        let resizeWidth, resizeHeight;

        if (isLandscape) {
            // Para landscape, a largura original será limitada pela altura do A4
            // e a altura original será limitada pela largura do A4
            const scaleWidth = targetHeight / width;
            const scaleHeight = targetWidth / height;
            const scale = Math.min(scaleWidth, scaleHeight);

            resizeWidth = Math.round(width * scale);
            resizeHeight = Math.round(height * scale);
        } else {
            // Já está portrait, escala normalmente
            const scaleWidth = targetWidth / width;
            const scaleHeight = targetHeight / height;
            const scale = Math.min(scaleWidth, scaleHeight);

            resizeWidth = Math.round(width * scale);
            resizeHeight = Math.round(height * scale);
        }

        // Processa imagem com sharp
        let pipeline = sharp(inputPath);

        // Redimensiona mantendo proporção
        pipeline = pipeline.resize(resizeWidth, resizeHeight, {
            fit: 'inside',
            withoutEnlargement: false // Permite ampliar se necessário
        });

        // Se era landscape, rotaciona para portrait
        if (isLandscape) {
            pipeline = pipeline.rotate(90);
        }

        // Extende para tamanho exato do A4 (adiciona bordas brancas se necessário)
        const metadataAfterResize = await pipeline.metadata();
        pipeline = pipeline.extend({
            top: Math.floor((targetHeight - metadataAfterResize.height) / 2),
            bottom: Math.ceil((targetHeight - metadataAfterResize.height) / 2),
            left: Math.floor((targetWidth - metadataAfterResize.width) / 2),
            right: Math.ceil((targetWidth - metadataAfterResize.width) / 2),
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        });

        // Salva como JPEG
        await pipeline
            .jpeg({
                quality: config.jpegQuality,
                progressive: false
            })
            .toFile(outputPath);

        return {
            success: true,
            outputPath,
            originalSize: { width, height },
            finalSize: { width: targetWidth, height: targetHeight },
            wasRotated: isLandscape
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            inputPath
        };
    }
}

/**
 * Processa múltiplas imagens de um PDF
 * @param {Array<string>} inputPaths - Array de caminhos das imagens
 * @param {string} baseName - Nome base para os arquivos de saída
 * @param {string} outputFolder - Pasta de saída
 * @param {Object} config - Configurações
 * @returns {Promise<Array>} Resultados do processamento
 */
async function processPdfImages(inputPaths, baseName, outputFolder, config) {
    const results = [];

    for (let i = 0; i < inputPaths.length; i++) {
        const inputPath = inputPaths[i];
        const outputPath = path.join(outputFolder, `${baseName}_${i + 1}.jpg`);

        const result = await processImage(inputPath, outputPath, config);
        results.push(result);

        // Remove arquivo temporário após processamento
        try {
            await fs.unlink(inputPath);
        } catch (err) {
            // Ignore error ao deletar temp
        }
    }

    return results;
}

module.exports = {
    processImage,
    processPdfImages
};
