const fs = require('node:fs/promises');
const path = require('node:path');
const config = require('../config/environment');
const mysql = require('mysql2/promise');

async function main() {
  const database = config.database.database;
  if (!/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('DB_NAME deve conter apenas letras, números e sublinhado');
  const connection = await mysql.createConnection({
    ...config.database,
    database: undefined,
    connectTimeout: 10000,
    multipleStatements: true
  });
  try {
    const sql = await fs.readFile(path.join(__dirname, '..', 'database', 'imobiliaria.sql'), 'utf8');
    await connection.query(sql.replace(/\bimobiliaria\b/g, '`' + database + '`'));
    const [columns] = await connection.query('SHOW COLUMNS FROM imovel');
    for (const field of ['id', 'descricao', 'bairro', 'valor']) {
      if (!columns.some(column => column.Field === field)) throw new Error(`Tabela existente incompatível: falta ${field}`);
    }
    console.log(`Banco ${database} e tabela imovel preparados; campos verificados.`);
  } finally {
    await connection.end();
  }
}
main().catch(error => {
  console.error('Falha ao preparar o banco:', error.code || error.message);
  process.exitCode = 1;
});
