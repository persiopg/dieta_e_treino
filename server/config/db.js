import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'fitlife_db';

let pool;

export async function initDatabase() {
  try {
    // 1. Conectar ao MySQL sem especificar o banco de dados inicialmente
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword
    });

    console.log('Conectado ao MySQL Server. Verificando/Criando banco de dados...');
    
    // 2. Criar banco de dados se não existir
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.end();

    // 3. Criar Pool de conexões apontando para o banco de dados recém-verificado
    pool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    console.log(`Pool de conexões criado para o banco: "${dbName}".`);

    // 4. Executar a criação das tabelas se elas não existirem
    await createTables();

    // 5. Popular a tabela de alimentos se necessário
    await seedFoodsTableIfNeeded();

    console.log('Banco de dados inicializado com sucesso.');
    return pool;
  } catch (error) {
    console.error('Falha ao conectar ou inicializar o MySQL. Verifique se o serviço está ativo e as credenciais no .env estão corretas.');
    console.error(error.message);
    throw error;
  }
}

async function createTables() {
  const queries = [
    // Tabela: Users
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      gender VARCHAR(50),
      age INT,
      weight DECIMAL(5,2),
      height DECIMAL(5,2),
      activity_level DECIMAL(5,3),
      goal VARCHAR(100),
      workout_days INT,
      bmr INT,
      tdee INT,
      target_calories INT,
      protein_target INT,
      carbs_target INT,
      fat_target INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    // Tabela: Water Logs (ingestão de água)
    `CREATE TABLE IF NOT EXISTS water_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      amount_ml INT NOT NULL,
      logged_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_water_date (user_id, logged_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Weight Logs (histórico de peso)
    `CREATE TABLE IF NOT EXISTS weight_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      weight DECIMAL(5,2) NOT NULL,
      logged_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_weight_date (user_id, logged_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Workout Logs (historico de treinos completados no dia)
    `CREATE TABLE IF NOT EXISTS workout_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      workout_day_name VARCHAR(255) NOT NULL,
      logged_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_workout_date (user_id, workout_day_name, logged_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Workout Days (Rotinas de treinos do usuário)
    `CREATE TABLE IF NOT EXISTS workout_days (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Workout Exercises (Exercícios de cada dia de treino)
    `CREATE TABLE IF NOT EXISTS workout_exercises (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workout_day_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      \`sets\` INT NOT NULL,
      reps VARCHAR(50) NOT NULL,
      rest INT NOT NULL,
      weight DECIMAL(5,2) DEFAULT 0.00,
      FOREIGN KEY (workout_day_id) REFERENCES workout_days(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Diet Meals (Refeições do usuário)
    `CREATE TABLE IF NOT EXISTS diet_meals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Diet Meal Items (Alimentos vinculados à refeição)
    `CREATE TABLE IF NOT EXISTS diet_meal_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      diet_meal_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      quantity DECIMAL(7,2) NOT NULL,
      protein DECIMAL(5,2) NOT NULL,
      carbs DECIMAL(5,2) NOT NULL,
      fat DECIMAL(5,2) NOT NULL,
      calories INT NOT NULL,
      FOREIGN KEY (diet_meal_id) REFERENCES diet_meals(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Diet Logs (Diário Alimentar - Registro real de consumo)
    `CREATE TABLE IF NOT EXISTS diet_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      meal_name VARCHAR(255) NOT NULL,
      food_name VARCHAR(255) NOT NULL,
      quantity DECIMAL(7,2) NOT NULL,
      protein DECIMAL(5,2) NOT NULL,
      carbs DECIMAL(5,2) NOT NULL,
      fat DECIMAL(5,2) NOT NULL,
      calories INT NOT NULL,
      logged_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`,

    // Tabela: Foods (Catálogo geral da TACO para consulta)
    `CREATE TABLE IF NOT EXISTS foods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      calories INT NOT NULL,
      protein DECIMAL(5,2) NOT NULL,
      carbs DECIMAL(5,2) NOT NULL,
      fat DECIMAL(5,2) NOT NULL,
      serving_size VARCHAR(50) DEFAULT '100g',
      category VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  ];

  for (const query of queries) {
    await pool.query(query);
  }

  // Migrações de colunas adicionais para Treinos Inteligentes e MET
  try {
    await pool.query("ALTER TABLE workout_exercises ADD COLUMN rationale TEXT");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE workout_exercises ADD COLUMN expected_result TEXT");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE workout_exercises ADD COLUMN met DECIMAL(3,1) DEFAULT 3.5");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE workout_logs ADD COLUMN duration_minutes INT DEFAULT 45");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE workout_logs ADD COLUMN calories_burned INT DEFAULT 0");
  } catch (e) {}

  console.log('Tabelas verificadas/criadas com sucesso no MySQL.');
}

async function seedFoodsTableIfNeeded() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM foods');
    if (rows[0].count > 0) {
      console.log('Tabela de alimentos (foods) já possui dados. Pulando seed.');
      return;
    }

    console.log('Populando tabela de alimentos a partir do CSV da TACO...');
    const csvPath = path.resolve(__dirname, '../../doc/Taco-4a-Edicao(CMVCol taco3).csv');

    if (!fs.existsSync(csvPath)) {
      console.warn(`Arquivo CSV da TACO não encontrado em: ${csvPath}. Pulando seed.`);
      return;
    }

    const content = fs.readFileSync(csvPath, 'latin1');
    const lines = content.split(/\r?\n/);
    
    let currentCategory = '';
    const foodsToInsert = [];

    const ignoreKeywords = [
      'número do', 'nmero do', 'descrição dos alimentos', 'descrio dos alimentos',
      'umidade', 'energia', 'proteína', 'protena', 'lipídeos', 'lipdeos',
      'carboidrato', 'taco', 'legenda', 'cinzas', 'colesterol', 'fibra'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(';');
      const firstPart = parts[0]?.trim();
      const secondPart = parts[1]?.trim();

      if (!firstPart) continue;

      const isHeader = ignoreKeywords.some(keyword => 
        firstPart.toLowerCase().includes(keyword) || 
        (secondPart && secondPart.toLowerCase().includes(keyword))
      );

      if (isHeader) continue;

      const hasOnlyFirstPart = parts.slice(1).every(p => !p.trim());
      if (hasOnlyFirstPart && isNaN(Number(firstPart))) {
        currentCategory = firstPart;
        continue;
      }

      const id = Number(firstPart);
      if (!isNaN(id) && id > 0) {
        const name = parts[1]?.trim();
        if (!name) continue;

        const cleanValue = (val) => {
          if (!val) return 0;
          const cleaned = val.trim().replace(',', '.');
          if (cleaned === 'NA' || cleaned === 'Tr' || cleaned === '*' || cleaned === '-') return 0;
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const calories = Math.round(cleanValue(parts[3]));
        const protein = cleanValue(parts[5]);
        const fat = cleanValue(parts[6]);
        const carbs = cleanValue(parts[8]);

        foodsToInsert.push([
          name,
          calories,
          protein,
          carbs,
          fat,
          '100g',
          currentCategory || 'Geral'
        ]);
      }
    }

    if (foodsToInsert.length > 0) {
      const query = 'INSERT INTO foods (name, calories, protein, carbs, fat, serving_size, category) VALUES ?';
      await pool.query(query, [foodsToInsert]);
      console.log(`Sucesso: ${foodsToInsert.length} alimentos da TACO cadastrados no MySQL.`);
    }
  } catch (error) {
    console.error('Erro ao popular a tabela de alimentos (seed):', error);
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase primeiro.');
  }
  return pool;
}
