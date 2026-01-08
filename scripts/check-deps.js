#!/usr/bin/env node

/**
 * Script para verificação manual de dependências
 * Uso: node scripts/check-deps.js
 */

const path = require('path');
const { checkDependencies } = require('../src/dependencyCheck');

async function main() {
    // Carrega variáveis de ambiente se existirem
    const watchFolder = process.env.WATCH_FOLDER;
    const outputFolder = process.env.OUTPUT_FOLDER;

    console.log('========================================');
    console.log('  Verificação de Dependências');
    console.log('========================================\n');

    const result = await checkDependencies({
        watchFolder,
        outputFolder
    });

    result.checks.forEach(check => {
        let icon, status;

        switch (check.status) {
            case 'ok':
                icon = '✓';
                status = '\x1b[32mOK\x1b[0m';
                break;
            case 'warning':
                icon = '⚠';
                status = '\x1b[33mAVISO\x1b[0m';
                break;
            default:
                icon = '✗';
                status = '\x1b[31mERRO\x1b[0m';
        }

        console.log(`${icon} ${check.name}: ${status}`);
        if (check.current) {
            console.log(`   Versão/Local: ${check.current}`);
        }
        if (check.installCmd) {
            console.log(`   \x1b[36mInstalar:\x1b[0m`);
            console.log(`   ${check.installCmd}`);
        }
        console.log('');
    });

    if (result.status === 'error') {
        console.log('\x1b[31m❌ Dependências faltando!\x1b[0m\n');
        process.exit(1);
    }

    console.log('\x1b[32m✅ Todas as dependências estão OK!\x1b[0m\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Erro:', err.message);
    process.exit(1);
});
