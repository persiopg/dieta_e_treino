import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

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
    ) ENGINE=InnoDB;`
  ];

  for (const query of queries) {
    await pool.query(query);
  }
  console.log('Tabelas verificadas/criadas com sucesso no MySQL.');
}

export function getPool() {
  if (!pool) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase primeiro.');
  }
  return pool;
}
