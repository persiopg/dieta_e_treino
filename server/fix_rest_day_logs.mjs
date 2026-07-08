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
  // Buscar logs de descanso com calorias maiores que 0
  const [rows] = await pool.query(
    "SELECT id, workout_day_name, logged_date, calories_burned FROM workout_logs WHERE (workout_day_name LIKE '%descanso%' OR workout_day_name LIKE '%off%') AND calories_burned > 0"
  );
  console.log('Logs de descanso com calorias incorretas encontrados:', rows);

  if (rows.length > 0) {
    await pool.query(
      "UPDATE workout_logs SET calories_burned = 0, duration_minutes = 0 WHERE (workout_day_name LIKE '%descanso%' OR workout_day_name LIKE '%off%')"
    );
    console.log('Calorias gastas no descanso corrigidas para 0 com sucesso!');
  } else {
    console.log('Nenhum log de descanso incorreto para corrigir no MySQL.');
  }

} catch (e) {
  console.error('Erro:', e.message);
} finally {
  await pool.end();
}
