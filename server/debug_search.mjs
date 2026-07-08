import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fitlife_db',
  waitForConnections: true,
  connectionLimit: 2
});

const q = 'iogurte';
const terms = q.trim().split(/\s+/)
  .map(t => t.toLowerCase().replace(/[,.;()]/g, ''))
  .filter(t => t.length >= 1);

console.log('Termos:', terms);

const whereClauses = terms.map(() => 'name LIKE ? COLLATE utf8mb4_unicode_ci');
const scoreClauses = [];
const finalParams = [];

terms.forEach(t => {
  scoreClauses.push('(CASE WHEN name LIKE ? COLLATE utf8mb4_unicode_ci THEN 3 ELSE 0 END)');
  finalParams.push(`%${t}%`);
});

scoreClauses.push('(CASE WHEN name LIKE ? COLLATE utf8mb4_unicode_ci THEN 5 ELSE 0 END)');
finalParams.push(`${terms[0]}%`);

terms.forEach(t => {
  finalParams.push(`%${t}%`);
});

const fullQuery = `
  SELECT id, name, calories, protein, carbs, fat, serving_size, category,
  (${scoreClauses.join(' + ')}) as score
  FROM foods
  WHERE (${whereClauses.join(' OR ')})
  ORDER BY score DESC, name ASC LIMIT 30
`;

console.log('\nQuery:\n', fullQuery);
console.log('\nParams:', finalParams);

try {
  const [rows] = await pool.query(fullQuery, finalParams);
  console.log('\nResultados:', rows.length);
  rows.forEach(r => console.log(' -', r.name, '| score:', r.score));
} catch(e) {
  console.error('\nERRO NA QUERY EXATA DO SERVIDOR:', e.message);
  
  // Tentar sem COLLATE para confirmar
  console.log('\nTentando sem COLLATE...');
  const simpleQuery = `SELECT id, name, calories FROM foods WHERE name LIKE ? LIMIT 5`;
  const [r2] = await pool.query(simpleQuery, [`%${q}%`]);
  console.log('Sem COLLATE funcionou:', r2.length, 'resultados');
  r2.forEach(r => console.log(' -', r.name));
}

await pool.end();
