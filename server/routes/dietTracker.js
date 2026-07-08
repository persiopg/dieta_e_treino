import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper para obter a data atual formatada (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Helper para calcular a data anterior (Ontem)
function getYesterdayString(dateStr) {
  const d = new Date(dateStr + 'T12:00:00'); // Evita problemas de fuso horário
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ==========================================
// DIÁRIO ALIMENTAR: ROTAS
// ==========================================

// @route   GET /api/tracker/diet
// @desc    Obter alimentos consumidos em uma data (?date=YYYY-MM-DD)
router.get('/', authMiddleware, async (req, res) => {
  const date = req.query.date || getTodayString();

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, meal_name, food_name, quantity, protein, carbs, fat, calories, logged_date FROM diet_logs WHERE user_id = ? AND logged_date = ? ORDER BY id ASC',
      [req.userId, date]
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar diário alimentar:', error);
    res.status(500).json({ error: 'Erro ao obter registros de refeição.' });
  }
});

// @route   POST /api/tracker/diet
// @desc    Adicionar um alimento consumido no diário
router.post('/', authMiddleware, async (req, res) => {
  const { meal_name, food_name, quantity, protein, carbs, fat, calories, date } = req.body;
  const targetDate = date || getTodayString();

  if (!meal_name || !food_name || quantity === undefined || quantity <= 0) {
    return res.status(400).json({ error: 'Dados de entrada inválidos para registrar alimento.' });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO diet_logs (user_id, meal_name, food_name, quantity, protein, carbs, fat, calories, logged_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        req.userId, 
        meal_name, 
        food_name, 
        Number(quantity), 
        Number(protein || 0), 
        Number(carbs || 0), 
        Number(fat || 0), 
        Math.round(calories || 0), 
        targetDate
      ]
    );

    res.status(201).json({
      message: 'Alimento registrado no diário com sucesso.',
      id: result.insertId,
      meal_name,
      food_name,
      quantity,
      protein,
      carbs,
      fat,
      calories,
      logged_date: targetDate
    });
  } catch (error) {
    console.error('Erro ao salvar alimento no diário:', error);
    res.status(500).json({ error: 'Erro ao registrar consumo de alimento.' });
  }
});

// @route   PUT /api/tracker/diet/:id
// @desc    Atualizar a quantidade, os macros e opcionalmente o nome de um item do diário
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { quantity, protein, carbs, fat, calories, food_name } = req.body;

  if (quantity === undefined || quantity <= 0) {
    return res.status(400).json({ error: 'Quantidade inválida.' });
  }

  try {
    const pool = getPool();
    
    // Validar se o registro pertence ao usuário
    const [existing] = await pool.query(
      'SELECT id FROM diet_logs WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Registro não encontrado ou acesso negado.' });
    }

    if (food_name) {
      await pool.query(
        `UPDATE diet_logs 
         SET food_name = ?, quantity = ?, protein = ?, carbs = ?, fat = ?, calories = ? 
         WHERE id = ? AND user_id = ?`,
        [
          food_name,
          Number(quantity), 
          Number(protein || 0), 
          Number(carbs || 0), 
          Number(fat || 0), 
          Math.round(calories || 0), 
          id, 
          req.userId
        ]
      );
    } else {
      await pool.query(
        `UPDATE diet_logs 
         SET quantity = ?, protein = ?, carbs = ?, fat = ?, calories = ? 
         WHERE id = ? AND user_id = ?`,
        [
          Number(quantity), 
          Number(protein || 0), 
          Number(carbs || 0), 
          Number(fat || 0), 
          Math.round(calories || 0), 
          id, 
          req.userId
        ]
      );
    }

    res.json({ message: 'Alimento do diário atualizado.' });
  } catch (error) {
    console.error('Erro ao atualizar item do diário:', error);
    res.status(500).json({ error: 'Erro ao atualizar alimento no diário.' });
  }
});

