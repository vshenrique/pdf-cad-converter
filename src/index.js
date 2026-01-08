#!/usr/bin/env node

/**
 * PDF CAD Converter - Aplicação Principal
 *
 * Monitora uma pasta por arquivos PDF, converte para JPEG (300 DPI)
 * e redimensiona para formato A4 portrait.
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { checkDependencies } = require('./dependencyCheck');
const { startWatcher } = require('./fileWatcher');

/**
 * Inicializa a aplicação
 */
async function init() {
    console.log('========================================');
    console.log('  PDF CAD Converter v1.0.0');
    console.log('========================================\n');

    // Verifica dependências do sistema
    console.log('Verificando dependências...');
    const depCheck = await checkDependencies({
        watchFolder: config.watchFolder,
        outputFolder: config.outputFolder
    });

    // Exibe resultado das verificações
    depCheck.checks.forEach(check => {
        const icon = check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
        console.log(`  ${icon} ${check.name}: ${check.current || ''}`);
        if (check.installCmd) {
            console.log(`      Instalar: ${check.installCmd}`);
        }
    });

    // Se houver erros, encerra
    if (depCheck.status === 'error') {
        console.error('\n❌ Dependências faltando. Instale e tente novamente.\n');
        process.exit(1);
    }

    if (depCheck.warnings && depCheck.warnings.length > 0) {
        console.log('\n⚠️  Avisos detectados. Verifique acima.\n');
    }

    console.log('\n✅ Todas as dependências verificadas.\n');

    // Garante que pasta de saída existe
    if (!fs.existsSync(config.outputFolder)) {
        console.log(`Criando pasta de saída: ${config.outputFolder}`);
        fs.mkdirSync(config.outputFolder, { recursive: true });
    }

    // Inicia o monitoramento
    const watcher = startWatcher(config);

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\nEncerrando aplicação...');
        logger.info('Aplicação encerrada pelo usuário');
        watcher.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n\nEncerrando aplicação...');
        logger.info('Aplicação encerrada (SIGTERM)');
        watcher.close();
        process.exit(0);
    });

    // Mantém o processo rodando
    console.log('Aplicação rodando. Pressione Ctrl+C para encerrar.\n');
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    logger.error('Erro não capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Rejeição não tratada:', reason);
});

// Inicia a aplicação
init().catch(err => {
    console.error('Erro fatal ao iniciar:', err);
    process.exit(1);
});
