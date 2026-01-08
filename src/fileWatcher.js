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
 * Processa um arquivo PDF
 */
async function processFile(filePath, config, retries = 0) {
    const fileName = path.basename(filePath);

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

        // Processa o PDF
        const result = await processPdf(
            filePath,
            config.outputFolder,
            processPdfImages
        );

        if (result.success) {
            logger.info(`PDF processado com sucesso: ${fileName} (${result.processedPages}/${result.totalPages} páginas)`);
        } else {
            logger.error(`Erro ao processar PDF ${fileName}: ${result.error}`);

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
        ignoreInitial: true, // Não processa arquivos existentes
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
        ignored: /(^|[\/\\])\../, // Ignora arquivos ocultos
        usePolling: process.platform === 'win32' // Usa polling no Windows para rede
    });

    // Evento: arquivo adicionado
    watcher.on('add', (filePath) => {
        // Processa apenas PDFs
        if (path.extname(filePath).toLowerCase() === '.pdf') {
            logger.info(`Novo PDF detectado: ${path.basename(filePath)}`);
            processFile(filePath, config).catch(err => {
                logger.error(`Erro no processamento: ${err.message}`);
            });
        }
    });

    // Evento: watcher pronto
    watcher.on('ready', () => {
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
