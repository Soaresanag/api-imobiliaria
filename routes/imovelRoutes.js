const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function idValido(id) {
  return /^[1-9]\d*$/.test(String(id)) && Number.isSafeInteger(Number(id));
}

function validarImovel(body) {
  const { descricao, bairro, valor } = body || {};
  if (typeof descricao !== 'string' || !descricao.trim() || descricao.length > 255) return 'Descrição obrigatória (até 255 caracteres)';
  if (typeof bairro !== 'string' || !bairro.trim() || bairro.length > 100) return 'Bairro obrigatório (até 100 caracteres)';
  if (!['number', 'string'].includes(typeof valor) || !/^\d{1,10}(\.\d{1,2})?$/.test(String(valor)) || !Number.isFinite(Number(valor)) || Number(valor) > 9999999999.99) return 'Valor deve ser um número entre 0 e 9999999999.99, com até duas casas decimais';
  return null;
}

function erroBanco(res, erro) {
  console.error('Erro no banco de dados:', erro);
  return res.status(500).json({ erro: 'Erro ao executar operação no banco de dados' });
}

// GET /imovel - listar todos os imóveis
router.get('/', async (req, res) => {
  try {
    const [imoveis] = await pool.execute('SELECT id, descricao, bairro, valor FROM imovel ORDER BY id');
    return res.json(imoveis);
  } catch (erro) { return erroBanco(res, erro); }
});

// GET /imovel/:id - consultar um imóvel
router.get('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID inválido' });
  try {
    const [imoveis] = await pool.execute('SELECT id, descricao, bairro, valor FROM imovel WHERE id = ?', [req.params.id]);
    if (!imoveis.length) return res.status(404).json({ erro: 'Imóvel não encontrado' });
    return res.json(imoveis[0]);
  } catch (erro) { return erroBanco(res, erro); }
});

// POST /imovel - cadastrar um imóvel
router.post('/', async (req, res) => {
  const erroValidacao = validarImovel(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });
  const { descricao, bairro, valor } = req.body;
  try {
    const [resultado] = await pool.execute('INSERT INTO imovel (descricao, bairro, valor) VALUES (?, ?, ?)', [descricao.trim(), bairro.trim(), Number(valor)]);
    return res.status(201).json({ mensagem: 'Imóvel cadastrado', imovel: { id: resultado.insertId, descricao: descricao.trim(), bairro: bairro.trim(), valor: Number(valor) } });
  } catch (erro) { return erroBanco(res, erro); }
});

// PUT /imovel/:id - atualizar um imóvel
router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID inválido' });
  const erroValidacao = validarImovel(req.body);
  if (erroValidacao) return res.status(400).json({ erro: erroValidacao });
  const { descricao, bairro, valor } = req.body;
  try {
    const [resultado] = await pool.execute('UPDATE imovel SET descricao = ?, bairro = ?, valor = ? WHERE id = ?', [descricao.trim(), bairro.trim(), Number(valor), req.params.id]);
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Imóvel não encontrado' });
    return res.json({ mensagem: 'Imóvel atualizado', imovel: { id: Number(req.params.id), descricao: descricao.trim(), bairro: bairro.trim(), valor: Number(valor) } });
  } catch (erro) { return erroBanco(res, erro); }
});

// DELETE /imovel/:id - remover um imóvel
router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ erro: 'ID inválido' });
  try {
    const [resultado] = await pool.execute('DELETE FROM imovel WHERE id = ?', [req.params.id]);
    if (!resultado.affectedRows) return res.status(404).json({ erro: 'Imóvel não encontrado' });
    return res.json({ mensagem: 'Imóvel excluído com sucesso' });
  } catch (erro) { return erroBanco(res, erro); }
});

module.exports = router;
