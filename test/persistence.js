const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const config = require('../config/environment');
const stateFile = path.join(__dirname, '..', '.local', 'persistence-test.json');
const base = `http://${config.host}:${config.port}`;
const sample = { descricao: 'Teste de persistência após reinício', bairro: 'Faculdade', valor: 98765.43 };

async function main() {
  if (process.argv[2] === 'create') {
    if (fs.existsSync(stateFile)) throw new Error('Há um teste de persistência pendente; não sobrescrever seu ID');
    const response = await fetch(base + '/imovel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sample) });
    assert.equal(response.status, 201);
    const { imovel } = await response.json();
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify({ id: imovel.id }));
    const connection = await mysql.createConnection(config.database);
    try {
      const [[row]] = await connection.execute('SELECT descricao, bairro, valor FROM imovel WHERE id = ?', [imovel.id]);
      assert.equal(row.descricao, sample.descricao);
      assert.equal(Number(row.valor), sample.valor);
    } finally { await connection.end(); }
    console.log('Registro criado via HTTP e confirmado em conexão SQL independente. ID:', imovel.id);
  } else if (process.argv[2] === 'verify') {
    const { id } = JSON.parse(fs.readFileSync(stateFile));
    const response = await fetch(base + '/imovel/' + id);
    assert.equal(response.status, 200);
    const row = await response.json();
    assert.equal(row.descricao, sample.descricao);
    assert.equal(row.bairro, sample.bairro);
    assert.equal(Number(row.valor), sample.valor);
    assert.equal((await fetch(base + '/imovel/' + id, { method: 'DELETE' })).status, 200);
    assert.equal((await fetch(base + '/imovel/' + id)).status, 404);
    fs.unlinkSync(stateFile);
    console.log('Registro recuperado com os mesmos dados após reinício do banco. Limpeza do ID de teste confirmada.');
  } else throw new Error('Use create ou verify; reinicie somente o banco deste projeto entre as duas etapas');
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
