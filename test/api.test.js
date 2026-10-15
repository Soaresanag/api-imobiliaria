const { test } = require('node:test');
const assert = require('node:assert/strict');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function request(method, route, body) {
  if (method === 'GET' || method === 'HEAD') body = undefined;
  const response = await fetch(base + route, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
}

test('CRUD real via HTTP (requer npm start e banco acessível)', async t => {
  const original = { descricao: 'Teste automatizado: casa', bairro: 'Centro', valor: 450000.25 };
  let id;
  try {
    await t.test('POST /imovel: cadastro com ID', async () => {
      const created = await request('POST', '/imovel', original);
      assert.equal(created.status, 201);
      id = created.body.imovel.id;
      assert.ok(Number.isInteger(id));
    });
    assert.ok(id, 'Cadastro necessário para continuar');
    await t.test('GET /imovel e /imovel/: listagem contém cadastro', async () => {
    for (const route of ['/imovel', '/imovel/']) {
      const list = await request('GET', route);
      assert.equal(list.status, 200);
      assert.ok(list.body.some(item => item.id === id));
    }
    });
    await t.test('GET /imovel/:id: descrição e valor persistidos', async () => {
    const found = await request('GET', `/imovel/${id}`);
    assert.equal(found.status, 200);
    assert.equal(found.body.descricao, original.descricao);
    assert.equal(Number(found.body.valor), original.valor);
    });
    const updated = { descricao: 'Teste atualizado', bairro: 'Jardim', valor: 123.45 };
    await t.test('PUT /imovel/:id: atualização e repetição persistidas', async () => {
    assert.equal((await request('PUT', `/imovel/${id}`, updated)).status, 200);
    assert.equal((await request('PUT', `/imovel/${id}`, updated)).status, 200);
    const read = await request('GET', `/imovel/${id}`);
    assert.equal(read.body.bairro, updated.bairro);
    assert.equal(read.body.descricao, updated.descricao);
    assert.equal(Number(read.body.valor), updated.valor);
    });
    await t.test('DELETE /imovel/:id: exclusão confirmada e inexistente retorna 404', async () => {
    assert.equal((await request('DELETE', `/imovel/${id}`)).status, 200);
    assert.equal((await request('GET', `/imovel/${id}`)).status, 404);
    assert.equal((await request('PUT', `/imovel/${id}`, updated)).status, 404);
    assert.equal((await request('DELETE', `/imovel/${id}`)).status, 404);
    });
    id = undefined;
    await t.test('Entradas inválidas, JSON malformado e rota inexistente', async () => {
    for (const valor of [null, '', ' ', [], {}, true, -1, 1.234, '0x12', 10000000000]) {
      assert.equal((await request('POST', '/imovel', { ...original, valor })).status, 400);
    }
    assert.equal((await request('POST', '/imovel', {})).status, 400);
    for (const method of ['GET', 'PUT', 'DELETE']) {
      assert.equal((await request(method, '/imovel/abc', original)).status, 400);
    }
    const invalidJson = await fetch(base + '/imovel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(invalidJson.status, 400);
    assert.equal((await request('GET', '/rota-inexistente')).status, 404);
    });
  } finally {
    if (id !== undefined) await request('DELETE', `/imovel/${id}`);
  }
});
