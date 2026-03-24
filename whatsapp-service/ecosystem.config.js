module.exports = {
  apps: [
    {
      name: 'whatsapp-service',
      script: './index-auto-reconnect.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Error handling
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policies
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Versioning
      version: '1.0.0',
      description: 'WhatsApp Service with Auto-Reconnect 24/7'
    }
  ],
  
  // Cluster mode for environments with multiple cores
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:user/project.git',
      path: '/var/www/whatsapp-service',
      'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js --env production'
    }
  }
};
