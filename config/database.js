const config = require('./environment');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  ...config.database,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  charset: 'utf8mb4'
});

module.exports = pool;