// @route   DELETE /api/tracker/diet/:id
// @desc    Remover um alimento consumido do diário
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const pool = getPool();
    const [result] = await pool.query(
      'DELETE FROM diet_logs WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Registro não encontrado ou acesso negado.' });
    }

    res.json({ message: 'Alimento removido do diário com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar item do diário:', error);
    res.status(500).json({ error: 'Erro ao remover alimento do diário.' });
  }
});

// @route   POST /api/tracker/diet/copy-plan
// @desc    Copiar todo o plano de refeições padrão (planejado) para o diário de consumo real em uma data
router.post('/copy-plan', authMiddleware, async (req, res) => {
  const { date } = req.body;
  const targetDate = date || getTodayString();

  try {
    const pool = getPool();

    // 1. Apagar registros existentes daquela data para evitar duplicações caso ele queira recarregar
    await pool.query(
      'DELETE FROM diet_logs WHERE user_id = ? AND logged_date = ?',
      [req.userId, targetDate]
    );

    // 2. Buscar todas as refeições planejadas (diet_meals) do usuário
    const [meals] = await pool.query(
      'SELECT id, name FROM diet_meals WHERE user_id = ? ORDER BY id ASC',
      [req.userId]
    );

    if (meals.length === 0) {
      return res.status(400).json({ error: 'Nenhum plano alimentar cadastrado para copiar.' });
    }

    let itemsCopiedCount = 0;

    // 3. Para cada refeição, buscar os itens e inserir no log
    for (const meal of meals) {
      const [items] = await pool.query(
        'SELECT name, quantity, protein, carbs, fat, calories FROM diet_meal_items WHERE diet_meal_id = ? ORDER BY id ASC',
        [meal.id]
      );

      for (const item of items) {
        const qty = Number(item.quantity) || 100;
        const factor = qty / 100;

        await pool.query(
          `INSERT INTO diet_logs (user_id, meal_name, food_name, quantity, protein, carbs, fat, calories, logged_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [
            req.userId,
            meal.name,
            item.name,
            qty,
            Number((Number(item.protein) * factor).toFixed(1)),
            Number((Number(item.carbs) * factor).toFixed(1)),
            Number((Number(item.fat) * factor).toFixed(1)),
            Math.round(Number(item.calories) * factor),
            targetDate
          ]
        );
        itemsCopiedCount++;
      }
    }

    res.json({ 
      message: 'Plano de refeições copiado com sucesso para o diário alimentar.',
      items_copied: itemsCopiedCount,
      date: targetDate
    });
  } catch (error) {
    console.error('Erro ao copiar plano alimentar para o diário:', error);
    res.status(500).json({ error: 'Erro ao importar plano de refeições.' });
  }
});

// @route   GET /api/tracker/diet/compare
// @desc    Obter comparação de consumo calórico e macros entre a data ativa e a data anterior (Ontem)
router.get('/compare', authMiddleware, async (req, res) => {
  const date = req.query.date || getTodayString();
  const yesterday = getYesterdayString(date);

  try {
    const pool = getPool();

    // Query para consolidar metas diárias
    const sumQuery = `
      SELECT 
        SUM(calories) as calories, 
        SUM(protein) as protein, 
        SUM(carbs) as carbs, 
        SUM(fat) as fat 
      FROM diet_logs 
      WHERE user_id = ? AND logged_date = ?
    `;

    const [todayRows] = await pool.query(sumQuery, [req.userId, date]);
    const [yesterdayRows] = await pool.query(sumQuery, [req.userId, yesterday]);

    const formatResult = (row) => ({
      calories: Math.round(row.calories || 0),
      protein: Math.round(row.protein || 0),
      carbs: Math.round(row.carbs || 0),
      fat: Math.round(row.fat || 0)
    });

    res.json({
      today: formatResult(todayRows[0]),
      yesterday: formatResult(yesterdayRows[0]),
      dates: {
        today: date,
        yesterday: yesterday
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comparativo nutricional:', error);
    res.status(500).json({ error: 'Erro ao calcular comparação de nutrição.' });
  }
});

export default router;
