const config = require('./config/environment');
const app = require('./app');
const pool = require('./config/database');

async function iniciar() {
  try {
    await pool.query('SELECT id, descricao, bairro, valor FROM imovel LIMIT 0');
    console.log('Conexão com MySQL/MariaDB estabelecida.');
    app.listen(config.port, config.host, () => console.log(`API disponível em http://${config.host}:${config.port}`)).on('error', async erro => {
      console.error('Falha ao iniciar HTTP:', erro.code || erro.message);
      process.exitCode = 1;
      await pool.end();
    });
  } catch (erro) {
    console.error('Falha na conexão com o banco:', erro.message);
    process.exitCode = 1;
    await pool.end();
  }
}
iniciar();
