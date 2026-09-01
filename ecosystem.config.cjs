const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'smebuze-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 3000,
      },
    },
    {
      name: 'smebuze-web',
      cwd: path.join(root, 'apps/website'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
    },
  ],
};
