module.exports = {
  apps: [
    {
      name: 'dashboard-monitor',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/semper/dashboard-monitor',
      env: {
        NODE_ENV: 'production',
        PORT: 9002,
        HOSTNAME: '0.0.0.0',
        DB_HOST: 'localhost',
        DB_PORT: 3307,
        DB_USER: 'root',
        DB_PASSWORD: 'root1234',
        DB_DATABASE: 'mpd_concursos',
        JWT_SECRET: 'dashboard-monitor-secret-key-2025',
        NEXT_TELEMETRY_DISABLED: 1,
        DOCUMENT_STORAGE_PATH: '/var/lib/docker/volumes/mpd_concursos_storage_data_prod/_data/documents',
        BACKEND_URL: 'http://localhost:8080',
        BACKEND_USERNAME: 'admin',
        BACKEND_PASSWORD: 'admin123',
        DEBUG: false,
        LOG_LEVEL: 'info',
        VERBOSE_LOGGING: false
      },
      instances: 1,
      exec_mode: 'fork',
      log_file: '/home/semper/dashboard-monitor/logs/combined.log',
      out_file: '/home/semper/dashboard-monitor/logs/out.log',
      error_file: '/home/semper/dashboard-monitor/logs/error.log',
      time: true,
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=512',
      // Configuraciones específicas de producción
      watch: false,
      autorestart: true,
      // Manejo de errores robusto
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 5000
    }
  ]
};
