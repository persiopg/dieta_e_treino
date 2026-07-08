/**
 * Script de migração: importa todos os alimentos do foodDatabase.js para o MySQL.
 * Execute com: node migrate_fooddb.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { createRequire } from 'module';

dotenv.config();

// Importar o banco estático de alimentos do frontend
const require = createRequire(import.meta.url);

// Lê o arquivo como texto e extrai o array
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawCode = readFileSync(resolve(__dirname, '../src/data/foodDatabase.js'), 'utf-8');

// Extrair o array do export usando eval (seguro pois é arquivo local controlado)
const arrayMatch = rawCode.match(/export const initialFoodDatabase = (\[[\s\S]*\]);/);
if (!arrayMatch) {
  console.error('Não foi possível extrair o array do foodDatabase.js');
  process.exit(1);
}

const foods = JSON.parse(arrayMatch[1]);
console.log(`Total de alimentos no foodDatabase.js: ${foods.length}`);

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fitlife_db',
  waitForConnections: true,
  connectionLimit: 5
});

try {
  // Buscar todos os nomes já existentes no banco
  const [existingRows] = await pool.query('SELECT name FROM foods');
  const existingNames = new Set(existingRows.map(r => r.name.toLowerCase().trim()));

  console.log(`Alimentos já no MySQL: ${existingNames.size}`);

  let inserted = 0;
  let skipped = 0;

  for (const food of foods) {
    const name = (food.name || '').trim();
    if (!name) { skipped++; continue; }
    
    // Pular se já existe (por nome, case insensitive)
    if (existingNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }

    const calories = Math.round(Number(food.calories) || 0);
    const protein = Number(food.protein) || 0;
    const carbs = Number(food.carbs) || 0;
    const fat = Number(food.fat) || 0;
    const servingSize = food.servingSize || '100g';
    const category = food.category || 'Geral';

    await pool.query(
      'INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, calories, protein, carbs, fat, servingSize, category]
    );

    existingNames.add(name.toLowerCase()); // evitar duplicatas dentro do próprio arquivo
    inserted++;
  }

  console.log(`\n✅ Migração concluída!`);
  console.log(`   Inseridos: ${inserted} novos alimentos`);
  console.log(`   Ignorados: ${skipped} (já existiam ou inválidos)`);

  const [total] = await pool.query('SELECT COUNT(*) as count FROM foods');
  console.log(`   Total no MySQL agora: ${total[0].count} alimentos`);

} catch (e) {
  console.error('Erro durante a migração:', e.message);
} finally {
  await pool.end();
}
