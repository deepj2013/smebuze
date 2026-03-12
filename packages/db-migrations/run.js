const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const migrationsDir = __dirname;
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

const dbUrl = process.env.DATABASE_URL || `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'smebuzz'}`;

for (const file of files) {
  console.log('Running', file);
  execSync(`psql "${dbUrl}" -f "${path.join(migrationsDir, file)}"`, {
    stdio: 'inherit',
  });
}
console.log('Migrations done.');
