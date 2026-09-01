const path = require('path');
const fs = require('fs');

const root = __dirname;
const apiDir = path.join(root, 'apps/api');
const apiMain = fs.existsSync(path.join(apiDir, 'dist/main.js'))
  ? 'dist/main.js'
  : 'dist/src/main.js';

module.exports = {
  apps: [
    {
      name: 'smebuze-api',
      cwd: apiDir,
      script: apiMain,
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
