import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';
import { initialDietPresets } from '../../src/data/foodDatabase.js';

const router = express.Router();

// Helper para obter o nome e descrição da dieta dinamicamente
async function getDietMeta(pool, userId) {
  const [users] = await pool.query('SELECT goal FROM users WHERE id = ?', [userId]);
  const goal = users.length > 0 ? users[0].goal : 'personalizada';

  let name = 'Dieta Personalizada';
  let description = 'Plano alimentar customizado montado por você.';

  if (goal === 'emagrecimento') {
    name = 'Dieta de Definição / Emagrecimento (Déficit Calórico)';
    description = 'Focada em alta ingestão de proteínas para preservar massa magra e carboidratos moderados/baixos.';
  } else if (goal === 'manutencao') {
    name = 'Dieta de Equilíbrio / Manutenção';
    description = 'Calorias equilibradas para manter o peso atual e otimizar a performance física.';
  } else if (goal === 'hipertrofia') {
    name = 'Dieta de Ganho / Hipertrofia (Superávit Calórico)';
    description = 'Focada em fornecer nutrientes e energia de sobra para maximizar o ganho de massa muscular.';
  }

  return { name, description };
}

// @route   GET /api/diet
// @desc    Obter a dieta do usuário (refeições e alimentos)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { name, description } = await getDietMeta(pool, req.userId);

    // Buscar as refeições do usuário
    const [meals] = await pool.query(
      'SELECT id, name FROM diet_meals WHERE user_id = ? ORDER BY id ASC',
      [req.userId]
    );

    // Para cada refeição, buscar os alimentos associados
    const mealsWithItems = [];
    for (const meal of meals) {
      const [items] = await pool.query(
        'SELECT id, name, quantity, protein, carbs, fat, calories FROM diet_meal_items WHERE diet_meal_id = ? ORDER BY id ASC',
        [meal.id]
      );
      
      // Converter campos de decimais para números reais
      const mappedItems = items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        protein: Number(item.protein),
        carbs: Number(item.carbs),
        fat: Number(item.fat),
        calories: Number(item.calories)
      }));

      mealsWithItems.push({
        id: meal.id,
        name: meal.name,
        items: mappedItems
      });
    }

    res.json({
      name,
      description,
      meals: mealsWithItems
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar plano de dieta.' });
  }
});

// @route   POST /api/diet/preset
// @desc    Aplicar um preset de dieta completo
router.post('/preset', authMiddleware, async (req, res) => {
  const { presetKey } = req.body; // 'emagrecimento', 'manutencao', 'hipertrofia'

  const preset = initialDietPresets[presetKey];
  if (!preset) {
    return res.status(400).json({ error: 'Preset de dieta inválido.' });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Limpar dieta antiga do usuário (tabelas em cascata)
    await conn.query('DELETE FROM diet_meals WHERE user_id = ?', [req.userId]);

    // 2. Inserir as novas refeições e alimentos
    for (const meal of preset.meals) {
      const [mealResult] = await conn.query(
        'INSERT INTO diet_meals (user_id, name) VALUES (?, ?)',
        [req.userId, meal.name]
      );
      
      const mealId = mealResult.insertId;

      if (meal.items && meal.items.length > 0) {
        for (const item of meal.items) {
          await conn.query(
            `INSERT INTO diet_meal_items (diet_meal_id, name, quantity, protein, carbs, fat, calories) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              mealId,
              item.name,
              item.quantity,
              item.protein,
              item.carbs,
              item.fat,
              item.calories
            ]
          );
        }
      }
    }

    await conn.commit();
    conn.release();

    // Buscar a nova dieta inserida para responder
    res.redirect(303, '/api/diet');
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error(error);
    res.status(500).json({ error: 'Erro ao aplicar preset de dieta.' });
  }
});

// @route   POST /api/diet/meal
// @desc    Adicionar uma nova refeição
router.post('/meal', authMiddleware, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome da refeição é obrigatório.' });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO diet_meals (user_id, name) VALUES (?, ?)',
      [req.userId, name]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      items: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar nova refeição.' });
  }
});

// @route   DELETE /api/diet/meal/:id
// @desc    Excluir uma refeição inteira
router.delete('/meal/:id', authMiddleware, async (req, res) => {
  const mealId = req.params.id;

  try {
    const pool = getPool();
    
    // Garantir que a refeição pertença ao usuário logado
    const [check] = await pool.query('SELECT id FROM diet_meals WHERE id = ? AND user_id = ?', [mealId, req.userId]);
    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou refeição não encontrada.' });
    }

    await pool.query('DELETE FROM diet_meals WHERE id = ?', [mealId]);
    res.json({ message: 'Refeição excluída com sucesso.', id: Number(mealId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir refeição.' });
  }
});

// @route   POST /api/diet/meal/:id/item
// @desc    Adicionar um alimento na refeição
router.post('/meal/:id/item', authMiddleware, async (req, res) => {
  const mealId = req.params.id;
  const { name, quantity, protein, carbs, fat, calories } = req.body;

  if (!name || quantity === undefined) {
    return res.status(400).json({ error: 'Nome e quantidade são obrigatórios.' });
  }

  try {
    const pool = getPool();
    
    // Garantir que a refeição pertença ao usuário logado
    const [check] = await pool.query('SELECT id FROM diet_meals WHERE id = ? AND user_id = ?', [mealId, req.userId]);
    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou refeição não encontrada.' });
    }

    const [result] = await pool.query(
      `INSERT INTO diet_meal_items (diet_meal_id, name, quantity, protein, carbs, fat, calories) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        mealId,
        name,
        quantity,
        protein || 0,
        carbs || 0,
        fat || 0,
        calories || 0
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      quantity: Number(quantity),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      calories: Number(calories || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao adicionar alimento.' });
  }
});

// @route   PUT /api/diet/meal/:mealId/item/:itemId
// @desc    Atualizar a quantidade de um alimento
router.put('/meal/:mealId/item/:itemId', authMiddleware, async (req, res) => {
  const { mealId, itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({ error: 'Quantidade inválida.' });
  }

  try {
    const pool = getPool();
    
    // Verificar se a refeição e o item pertencem ao usuário logado
    const [check] = await pool.query(
      `SELECT i.id FROM diet_meal_items i 
       JOIN diet_meals m ON i.diet_meal_id = m.id 
       WHERE i.id = ? AND m.id = ? AND m.user_id = ?`,
      [itemId, mealId, req.userId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou alimento não encontrado.' });
    }

    await pool.query('UPDATE diet_meal_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    res.json({ message: 'Quantidade de alimento atualizada.', itemId: Number(itemId), quantity: Number(quantity) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar alimento.' });
  }
});

// @route   DELETE /api/diet/meal/:mealId/item/:itemId
// @desc    Remover um alimento da refeição
router.delete('/meal/:mealId/item/:itemId', authMiddleware, async (req, res) => {
  const { mealId, itemId } = req.params;

  try {
    const pool = getPool();
    
    // Verificar se a refeição e o item pertencem ao usuário logado
    const [check] = await pool.query(
      `SELECT i.id FROM diet_meal_items i 
       JOIN diet_meals m ON i.diet_meal_id = m.id 
       WHERE i.id = ? AND m.id = ? AND m.user_id = ?`,
      [itemId, mealId, req.userId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou alimento não encontrado.' });
    }

    await pool.query('DELETE FROM diet_meal_items WHERE id = ?', [itemId]);
    res.json({ message: 'Alimento excluído com sucesso.', itemId: Number(itemId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir alimento.' });
  }
});

export default router;
