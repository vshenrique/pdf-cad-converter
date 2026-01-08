module.exports = {
  apps: [{
    name: 'pdf-converter',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      // Caminho do Poppler (Windows usa local, Linux usa system PATH)
      POPPLER_PATH: process.platform === 'win32'
        ? './tools/poppler/Library/bin'
        : null
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    kill_timeout: 5000,
    wait_ready: false,
    autodump: true
  }]
};
