import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper to get formatted date string (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// ==========================================
// RASTREADOR DE ÁGUA
// ==========================================

// @route   GET /api/tracker/water
// @desc    Obter consumo de água para uma data específica (?date=YYYY-MM-DD)
router.get('/water', authMiddleware, async (req, res) => {
  const date = req.query.date || getTodayString();

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT amount_ml FROM water_logs WHERE user_id = ? AND logged_date = ?',
      [req.userId, date]
    );

    const amount = rows.length > 0 ? rows[0].amount_ml : 0;
    res.json({ date, amount_ml: amount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao obter consumo de água.' });
  }
});

// @route   POST /api/tracker/water
// @desc    Salvar/Atualizar consumo de água para uma data
router.post('/water', authMiddleware, async (req, res) => {
  const { amount_ml, date } = req.body;
  const targetDate = date || getTodayString();

  if (amount_ml === undefined || amount_ml < 0) {
    return res.status(400).json({ error: 'Quantidade de água inválida.' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO water_logs (user_id, amount_ml, logged_date) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE amount_ml = VALUES(amount_ml)`,
      [req.userId, amount_ml, targetDate]
    );

    res.json({ message: 'Consumo de água atualizado.', amount_ml, date: targetDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar consumo de água.' });
  }
});

// ==========================================
// RASTREADOR DE PESO
// ==========================================

// @route   GET /api/tracker/weight/history
// @desc    Obter histórico recente de registros de peso
router.get('/weight/history', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT weight, logged_date FROM weight_logs WHERE user_id = ? ORDER BY logged_date DESC LIMIT 30',
      [req.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico de peso.' });
  }
});

// @route   POST /api/tracker/weight
// @desc    Salvar/Atualizar peso para uma data
router.post('/weight', authMiddleware, async (req, res) => {
  const { weight, date } = req.body;
  const targetDate = date || getTodayString();

  if (!weight || weight <= 0) {
    return res.status(400).json({ error: 'Peso inválido.' });
  }

  try {
    const pool = getPool();
    
    // Inserir/Atualizar no log de histórico de pesos
    await pool.query(
      `INSERT INTO weight_logs (user_id, weight, logged_date) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE weight = VALUES(weight)`,
      [req.userId, weight, targetDate]
    );

    // Se for o registro de hoje (ou mais atual), atualizar o peso na tabela users principal
    const [latestLogs] = await pool.query(
      'SELECT logged_date FROM weight_logs WHERE user_id = ? ORDER BY logged_date DESC LIMIT 1',
      [req.userId]
    );
    
    if (latestLogs.length > 0 && latestLogs[0].logged_date === targetDate) {
      await pool.query('UPDATE users SET weight = ? WHERE id = ?', [weight, req.userId]);
    }

    res.json({ message: 'Peso atualizado com sucesso.', weight, date: targetDate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar peso.' });
  }
});

// ==========================================
// CONCLUSAO DE TREINOS DO DIA
// ==========================================

// @route   GET /api/tracker/workout-done
// @desc    Verificar se algum treino foi concluído na data (?date=YYYY-MM-DD)
router.get('/workout-done', authMiddleware, async (req, res) => {
  const date = req.query.date || getTodayString();

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT workout_day_name FROM workout_logs WHERE user_id = ? AND logged_date = ?',
      [req.userId, date]
    );

    const isDone = rows.length > 0;
    const dayName = isDone ? rows[0].workout_day_name : null;

    res.json({ date, isDone, workout_day_name: dayName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao verificar conclusão de treino.' });
  }
});

// @route   POST /api/tracker/workout-done
// @desc    Registrar treino do dia como concluído
router.post('/workout-done', authMiddleware, async (req, res) => {
  const { workout_day_name, date, isDone } = req.body;
  const targetDate = date || getTodayString();

  try {
    const pool = getPool();
    
    if (isDone) {
      await pool.query(
        `INSERT INTO workout_logs (user_id, workout_day_name, logged_date) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE workout_day_name = VALUES(workout_day_name)`,
        [req.userId, workout_day_name || 'Treino Concluído', targetDate]
      );
      res.json({ message: 'Treino registrado como concluído.', isDone: true, date: targetDate });
    } else {
      // Se isDone for falso, removemos o registro
      await pool.query(
        'DELETE FROM workout_logs WHERE user_id = ? AND logged_date = ?',
        [req.userId, targetDate]
      );
      res.json({ message: 'Registro de treino removido.', isDone: false, date: targetDate });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar status do treino.' });
  }
});

// @route   GET /api/tracker/water/history
// @desc    Obter histórico de consumo de água dos últimos 14 dias
router.get('/water/history', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT amount_ml, logged_date FROM water_logs WHERE user_id = ? ORDER BY logged_date DESC LIMIT 14',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico de água.' });
  }
});

// @route   GET /api/tracker/workout/history
// @desc    Obter histórico de treinos concluídos dos últimos 90 dias
router.get('/workout/history', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT workout_day_name, logged_date FROM workout_logs WHERE user_id = ? ORDER BY logged_date DESC LIMIT 90',
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar histórico de treinos.' });
  }
});

export default router;
