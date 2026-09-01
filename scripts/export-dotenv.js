#!/usr/bin/env node
/**
 * Print `export KEY='value'` lines from a dotenv file so bash can eval them.
 * Do not `source .env` — values like MAIL_FROM=Name <email> break bash.
 */
const fs = require('fs');

const file = process.argv[2] || '.env';
const text = fs.readFileSync(file, 'utf8');

function shSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq < 1) continue;
  let key = line.slice(0, eq).trim();
  if (key.startsWith('export ')) key = key.slice(7).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
  let val = line.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
    (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
  ) {
    val = val.slice(1, -1);
  }
  process.stdout.write(`export ${key}=${shSingleQuote(val)}\n`);
}
