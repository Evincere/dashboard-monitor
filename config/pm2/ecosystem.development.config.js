module.exports = {
  apps: [
    {
      name: 'dashboard-monitor-dev',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/semper/dashboard-monitor',
      env_file: '.env.development',
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        HOSTNAME: '0.0.0.0'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false, // Next.js ya maneja hot-reload
      autorestart: true,
      max_restarts: 5,
      min_uptime: '5s',
      // Logs separados para desarrollo
      log_file: '/home/semper/dashboard-monitor/logs/dev-combined.log',
      out_file: '/home/semper/dashboard-monitor/logs/dev-out.log',
      error_file: '/home/semper/dashboard-monitor/logs/dev-error.log',
      time: true,
      merge_logs: true,
      // Configuraciones para desarrollo
      node_args: '--max-old-space-size=1024'
    }
  ]
};
