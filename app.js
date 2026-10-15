const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const imovelRoutes = require('./routes/imovelRoutes');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ mensagem: 'API Imobiliária funcionando', rotas: '/imovel' }));
app.use('/imovel', imovelRoutes);
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Corpo da requisição muito grande' });
  console.error('Erro HTTP:', err.code || err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});
module.exports = app;
