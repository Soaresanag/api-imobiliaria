const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

function port(name, fallback) {
  const value = process.env[name] || fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} deve ser uma porta entre 1 e 65535`);
  }
  return Number(value);
}

for (const key of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[key] || process.env[key].startsWith('SUBSTITUA_')) {
    throw new Error(`Configure ${key} no arquivo .env local do projeto`);
  }
}
if (!/^[a-zA-Z0-9_]{1,64}$/.test(process.env.DB_NAME)) {
  throw new Error('DB_NAME deve conter até 64 letras, números ou sublinhados');
}

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: port('PORT', 3000),
  database: {
    host: process.env.DB_HOST,
    port: port('DB_PORT', 13316),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
};
