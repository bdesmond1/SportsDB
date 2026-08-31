require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Milk3001',
  database: process.env.DB_NAME || 'college_sports_facility',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.query('SELECT 1', err => {
  if (err) console.error('❌ MySQL Error:', err.message);
  else console.log('✅ MySQL Connected');
});

module.exports = db;

