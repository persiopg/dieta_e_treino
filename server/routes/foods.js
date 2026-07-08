import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/foods
// @desc    Buscar alimentos cadastrados no banco de dados por nome (Algoritmo de relevância multi-termo)
// @access  Private (com authMiddleware)
router.get('/', authMiddleware, async (req, res) => {
  const { q } = req.query;

  try {
    const pool = getPool();

    if (q && q.trim().length > 0) {
      // Quebrar em palavras e limpar pontuações — aceitar até palavras de 1 letra (ex: "ovo" tem 3, mas "pão" tem 3)
      // Filtramos apenas strings vazias após limpeza
      const terms = q.trim().split(/\s+/)
        .map(t => t.toLowerCase().replace(/[,.;()]/g, ''))
        .filter(t => t.length >= 1);

      if (terms.length > 0) {
        // Cláusulas OR para o WHERE — busca accent-insensitive (utf8mb4_unicode_ci)
        const whereClauses = terms.map(() => 'name LIKE ? COLLATE utf8mb4_unicode_ci');
        
        // Cláusulas CASE WHEN para o score de relevância
        const scoreClauses = [];
        const finalParams = [];

        // Cada termo que coincidir soma +3 no score
        terms.forEach(t => {
          scoreClauses.push('(CASE WHEN name LIKE ? COLLATE utf8mb4_unicode_ci THEN 3 ELSE 0 END)');
          finalParams.push(`%${t}%`);
        });

        // Se começar com o primeiro termo, ganha +5 no score
        scoreClauses.push('(CASE WHEN name LIKE ? COLLATE utf8mb4_unicode_ci THEN 5 ELSE 0 END)');
        finalParams.push(`${terms[0]}%`);

        // Parâmetros do WHERE
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

        const [rows] = await pool.query(fullQuery, finalParams);

        const mappedRows = rows.map(food => ({
          id: food.id.toString(),
          name: food.name,
          calories: Number(food.calories),
          protein: Number(food.protein),
          carbs: Number(food.carbs),
          fat: Number(food.fat),
          servingSize: food.serving_size,
          category: food.category
        }));

        return res.json(mappedRows);
      }
    }

    // Listagem padrão ordenada se sem termos válidos
    const [rows] = await pool.query(
      'SELECT id, name, calories, protein, carbs, fat, serving_size, category FROM foods ORDER BY name ASC LIMIT 30'
    );

    const mappedRows = rows.map(food => ({
      id: food.id.toString(),
      name: food.name,
      calories: Number(food.calories),
      protein: Number(food.protein),
      carbs: Number(food.carbs),
      fat: Number(food.fat),
      servingSize: food.serving_size,
      category: food.category
    }));

    res.json(mappedRows);
  } catch (error) {
    console.error('Erro ao buscar alimentos do banco:', error);
    res.status(500).json({ error: 'Erro ao consultar catálogo de alimentos.' });
  }
});

export default router;
