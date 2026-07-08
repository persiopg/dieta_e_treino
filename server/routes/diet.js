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
// @desc    Gerar um plano de dieta dinâmico baseado nos cálculos e metas de macros do usuário (TACO)
router.post('/preset', authMiddleware, async (req, res) => {
  const { presetKey } = req.body; // 'emagrecimento', 'manutencao', 'hipertrofia'

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obter os dados do usuário para os cálculos
    const [userRows] = await conn.query(
      `SELECT gender, age, weight, height, activity_level, target_calories, 
              protein_target, carbs_target, fat_target, goal 
       FROM users WHERE id = ?`,
      [req.userId]
    );

    if (userRows.length === 0) {
      throw new Error('Usuário não encontrado.');
    }

    const user = userRows[0];
    const weight = Number(user.weight || 80);
    const height = Number(user.height || 170);
    const age = Number(user.age || 30);
    const gender = user.gender || 'masculino';
    const activityLevel = user.activity_level || 'moderado';
    const goal = presetKey || user.goal || 'emagrecimento';

    // 2. Calcular ou obter targetCalories e macros
    let targetCalories = Number(user.target_calories);
    let proteinTarget = Number(user.protein_target);
    let carbsTarget = Number(user.carbs_target);
    let fatTarget = Number(user.fat_target);

    if (!targetCalories || targetCalories <= 0) {
      // Calcular TMB (Harris-Benedict)
      let bmr = 0;
      if (gender === 'masculino') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }

      // Calcular GETD (TDEE)
      let activityFactor = 1.2;
      if (activityLevel === 'leve') activityFactor = 1.375;
      else if (activityLevel === 'moderado') activityFactor = 1.55;
      else if (activityLevel === 'alto') activityFactor = 1.725;
      else if (activityLevel === 'extremo') activityFactor = 1.9;

      const tdee = bmr * activityFactor;

      // Calcular Calorias Meta
      if (goal === 'emagrecimento') {
        targetCalories = Math.round(tdee - 500);
        if (targetCalories < bmr * 0.9) targetCalories = Math.round(bmr * 0.9);
      } else if (goal === 'hipertrofia') {
        targetCalories = Math.round(tdee + 300);
      } else {
        targetCalories = Math.round(tdee);
      }

      // Calcular Macros Meta
      proteinTarget = Math.round(weight * 2.0); // 2g/kg
      fatTarget = Math.round(weight * 1.0);     // 1g/kg
      const remainingCalories = targetCalories - (proteinTarget * 4 + fatTarget * 9);
      carbsTarget = Math.round(Math.max(20, remainingCalories / 4));

      // Atualizar o perfil do usuário com os valores calculados
      await conn.query(
        `UPDATE users SET target_calories = ?, protein_target = ?, carbs_target = ?, fat_target = ?, goal = ? WHERE id = ?`,
        [targetCalories, proteinTarget, carbsTarget, fatTarget, goal, req.userId]
      );
    }

    // 3. Puxar as composições nutricionais dos alimentos selecionados da base TACO no banco
    const foodNames = [
      'Ovo, de galinha, inteiro, cozido/10minutos',
      'Pão, trigo, forma, integral',
      'Frango, peito, sem pele, grelhado',
      'Carne, bovina, patinho, sem gordura, grelhado',
      'Arroz, integral, cozido',
      'Feijão, carioca, cozido',
      'Azeite, de oliva, extra virgem',
      'Iogurte, natural, desnatado',
      'Banana, prata, crua',
      'Castanha-de-caju, torrada, salgada',
      'Merluza, filé, assado',
      'Batata, doce, cozida'
    ];

    const [foodRows] = await conn.query(
      'SELECT name, calories, protein, carbs, fat FROM foods WHERE name IN (?)',
      [foodNames]
    );

    const foodsMap = {};
    foodRows.forEach(f => {
      foodsMap[f.name] = {
        calories: Number(f.calories),
        protein: Number(f.protein),
        carbs: Number(f.carbs),
        fat: Number(f.fat)
      };
    });

    const getFoodData = (name, fallback) => {
      return foodsMap[name] || fallback;
    };

    const ovoData = getFoodData('Ovo, de galinha, inteiro, cozido/10minutos', { calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5 });
    const paoData = getFoodData('Pão, trigo, forma, integral', { calories: 253, protein: 9.4, carbs: 49.9, fat: 3.7 });
    const frangoData = getFoodData('Frango, peito, sem pele, grelhado', { calories: 159, protein: 32.0, carbs: 0, fat: 2.5 });
    const patinhoData = getFoodData('Carne, bovina, patinho, sem gordura, grelhado', { calories: 219, protein: 35.9, carbs: 0, fat: 7.3 });
    const arrozData = getFoodData('Arroz, integral, cozido', { calories: 124, protein: 2.6, carbs: 25.8, fat: 1.0 });
    const feijaoData = getFoodData('Feijão, carioca, cozido', { calories: 76, protein: 4.8, carbs: 13.6, fat: 0.5 });
    const azeiteData = getFoodData('Azeite, de oliva, extra virgem', { calories: 884, protein: 0, carbs: 0, fat: 100 });
    const iogurteData = getFoodData('Iogurte, natural, desnatado', { calories: 41, protein: 3.8, carbs: 6.2, fat: 0.1 });
    const bananaData = getFoodData('Banana, prata, crua', { calories: 98, protein: 1.3, carbs: 26.0, fat: 0.1 });
    const castanhaData = getFoodData('Castanha-de-caju, torrada, salgada', { calories: 580, protein: 15.3, carbs: 32.5, fat: 46.3 });
    const peixeData = getFoodData('Merluza, filé, assado', { calories: 122, protein: 26.6, carbs: 0, fat: 1.2 });
    const batataData = getFoodData('Batata, doce, cozida', { calories: 77, protein: 0.6, carbs: 18.4, fat: 0.1 });
    const wheyData = { calories: 360, protein: 75.0, carbs: 10.0, fat: 2.0 };

    // 4. Executar os Cálculos Heurísticos de Porções baseados nos macros alvo diários
    // Distribuição dos macros alvos nas 4 refeições:
    // Café da Manhã: 20% | Almoço: 35% | Lanche da Tarde: 15% | Jantar: 30%
    const mealP = {
      cafe: { prot: proteinTarget * 0.20, carbs: carbsTarget * 0.20, fat: fatTarget * 0.20 },
      almoco: { prot: proteinTarget * 0.35, carbs: carbsTarget * 0.35, fat: fatTarget * 0.35 },
      lanche: { prot: proteinTarget * 0.15, carbs: carbsTarget * 0.15, fat: fatTarget * 0.15 },
      jantar: { prot: proteinTarget * 0.30, carbs: carbsTarget * 0.30, fat: fatTarget * 0.30 }
    };

    const mealsResult = [];

    // --- Café da Manhã (20%) ---
    const cafeOvoQty = Math.round(Math.max(50, (mealP.cafe.prot / ovoData.protein) * 100));
    const cafePaoQty = Math.round(Math.max(25, (mealP.cafe.carbs / paoData.carbs) * 100));

    mealsResult.push({
      name: 'Café da Manhã',
      items: [
        {
          name: 'Ovo, de galinha, inteiro, cozido/10minutos',
          quantity: cafeOvoQty,
          protein: Number(((ovoData.protein * cafeOvoQty) / 100).toFixed(1)),
          carbs: Number(((ovoData.carbs * cafeOvoQty) / 100).toFixed(1)),
          fat: Number(((ovoData.fat * cafeOvoQty) / 100).toFixed(1)),
          calories: Math.round((ovoData.calories * cafeOvoQty) / 100)
        },
        {
          name: 'Pão, trigo, forma, integral',
          quantity: cafePaoQty,
          protein: Number(((paoData.protein * cafePaoQty) / 100).toFixed(1)),
          carbs: Number(((paoData.carbs * cafePaoQty) / 100).toFixed(1)),
          fat: Number(((paoData.fat * cafePaoQty) / 100).toFixed(1)),
          calories: Math.round((paoData.calories * cafePaoQty) / 100)
        }
      ]
    });

    // --- Almoço (35%) ---
    const feijaoQty = 80;
    const feijaoP = (feijaoData.protein * feijaoQty) / 100;
    const feijaoC = (feijaoData.carbs * feijaoQty) / 100;
    const feijaoF = (feijaoData.fat * feijaoQty) / 100;

    const almocoProtData = goal === 'emagrecimento' ? frangoData : patinhoData;
    const almocoProtName = goal === 'emagrecimento' ? 'Frango, peito, sem pele, grelhado' : 'Carne, bovina, patinho, sem gordura, grelhado';
    
    const remainingAlmocoProt = Math.max(10, mealP.almoco.prot - feijaoP);
    const almocoProtQty = Math.round((remainingAlmocoProt / almocoProtData.protein) * 100);

    const remainingAlmocoCarbs = Math.max(10, mealP.almoco.carbs - feijaoC);
    const almocoArrozQty = Math.round((remainingAlmocoCarbs / arrozData.carbs) * 100);

    const currentAlmocoFat = feijaoF + ((almocoProtData.fat * almocoProtQty) / 100) + ((arrozData.fat * almocoArrozQty) / 100);
    const remainingAlmocoFat = Math.max(0, mealP.almoco.fat - currentAlmocoFat);
    const almocoAzeiteQty = Math.round((remainingAlmocoFat / azeiteData.fat) * 100);

    const almocoItems = [
      {
        name: almocoProtName,
        quantity: almocoProtQty,
        protein: Number(((almocoProtData.protein * almocoProtQty) / 100).toFixed(1)),
        carbs: Number(((almocoProtData.carbs * almocoProtQty) / 100).toFixed(1)),
        fat: Number(((almocoProtData.fat * almocoProtQty) / 100).toFixed(1)),
        calories: Math.round((almocoProtData.calories * almocoProtQty) / 100)
      },
      {
        name: 'Arroz, integral, cozido',
        quantity: almocoArrozQty,
        protein: Number(((arrozData.protein * almocoArrozQty) / 100).toFixed(1)),
        carbs: Number(((arrozData.carbs * almocoArrozQty) / 100).toFixed(1)),
        fat: Number(((arrozData.fat * arrozData.fat) / 100).toFixed(1)),
        calories: Math.round((arrozData.calories * almocoArrozQty) / 100)
      },
      {
        name: 'Feijão, carioca, cozido',
        quantity: feijaoQty,
        protein: Number(feijaoP.toFixed(1)),
        carbs: Number(feijaoC.toFixed(1)),
        fat: Number(feijaoF.toFixed(1)),
        calories: Math.round((feijaoData.calories * feijaoQty) / 100)
      }
    ];

    if (almocoAzeiteQty >= 2) {
      almocoItems.push({
        name: 'Azeite, de oliva, extra virgem',
        quantity: almocoAzeiteQty,
        protein: 0,
        carbs: 0,
        fat: almocoAzeiteQty,
        calories: Math.round((azeiteData.calories * almocoAzeiteQty) / 100)
      });
    }

    mealsResult.push({
      name: 'Almoço',
      items: almocoItems
    });

    // --- Lanche da Tarde (15%) ---
    const iogurteQty = 150;
    const iogurteP = (iogurteData.protein * iogurteQty) / 100;
    const iogurteC = (iogurteData.carbs * iogurteQty) / 100;

    const lancheItems = [
      {
        name: 'Iogurte, natural, desnatado',
        quantity: iogurteQty,
        protein: Number(iogurteP.toFixed(1)),
        carbs: Number(iogurteC.toFixed(1)),
        fat: 0.1,
        calories: Math.round((iogurteData.calories * iogurteQty) / 100)
      }
    ];

    let currentLancheProt = iogurteP;
    if (mealP.lanche.prot > 15) {
      const remainingLancheProt = mealP.lanche.prot - iogurteP;
      const wheyQty = Math.round((remainingLancheProt / wheyData.protein) * 100);
      currentLancheProt += (wheyData.protein * wheyQty) / 100;
      lancheItems.push({
        name: 'Whey Protein',
        quantity: wheyQty,
        protein: Number(((wheyData.protein * wheyQty) / 100).toFixed(1)),
        carbs: Number(((wheyData.carbs * wheyQty) / 100).toFixed(1)),
        fat: Number(((wheyData.fat * wheyQty) / 100).toFixed(1)),
        calories: Math.round((wheyData.calories * wheyQty) / 100)
      });
    }

    const currentLancheCarbs = lancheItems.reduce((acc, curr) => acc + curr.carbs, 0);
    const remainingLancheCarbs = Math.max(10, mealP.lanche.carbs - currentLancheCarbs);
    const lancheBananaQty = Math.round((remainingLancheCarbs / bananaData.carbs) * 100);

    lancheItems.push({
      name: 'Banana, prata, crua',
      quantity: lancheBananaQty,
      protein: Number(((bananaData.protein * lancheBananaQty) / 100).toFixed(1)),
      carbs: Number(((bananaData.carbs * lancheBananaQty) / 100).toFixed(1)),
      fat: Number(((bananaData.fat * lancheBananaQty) / 100).toFixed(1)),
      calories: Math.round((bananaData.calories * lancheBananaQty) / 100)
    });

    const currentLancheFat = lancheItems.reduce((acc, curr) => acc + curr.fat, 0);
    const remainingLancheFat = Math.max(0, mealP.lanche.fat - currentLancheFat);
    const lancheCastanhaQty = Math.round((remainingLancheFat / castanhaData.fat) * 100);

    if (lancheCastanhaQty >= 5) {
      lancheItems.push({
        name: 'Castanha-de-caju, torrada, salgada',
        quantity: lancheCastanhaQty,
        protein: Number(((castanhaData.protein * lancheCastanhaQty) / 100).toFixed(1)),
        carbs: Number(((castanhaData.carbs * lancheCastanhaQty) / 100).toFixed(1)),
        fat: Number(((castanhaData.fat * lancheCastanhaQty) / 100).toFixed(1)),
        calories: Math.round((castanhaData.calories * lancheCastanhaQty) / 100)
      });
    }

    mealsResult.push({
      name: 'Lanche da Tarde',
      items: lancheItems
    });

    // --- Jantar (30%) ---
    const jantarPeixeQty = Math.round((mealP.jantar.prot / peixeData.protein) * 100);
    const jantarBatataQty = Math.round((mealP.jantar.carbs / batataData.carbs) * 100);

    const currentJantarFat = ((peixeData.fat * jantarPeixeQty) / 100) + ((batataData.fat * jantarBatataQty) / 100);
    const remainingJantarFat = Math.max(0, mealP.jantar.fat - currentJantarFat);
    const jantarAzeiteQty = Math.round((remainingJantarFat / azeiteData.fat) * 100);

    const jantarItems = [
      {
        name: 'Merluza, filé, assado',
        quantity: jantarPeixeQty,
        protein: Number(((peixeData.protein * jantarPeixeQty) / 100).toFixed(1)),
        carbs: Number(((peixeData.carbs * jantarPeixeQty) / 100).toFixed(1)),
        fat: Number(((peixeData.fat * jantarPeixeQty) / 100).toFixed(1)),
        calories: Math.round((peixeData.calories * jantarPeixeQty) / 100)
      },
      {
        name: 'Batata, doce, cozida',
        quantity: jantarBatataQty,
        protein: Number(((batataData.protein * jantarBatataQty) / 100).toFixed(1)),
        carbs: Number(((batataData.carbs * jantarBatataQty) / 100).toFixed(1)),
        fat: Number(((batataData.fat * batataData.fat) / 100).toFixed(1)),
        calories: Math.round((batataData.calories * jantarBatataQty) / 100)
      }
    ];

    if (jantarAzeiteQty >= 2) {
      jantarItems.push({
        name: 'Azeite, de oliva, extra virgem',
        quantity: jantarAzeiteQty,
        protein: 0,
        carbs: 0,
        fat: jantarAzeiteQty,
        calories: Math.round((azeiteData.calories * jantarAzeiteQty) / 100)
      });
    }

    mealsResult.push({
      name: 'Jantar',
      items: jantarItems
    });

    // 5. Deletar dieta antiga e persistir as novas refeições
    await conn.query('DELETE FROM diet_meals WHERE user_id = ?', [req.userId]);

    for (const meal of mealsResult) {
      const [mealResult] = await conn.query(
        'INSERT INTO diet_meals (user_id, name) VALUES (?, ?)',
        [req.userId, meal.name]
      );
      
      const mealId = mealResult.insertId;

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

    await conn.commit();
    conn.release();

    res.redirect(303, '/api/diet');
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Erro ao gerar preset dinâmico no backend:', error);
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
  const { name, quantity, protein, carbs, fat, calories } = req.body;

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

    if (name) {
      // Se enviou name, é uma substituição completa (troca do alimento no plano recomendado)
      await pool.query(
        `UPDATE diet_meal_items 
         SET name = ?, quantity = ?, protein = ?, carbs = ?, fat = ?, calories = ? 
         WHERE id = ?`,
        [name, quantity, protein || 0, carbs || 0, fat || 0, calories || 0, itemId]
      );
    } else {
      // Apenas atualização de quantidade
      await pool.query('UPDATE diet_meal_items SET quantity = ? WHERE id = ?', [quantity, itemId]);
    }

    res.json({ 
      message: 'Alimento atualizado.', 
      itemId: Number(itemId), 
      name, 
      quantity: Number(quantity),
      protein: Number(protein || 0),
      carbs: Number(carbs || 0),
      fat: Number(fat || 0),
      calories: Number(calories || 0)
    });
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
