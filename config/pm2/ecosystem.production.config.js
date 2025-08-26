module.exports = {
  apps: [
    {
      name: 'dashboard-monitor',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: '/home/semper/dashboard-monitor',
      env_file: '.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 9002,
        HOSTNAME: '0.0.0.0'
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
