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

        // Processa imagem com sharp
        let pipeline = sharp(inputPath);

        // Redimensiona para caber dentro de A4 portrait mantendo proporção
        // Se for landscape, considera a orientação rotacionada
        let resizeWidth, resizeHeight;

        if (isLandscape) {
            // Para landscape, após rotação, a largura original será a altura final
            // e a altura original será a largura final
            // Precisamos escalar para caber em A4 portrait (width=2480, height=3508)
            const scale = Math.min(targetHeight / width, targetWidth / height);
            resizeWidth = Math.round(width * scale);
            resizeHeight = Math.round(height * scale);
        } else {
            // Já está portrait
            const scale = Math.min(targetWidth / width, targetHeight / height);
            resizeWidth = Math.round(width * scale);
            resizeHeight = Math.round(height * scale);
        }

        // Redimensiona mantendo proporção (fit: inside garante que não exceda as dimensões)
        pipeline = pipeline.resize(resizeWidth, resizeHeight, {
            fit: 'inside',
            withoutEnlargement: false
        });

        // Se era landscape, rotaciona para portrait
        if (isLandscape) {
            pipeline = pipeline.rotate(90);
        }

        // Obtém metadados após redimensionamento
        const metadataAfterResize = await pipeline.metadata();

        // Extende para tamanho exato do A4 (adiciona bordas brancas se necessário)
        // Usa Math.max(0, ...) para evitar valores negativos
        const top = Math.max(0, Math.floor((targetHeight - metadataAfterResize.height) / 2));
        const bottom = Math.max(0, Math.ceil((targetHeight - metadataAfterResize.height) / 2));
        const left = Math.max(0, Math.floor((targetWidth - metadataAfterResize.width) / 2));
        const right = Math.max(0, Math.ceil((targetWidth - metadataAfterResize.width) / 2));

        // Só aplica extend se necessário (se não já está no tamanho exato)
        if (top > 0 || bottom > 0 || left > 0 || right > 0) {
            pipeline = pipeline.extend({
                top,
                bottom,
                left,
                right,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            });
        }

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

        try {
            const result = await processImage(inputPath, outputPath, config);
            results.push(result);
        } catch (error) {
            results.push({
                success: false,
                error: error.message,
                inputPath,
                stack: error.stack
            });
        }
        // Nota: Arquivos temporários NÃO são deletados aqui
        // São deletados no pdfConverter.js apenas se todos os processamentos forem bem-sucedidos
    }

    return results;
}

module.exports = {
    processImage,
    processPdfImages
};
