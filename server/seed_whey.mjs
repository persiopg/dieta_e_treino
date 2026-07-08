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

try {
  // Verificar o que temos de whey
  const [existing] = await pool.query("SELECT id, name, calories, protein, carbs, fat FROM foods WHERE name LIKE '%whey%' OR name LIKE '%Whey%'");
  console.log('Registros de Whey encontrados:', existing);

  if (existing.length === 0) {
    // Inserir Whey Protein no banco
    await pool.query(
      "INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['Whey Protein', 360, 75.0, 10.0, 2.0, '100g', 'Suplementos']
    );
    await pool.query(
      "INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ['Whey Protein Concentrado', 360, 75.0, 10.0, 2.0, '100g', 'Suplementos']
    );
    console.log('Whey Protein inserido com sucesso!');
  } else {
    console.log('Whey já existe no banco.');
  }

  // Confirmar final
  const [final] = await pool.query("SELECT id, name, calories, protein, carbs, fat FROM foods WHERE name LIKE '%whey%' OR name LIKE '%Whey%'");
  console.log('Estado final:', final);
} catch (e) {
  console.error('Erro:', e.message);
} finally {
  await pool.end();
}
