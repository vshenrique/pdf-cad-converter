const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs').promises;
const { processPdf } = require('./pdfConverter');
const { processPdfImages } = require('./imageProcessor');
const logger = require('./logger');

/**
 * Mapa para rastrear arquivos em processamento e evitar duplicatas
 */
const processingFiles = new Map();

/**
 * Aguarda um pouco antes de processar (para garantir que o arquivo foi completamente escrito)
 */
async function waitForFileReady(filePath, maxWait = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
        try {
            const stats = await fs.stat(filePath);

            // Verifica se o arquivo ainda está crescendo (sendo escrito)
            // Aguarda 1 segundo e verifica novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
            const newStats = await fs.stat(filePath);

            if (stats.size === newStats.size && stats.size > 0) {
                return true;
            }
        } catch (err) {
            // Arquivo ainda não existe ou não está acessível
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return false;
}

/**
 * Verifica se ja existem imagens JPEG para um PDF
 */
async function hasExistingImages(baseName, outputFolder) {
    try {
        const files = await fs.readdir(outputFolder);
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+\\.jpg$`);
        return files.some(file => pattern.test(file));
    } catch (err) {
        return false;
    }
}

/**
 * Remove JPEGs antigos de um PDF antes de reprocessar
 * Isso evita que paginas antigas permanecam quando o PDF e atualizado
 */
async function cleanupOldImages(baseName, outputFolder) {
    try {
        const files = await fs.readdir(outputFolder);
        const pattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_\\d+\\.jpg$`);

        for (const file of files) {
            if (pattern.test(file)) {
                const filePath = path.join(outputFolder, file);
                await fs.unlink(filePath);
            }
        }
    } catch (err) {
        // Erro ao limpar arquivos antigos - nao e critico, apenas log
        logger.debug(`Aviso: nao foi possivel limpar imagens antigas de ${baseName}: ${err.message}`);
    }
}

/**
 * Processa um arquivo PDF
 * @param {string} filePath - Caminho do PDF
 * @param {object} config - Configuracao
 * @param {number} retries - Numero de tentativas
 * @param {boolean} skipCleanup - Pula limpeza de imagens antigas (para arquivos existentes)
 */
async function processFile(filePath, config, retries = 0, skipCleanup = false) {
    const fileName = path.basename(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));

    // Verifica se já está processando
    if (processingFiles.has(filePath)) {
        logger.debug(`Arquivo já em processamento: ${fileName}`);
        return;
    }

    processingFiles.set(filePath, true);

    try {
        logger.info(`Processando PDF: ${fileName}`);

        // Aguarda arquivo estar pronto
        const ready = await waitForFileReady(filePath);
        if (!ready) {
            logger.warn(`Timeout aguardando arquivo pronto: ${fileName}`);
            return;
        }

        // Limpa imagens antigas apenas se nao for arquivo existente
        if (!skipCleanup) {
            await cleanupOldImages(baseName, config.outputFolder);
        }

        // Processa o PDF
        const result = await processPdf(
            filePath,
            config.outputFolder,
            processPdfImages
        );

        if (result.success) {
            logger.info(`PDF processado com sucesso: ${fileName} (${result.processedPages}/${result.totalPages} páginas)`);
        } else {
            // Log detalhado do erro
            const errorMsg = result.error || 'Erro desconhecido';
            logger.error(`Erro ao processar PDF ${fileName}: ${errorMsg}`);
            logger.error(`Resultado completo: ${JSON.stringify(result)}`);

            // Retry se configurado
            if (retries < config.maxRetries) {
                logger.info(`Tentando novamente (${retries + 1}/${config.maxRetries})...`);
                processingFiles.delete(filePath);
                await new Promise(resolve => setTimeout(resolve, config.retryInterval));
                return processFile(filePath, config, retries + 1);
            }
        }

    } catch (error) {
        logger.error(`Erro ao processar ${fileName}: ${error.message}`);
    } finally {
        // Remove do mapa após um tempo para evitar reprocessamento imediato
        setTimeout(() => {
            processingFiles.delete(filePath);
        }, 5000);
    }
}

/**
 * Inicia o monitoramento da pasta
 */
function startWatcher(config) {
    const watchPath = config.watchFolder;

    logger.info(`Iniciando monitoramento: ${watchPath}`);
    logger.info(`Pasta de saída: ${config.outputFolder}`);

    // Configura o watcher
    const watcher = chokidar.watch(watchPath, {
        persistent: true,
        ignoreInitial: false, // Processa arquivos existentes na inicializacao
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
        ignored: /(^|[\/\\])\../, // Ignora arquivos ocultos
        usePolling: process.env.USE_POLLING === 'true' || process.platform === 'win32' // Configuravel via env USE_POLLING
    });

    // Flag para identificar arquivos iniciais (existente no startup)
    let isInitialScan = true;

    // Evento: arquivo adicionado
    watcher.on('add', async (filePath) => {
        // Processa apenas PDFs
        if (path.extname(filePath).toLowerCase() === '.pdf') {
            const fileName = path.basename(filePath);
            const baseName = path.basename(filePath, path.extname(filePath));

            // Para arquivos existentes, verifica se ja tem imagens
            if (isInitialScan) {
                const hasImages = await hasExistingImages(baseName, config.outputFolder);
                if (hasImages) {
                    logger.info(`PDF existente ja processado: ${fileName} (ignorando)`);
                    return;
                }
                logger.info(`PDF existente sem imagens: ${fileName} (processando)`);
            } else {
                logger.info(`Novo PDF detectado: ${fileName}`);
            }

            processFile(filePath, config, 0, isInitialScan).catch(err => {
                logger.error(`Erro no processamento: ${err.message}`);
            });
        }
    });

    // Evento: arquivo alterado (substituido ou atualizado)
    watcher.on('change', (filePath) => {
        // Processa apenas PDFs
        if (path.extname(filePath).toLowerCase() === '.pdf') {
            logger.info(`PDF alterado/substituido: ${path.basename(filePath)}`);
            // Limpa o mapa de processamento para permitir reprocessamento
            processingFiles.delete(filePath);
            processFile(filePath, config).catch(err => {
                logger.error(`Erro no processamento: ${err.message}`);
            });
        }
    });

    // Evento: watcher pronto
    watcher.on('ready', () => {
        isInitialScan = false; // Finaliza scan inicial, novos arquivos serao processados normalmente
        logger.info('Monitoramento ativo. Aguardando novos arquivos PDF...');
    });

    // Evento: erro
    watcher.on('error', (error) => {
        logger.error(`Erro no watcher: ${error.message}`);
    });

    return watcher;
}

module.exports = {
    startWatcher,
    processFile
};
