module.exports = {
  apps: [
    {
      name: 'dashboard-monitor-dev',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false, // Next.js ya maneja el hot-reload
      env: {
        NODE_ENV: 'development',
        PORT: 9002
      },
      // Configuraciones para desarrollo
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      // Logs más verbosos en desarrollo
      log_file: './logs/dev-combined.log',
      out_file: './logs/dev-out.log',
      error_file: './logs/dev-error.log',
      time: true
    }
  ]
};
