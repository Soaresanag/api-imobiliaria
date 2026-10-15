const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const mysql = require('mysql2/promise');
const root = path.resolve(__dirname, '..');
// Usa apenas as credenciais deste projeto; ignora variáveis globais.
const env = require('dotenv').parse(fs.readFileSync(path.join(root, '.env')));
const local = path.join(root, '.local');
const basedir = path.join(local, 'mariadb-11.4.10-winx64');
const datadir = path.join(local, 'data');
const ini = path.join(local, 'my.ini');
const normalize = value => path.resolve(value).toLowerCase().replace(/[\\/]+$/, '');
const unix = value => value.replace(/\\/g, '/');

function validate() {
  if (process.platform !== 'win32') throw new Error('Este utilitário portátil é exclusivo para Windows');
  if (env.DB_HOST !== '127.0.0.1' || env.DB_PORT !== '13316') throw new Error('Modo portátil exige 127.0.0.1:13316');
  if (env.DB_NAME !== 'imobiliaria' || env.DB_USER !== 'imobiliaria_app') throw new Error('Modo portátil exige banco e usuário exclusivos imobiliaria/imobiliaria_app');
  for (const key of ['DB_PASSWORD', 'DB_ROOT_PASSWORD']) {
    if (!env[key] || env[key].startsWith('SUBSTITUA_')) throw new Error(`Configure ${key} em .env`);
  }
  if (!fs.existsSync(path.join(basedir, 'bin', 'mariadbd.exe'))) throw new Error('Execute npm run db:portable:install primeiro');
}

async function freePort() {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', () => reject(new Error('Porta 127.0.0.1:13316 ocupada; nenhum processo será interrompido')));
    probe.listen(13316, '127.0.0.1', () => probe.close(resolve));
  });
}

async function main() {
  validate();
  const action = process.argv[2];
  if (action === 'init') {
    await freePort();
    if (fs.existsSync(datadir)) throw new Error('Diretório de dados já existe; inicialização recusada para preservar os dados');
    for (const dir of ['tmp', 'logs']) fs.mkdirSync(path.join(local, dir), { recursive: true });
    const template = path.join(local, 'bootstrap.ini');
    fs.writeFileSync(template, '[mysqld]\nbind-address=127.0.0.1\nskip-name-resolve\n');
    // O inicializador Windows passa --defaults-file=my.ini e --bootstrap ao servidor.
    // --config aponta exclusivamente para nosso template; não há --service.
    const result = spawnSync(path.join(basedir, 'bin', 'mariadb-install-db.exe'), [
      `--datadir=${datadir}`, `--config=${template}`, '--port=13316', `--password=${env.DB_ROOT_PASSWORD}`
    ], { cwd: local, encoding: 'utf8', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error('Inicialização falhou; verifique .local/data. Nenhum serviço foi registrado.');
    const config = `[mysqld]\nbasedir="${unix(basedir)}"\ndatadir="${unix(datadir)}"\ntmpdir="${unix(path.join(local, 'tmp'))}"\nport=13316\nbind-address=127.0.0.1\nskip-name-resolve\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_unicode_ci\ninnodb-buffer-pool-size=64M\nmax-connections=20\nskip-log-bin\nlog-error="${unix(path.join(local, 'logs', 'mariadb.log'))}"\npid-file="${unix(path.join(local, 'mariadb.pid'))}"\n`;
    fs.writeFileSync(ini, config);
    console.log('Dados e configuração criados exclusivamente em .local; serviço Windows não registrado.');
  } else if (action === 'start') {
    await freePort();
    if (!fs.existsSync(ini)) throw new Error('Execute npm run db:portable:init primeiro');
    const child = spawn(path.join(basedir, 'bin', 'mariadbd.exe'), [`--defaults-file=${ini}`, '--console'], {
      cwd: local, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
    });
    const log = fs.createWriteStream(path.join(local, 'logs', 'console.log'), { flags: 'a' });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on('error', error => { console.error(error.message); process.exitCode = 1; });
    child.on('exit', code => { log.end(); process.exitCode = code || 0; });
  } else if (action === 'provision' || action === 'stop' || action === 'status') {
    const connection = await mysql.createConnection({ host: '127.0.0.1', port: 13316, user: 'root', password: env.DB_ROOT_PASSWORD, connectTimeout: 5000 });
    try {
      const [[identity]] = await connection.query('SELECT @@datadir AS datadir, @@port AS port, @@version AS version, @@bind_address AS address');
      if (normalize(identity.datadir) !== normalize(datadir) || identity.port !== 13316 || identity.address !== '127.0.0.1') {
        throw new Error('Identidade do servidor diferente deste projeto; operação recusada');
      }
      if (action === 'provision') {
        await connection.query('CREATE DATABASE IF NOT EXISTS imobiliaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        const account = "'imobiliaria_app'@'127.0.0.1'";
        await connection.query(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ?`, [env.DB_PASSWORD]);
        await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON imobiliaria.* TO ${account}`);
        console.log('Banco e usuário exclusivos preparados; nenhuma permissão global concedida à aplicação.');
      } else if (action === 'stop') {
        await connection.query('SHUTDOWN');
        console.log('Encerramento solicitado somente ao MariaDB deste projeto, após conferir seu datadir.');
      } else {
        console.log(JSON.stringify(identity));
      }
    } finally { await connection.end(); }
  } else throw new Error('Ação esperada: init, start, provision, status ou stop');
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
