/**
 * PM2 生产环境配置
 * 使用：cd backend && pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'campus-secondhand',
      script: 'src/app.js',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      kill_timeout: 10000,
      exp_backoff_restart_delay: 500,
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
}
