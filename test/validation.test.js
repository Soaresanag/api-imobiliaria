const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');
const pool = require('../config/database');

test('Validações HTTP sem consultas ao banco', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/')).status, 200);
    assert.equal((await fetch(base + '/inexistente')).status, 404);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await fetch(base + '/imovel/abc', { method })).status, 400);
    }
    for (const method of ['POST', 'PUT']) {
      const route = method === 'POST' ? '/imovel' : '/imovel/1';
      const bodies = [{}, { descricao: ' ', bairro: 'Centro', valor: 1 }, { descricao: 'Casa', bairro: 'x'.repeat(101), valor: 1 }];
      for (const valor of [null, '', ' ', [], {}, true, -1, 1.234, '0x12', 10000000000]) bodies.push({ descricao: 'Casa', bairro: 'Centro', valor });
      for (const body of bodies) {
        assert.equal((await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).status, 400);
      }
    }
    assert.equal((await fetch(base + '/imovel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
