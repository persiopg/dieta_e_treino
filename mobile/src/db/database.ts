import { type SQLiteDatabase } from 'expo-sqlite';
import { initialFoodDatabase } from '../data/foodDatabase';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 4;
  
  // Obter a versão atual do banco de dados
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;
  
  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    // Criar tabelas iniciais
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS profile (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        weight REAL,
        height REAL,
        target_calories INTEGER,
        target_protein INTEGER,
        target_carbs INTEGER,
        target_fat INTEGER
      );

      CREATE TABLE IF NOT EXISTS diet_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        food_name TEXT,
        quantity REAL,
        protein REAL,
        carbs REAL,
        fat REAL,
        calories REAL,
        logged_date TEXT,
        meal_name TEXT,
        is_pending_sync INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        workout_day_name TEXT,
        logged_date TEXT,
        is_pending_sync INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS water_logs (
        id TEXT PRIMARY KEY,
        amount_ml INTEGER,
        logged_date TEXT,
        is_pending_sync INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        weight REAL,
        logged_date TEXT,
        is_pending_sync INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT,
        payload TEXT,
        target_id TEXT,
        created_at TEXT
      );
    `);
    
    await db.execAsync('PRAGMA user_version = 1');
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    await db.execAsync('PRAGMA user_version = 2');
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    try {
      await db.execAsync('ALTER TABLE diet_logs RENAME COLUMN meal_type TO meal_name');
      console.log('Coluna meal_type migrada com sucesso para meal_name no diet_logs (v3).');
    } catch (e) {
      console.log('Tentativa de RENAME COLUMN falhou (coluna meal_name já existe ou tabela vazia):', e);
    }
    await db.execAsync('PRAGMA user_version = 3');
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS foods (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          calories INTEGER NOT NULL,
          protein REAL NOT NULL,
          carbs REAL NOT NULL,
          fat REAL NOT NULL,
          serving_size TEXT DEFAULT '100g',
          category TEXT NOT NULL
        );
      `);
      console.log('Tabela foods criada no SQLite local (v4).');

      await db.withTransactionAsync(async () => {
        for (const food of initialFoodDatabase) {
          await db.runAsync(
            `INSERT OR IGNORE INTO foods (id, name, calories, protein, carbs, fat, serving_size, category) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              food.id,
              food.name,
              food.calories,
              food.protein,
              food.carbs,
              food.fat,
              food.servingSize,
              food.category
            ]
          );
        }
      });
      console.log('Tabela foods populada no SQLite local com os alimentos da TACO.');
    } catch (e) {
      console.error('Erro na migração SQLite v4:', e);
    }
    await db.execAsync('PRAGMA user_version = 4');
    currentVersion = 4;
  }
}

export async function clearAllLocalTables(db: SQLiteDatabase) {
  try {
    await db.execAsync(`
      DELETE FROM profile;
      DELETE FROM diet_logs;
      DELETE FROM workout_logs;
      DELETE FROM water_logs;
      DELETE FROM weight_logs;
      DELETE FROM sync_queue;
      DELETE FROM cached_metadata;
    `);
    console.log('Tabelas SQLite locais limpas com sucesso.');
  } catch (error) {
    console.error('Erro ao limpar tabelas SQLite:', error);
  }
}
