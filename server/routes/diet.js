import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';
import { initialDietPresets } from '../../src/data/foodDatabase.js';
import { createRequire } from 'module';
import multer from 'multer';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Multer: upload em memória (sem salvar disco)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
  const { presetKey, useWhey: bodyUseWhey, mealsPerDay: bodyMealsPerDay } = req.body;

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obter os dados do usuário para os cálculos
    const [userRows] = await conn.query(
      `SELECT gender, age, weight, height, activity_level, target_calories, 
              protein_target, carbs_target, fat_target, goal, use_whey, meals_per_day 
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

    // Determinar preferências de whey e refeições
    const useWhey = bodyUseWhey !== undefined ? !!bodyUseWhey : (user.use_whey !== 0);
    const mealsPerDay = Number(bodyMealsPerDay !== undefined ? bodyMealsPerDay : (user.meals_per_day || 4));

    // Salvar preferências no perfil do usuário no banco
    await conn.query(
      'UPDATE users SET use_whey = ?, meals_per_day = ? WHERE id = ?',
      [useWhey ? 1 : 0, mealsPerDay, req.userId]
    );

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

    // 4. Executar os Cálculos de Porções Dinâmicas por Refeições e Whey
    let mealsDefs = [];
    if (mealsPerDay === 3) {
      mealsDefs = [
        { name: 'Café da Manhã', pctProt: 0.30, pctCarbs: 0.30, pctFat: 0.30 },
        { name: 'Almoço', pctProt: 0.40, pctCarbs: 0.40, pctFat: 0.40 },
        { name: 'Jantar', pctProt: 0.30, pctCarbs: 0.30, pctFat: 0.30 }
      ];
    } else if (mealsPerDay === 5) {
      mealsDefs = [
        { name: 'Café da Manhã', pctProt: 0.20, pctCarbs: 0.20, pctFat: 0.20 },
        { name: 'Almoço', pctProt: 0.30, pctCarbs: 0.30, pctFat: 0.30 },
        { name: 'Lanche da Tarde', pctProt: 0.15, pctCarbs: 0.15, pctFat: 0.15 },
        { name: 'Jantar', pctProt: 0.25, pctCarbs: 0.25, pctFat: 0.25 },
        { name: 'Ceia', pctProt: 0.10, pctCarbs: 0.10, pctFat: 0.10 }
      ];
    } else if (mealsPerDay === 6) {
      mealsDefs = [
        { name: 'Café da Manhã', pctProt: 0.15, pctCarbs: 0.15, pctFat: 0.15 },
        { name: 'Lanche da Manhã', pctProt: 0.10, pctCarbs: 0.10, pctFat: 0.10 },
        { name: 'Almoço', pctProt: 0.30, pctCarbs: 0.30, pctFat: 0.30 },
        { name: 'Lanche da Tarde', pctProt: 0.15, pctCarbs: 0.15, pctFat: 0.15 },
        { name: 'Jantar', pctProt: 0.20, pctCarbs: 0.20, pctFat: 0.20 },
        { name: 'Ceia', pctProt: 0.10, pctCarbs: 0.10, pctFat: 0.10 }
      ];
    } else {
      // 4 refeições (padrão)
      mealsDefs = [
        { name: 'Café da Manhã', pctProt: 0.20, pctCarbs: 0.20, pctFat: 0.20 },
        { name: 'Almoço', pctProt: 0.35, pctCarbs: 0.35, pctFat: 0.35 },
        { name: 'Lanche da Tarde', pctProt: 0.15, pctCarbs: 0.15, pctFat: 0.15 },
        { name: 'Jantar', pctProt: 0.30, pctCarbs: 0.30, pctFat: 0.30 }
      ];
    }

    const mealsResult = [];

    for (const def of mealsDefs) {
      const targetProt = proteinTarget * def.pctProt;
      const targetCarbs = carbsTarget * def.pctCarbs;
      const targetFat = fatTarget * def.pctFat;
      const items = [];

      if (def.name === 'Café da Manhã') {
        let cafeOvoQty = 100; // 2 ovos inteiros
        let cafeWheyQty = 0;

        if (!useWhey) {
          // Sem Whey, aumentamos ovo cozido até o máximo de 3 ovos (150g)
          cafeOvoQty = Math.min(150, Math.round((targetProt / ovoData.protein) * 100));
        } else {
          const eggProt = (ovoData.protein * cafeOvoQty) / 100;
          const remainingProt = targetProt - eggProt;
          if (remainingProt > 5) {
            cafeWheyQty = Math.round((remainingProt / wheyData.protein) * 100);
          } else if (remainingProt < 0) {
            cafeOvoQty = Math.max(50, Math.round((targetProt / ovoData.protein) * 100));
          }
        }

        let cafePaoQty = Math.round((targetCarbs / paoData.carbs) * 100);
        let cafeBananaQty = 0;

        if (cafePaoQty > 75) {
          const excessCarbs = targetCarbs - ((paoData.carbs * 75) / 100);
          cafePaoQty = 75;
          cafeBananaQty = Math.round((excessCarbs / bananaData.carbs) * 100);
        }

        if (cafeOvoQty > 0) {
          items.push({
            name: 'Ovo, de galinha, inteiro, cozido/10minutos',
            quantity: cafeOvoQty,
            protein: Number(((ovoData.protein * cafeOvoQty) / 100).toFixed(1)),
            carbs: Number(((ovoData.carbs * cafeOvoQty) / 100).toFixed(1)),
            fat: Number(((ovoData.fat * cafeOvoQty) / 100).toFixed(1)),
            calories: Math.round((ovoData.calories * cafeOvoQty) / 100)
          });
        }

        if (cafeWheyQty > 0) {
          items.push({
            name: 'Whey Protein',
            quantity: cafeWheyQty,
            protein: Number(((wheyData.protein * cafeWheyQty) / 100).toFixed(1)),
            carbs: Number(((wheyData.carbs * cafeWheyQty) / 100).toFixed(1)),
            fat: Number(((wheyData.fat * cafeWheyQty) / 100).toFixed(1)),
            calories: Math.round((wheyData.calories * cafeWheyQty) / 100)
          });
        }

        if (cafePaoQty > 0) {
          items.push({
            name: 'Pão, trigo, forma, integral',
            quantity: cafePaoQty,
            protein: Number(((paoData.protein * cafePaoQty) / 100).toFixed(1)),
            carbs: Number(((paoData.carbs * cafePaoQty) / 100).toFixed(1)),
            fat: Number(((paoData.fat * cafePaoQty) / 100).toFixed(1)),
            calories: Math.round((paoData.calories * cafePaoQty) / 100)
          });
        }

        if (cafeBananaQty >= 30) {
          items.push({
            name: 'Banana, prata, crua',
            quantity: cafeBananaQty,
            protein: Number(((bananaData.protein * cafeBananaQty) / 100).toFixed(1)),
            carbs: Number(((bananaData.carbs * cafeBananaQty) / 100).toFixed(1)),
            fat: Number(((bananaData.fat * cafeBananaQty) / 100).toFixed(1)),
            calories: Math.round((bananaData.calories * cafeBananaQty) / 100)
          });
        }
      } 
      else if (def.name === 'Lanche da Manhã') {
        const iogurteQty = 150;
        let lancheMProtQty = 0;
        
        if (useWhey) {
          const yogProt = (iogurteData.protein * iogurteQty) / 100;
          const remainingProt = targetProt - yogProt;
          if (remainingProt > 5) {
            lancheMProtQty = Math.round((remainingProt / wheyData.protein) * 100);
          }
        }

        const bananaQty = 100;
        const carbsFromYogAndBanana = ((iogurteData.carbs * iogurteQty) / 100) + bananaQty * 0.26;
        const remainingCarbs = Math.max(0, targetCarbs - carbsFromYogAndBanana);
        const paoQty = Math.round((remainingCarbs / paoData.carbs) * 100);

        items.push({
          name: 'Iogurte, natural, desnatado',
          quantity: iogurteQty,
          protein: Number(((iogurteData.protein * iogurteQty) / 100).toFixed(1)),
          carbs: Number(((iogurteData.carbs * iogurteQty) / 100).toFixed(1)),
          fat: Number(((iogurteData.fat * iogurteQty) / 100).toFixed(1)),
          calories: Math.round((iogurteData.calories * iogurteQty) / 100)
        });

        if (lancheMProtQty > 0) {
          items.push({
            name: 'Whey Protein',
            quantity: lancheMProtQty,
            protein: Number(((wheyData.protein * lancheMProtQty) / 100).toFixed(1)),
            carbs: Number(((wheyData.carbs * lancheMProtQty) / 100).toFixed(1)),
            fat: Number(((wheyData.fat * lancheMProtQty) / 100).toFixed(1)),
            calories: Math.round((wheyData.calories * lancheMProtQty) / 100)
          });
        } else if (!useWhey && targetProt > 10) {
          items.push({
            name: 'Ovo, de galinha, inteiro, cozido/10minutos',
            quantity: 50,
            protein: Number((ovoData.protein * 0.5).toFixed(1)),
            carbs: Number((ovoData.carbs * 0.5).toFixed(1)),
            fat: Number((ovoData.fat * 0.5).toFixed(1)),
            calories: Math.round(ovoData.calories * 0.5)
          });
        }

        items.push({
          name: 'Banana, prata, crua',
          quantity: bananaQty,
          protein: Number(((bananaData.protein * bananaQty) / 100).toFixed(1)),
          carbs: Number(((bananaData.carbs * bananaQty) / 100).toFixed(1)),
          fat: Number(((bananaData.fat * bananaQty) / 100).toFixed(1)),
          calories: Math.round((bananaData.calories * bananaQty) / 100)
        });

        if (paoQty >= 20) {
          items.push({
            name: 'Pão, trigo, forma, integral',
            quantity: paoQty,
            protein: Number(((paoData.protein * paoQty) / 100).toFixed(1)),
            carbs: Number(((paoData.carbs * paoQty) / 100).toFixed(1)),
            fat: Number(((paoData.fat * paoQty) / 100).toFixed(1)),
            calories: Math.round((paoData.calories * paoQty) / 100)
          });
        }
      }
      else if (def.name === 'Almoço') {
        const almocoProtData = (goal === 'emagrecimento') ? frangoData : patinhoData;
        const almocoProtName = (goal === 'emagrecimento') ? 'Frango, peito, sem pele, grelhado' : 'Carne, bovina, patinho, sem gordura, grelhado';

        const almocoProtQty = Math.round((targetProt / almocoProtData.protein) * 100);
        
        let almocoFeijaoQty = 80;
        const feijaoCarbs = (feijaoData.carbs * almocoFeijaoQty) / 100;
        let remainingAlmocoCarbs = targetCarbs - feijaoCarbs;
        let almocoArrozQty = Math.max(30, Math.round((remainingAlmocoCarbs / arrozData.carbs) * 100));

        items.push({
          name: almocoProtName,
          quantity: almocoProtQty,
          protein: Number(((almocoProtData.protein * almocoProtQty) / 100).toFixed(1)),
          carbs: Number(((almocoProtData.carbs * almocoProtQty) / 100).toFixed(1)),
          fat: Number(((almocoProtData.fat * almocoProtQty) / 100).toFixed(1)),
          calories: Math.round((almocoProtData.calories * almocoProtQty) / 100)
        });

        items.push({
          name: 'Arroz, integral, cozido',
          quantity: almocoArrozQty,
          protein: Number(((arrozData.protein * almocoArrozQty) / 100).toFixed(1)),
          carbs: Number(((arrozData.carbs * almocoArrozQty) / 100).toFixed(1)),
          fat: Number(((arrozData.fat * almocoArrozQty) / 100).toFixed(1)),
          calories: Math.round((arrozData.calories * almocoArrozQty) / 100)
        });

        items.push({
          name: 'Feijão, carioca, cozido',
          quantity: almocoFeijaoQty,
          protein: Number(((feijaoData.protein * almocoFeijaoQty) / 100).toFixed(1)),
          carbs: Number(((feijaoData.carbs * almocoFeijaoQty) / 100).toFixed(1)),
          fat: Number(((feijaoData.fat * almocoFeijaoQty) / 100).toFixed(1)),
          calories: Math.round((feijaoData.calories * almocoFeijaoQty) / 100)
        });

        const feijaoF = (feijaoData.fat * almocoFeijaoQty) / 100;
        const currentAlmocoFat = feijaoF + ((almocoProtData.fat * almocoProtQty) / 100) + ((arrozData.fat * almocoArrozQty) / 100);
        const remainingAlmocoFat = Math.max(0, targetFat - currentAlmocoFat);
        const almocoAzeiteQty = Math.round((remainingAlmocoFat / azeiteData.fat) * 100);

        if (almocoAzeiteQty >= 2) {
          items.push({
            name: 'Azeite, de oliva, extra virgem',
            quantity: almocoAzeiteQty,
            protein: 0,
            carbs: 0,
            fat: almocoAzeiteQty,
            calories: Math.round((azeiteData.calories * almocoAzeiteQty) / 100)
          });
        }
      }
      else if (def.name === 'Lanche da Tarde') {
        const iogurteQty = 150;
        let lancheWheyQty = 0;
        let lancheOvoQty = 0;

        const yogProt = (iogurteData.protein * iogurteQty) / 100;
        const remainingProt = targetProt - yogProt;

        if (useWhey) {
          if (remainingProt > 5) {
            lancheWheyQty = Math.round((remainingProt / wheyData.protein) * 100);
          }
        } else {
          if (remainingProt > 5) {
            lancheOvoQty = Math.min(100, Math.round((remainingProt / ovoData.protein) * 100));
          }
        }

        const bananaQty = 80;
        const carbsFromYogAndBanana = ((iogurteData.carbs * iogurteQty) / 100) + bananaQty * 0.26;
        const remainingCarbs = Math.max(0, targetCarbs - carbsFromYogAndBanana);

        items.push({
          name: 'Iogurte, natural, desnatado',
          quantity: iogurteQty,
          protein: Number(((iogurteData.protein * iogurteQty) / 100).toFixed(1)),
          carbs: Number(((iogurteData.carbs * iogurteQty) / 100).toFixed(1)),
          fat: Number(((iogurteData.fat * iogurteQty) / 100).toFixed(1)),
          calories: Math.round((iogurteData.calories * iogurteQty) / 100)
        });

        if (lancheWheyQty > 0) {
          items.push({
            name: 'Whey Protein',
            quantity: lancheWheyQty,
            protein: Number(((wheyData.protein * lancheWheyQty) / 100).toFixed(1)),
            carbs: Number(((wheyData.carbs * lancheWheyQty) / 100).toFixed(1)),
            fat: Number(((wheyData.fat * lancheWheyQty) / 100).toFixed(1)),
            calories: Math.round((wheyData.calories * lancheWheyQty) / 100)
          });
        } else if (lancheOvoQty > 0) {
          items.push({
            name: 'Ovo, de galinha, inteiro, cozido/10minutos',
            quantity: lancheOvoQty,
            protein: Number(((ovoData.protein * lancheOvoQty) / 100).toFixed(1)),
            carbs: Number(((ovoData.carbs * lancheOvoQty) / 100).toFixed(1)),
            fat: Number(((ovoData.fat * lancheOvoQty) / 100).toFixed(1)),
            calories: Math.round((ovoData.calories * lancheOvoQty) / 100)
          });
        }

        items.push({
          name: 'Banana, prata, crua',
          quantity: bananaQty,
          protein: Number(((bananaData.protein * bananaQty) / 100).toFixed(1)),
          carbs: Number(((bananaData.carbs * bananaQty) / 100).toFixed(1)),
          fat: Number(((bananaData.fat * bananaQty) / 100).toFixed(1)),
          calories: Math.round((bananaData.calories * bananaQty) / 100)
        });

        const currentLancheFat = items.reduce((acc, curr) => acc + curr.fat, 0);
        const remainingLancheFat = Math.max(0, targetFat - currentLancheFat);
        const lancheCastanhaQty = Math.round((remainingLancheFat / castanhaData.fat) * 100);

        if (lancheCastanhaQty >= 5) {
          items.push({
            name: 'Castanha-de-caju, torrada, salgada',
            quantity: lancheCastanhaQty,
            protein: Number(((castanhaData.protein * lancheCastanhaQty) / 100).toFixed(1)),
            carbs: Number(((castanhaData.carbs * lancheCastanhaQty) / 100).toFixed(1)),
            fat: Number(((castanhaData.fat * lancheCastanhaQty) / 100).toFixed(1)),
            calories: Math.round((castanhaData.calories * lancheCastanhaQty) / 100)
          });
        }
      }
      else if (def.name === 'Jantar') {
        const jantarPeixeQty = Math.round((targetProt / peixeData.protein) * 100);
        const jantarBatataQty = Math.round((targetCarbs / batataData.carbs) * 100);

        items.push({
          name: 'Merluza, filé, assado',
          quantity: jantarPeixeQty,
          protein: Number(((peixeData.protein * jantarPeixeQty) / 100).toFixed(1)),
          carbs: Number(((peixeData.carbs * jantarPeixeQty) / 100).toFixed(1)),
          fat: Number(((peixeData.fat * jantarPeixeQty) / 100).toFixed(1)),
          calories: Math.round((peixeData.calories * jantarPeixeQty) / 100)
        });

        if (jantarBatataQty > 0) {
          items.push({
            name: 'Batata, doce, cozida',
            quantity: jantarBatataQty,
            protein: Number(((batataData.protein * jantarBatataQty) / 100).toFixed(1)),
            carbs: Number(((batataData.carbs * jantarBatataQty) / 100).toFixed(1)),
            fat: Number(((batataData.fat * batataData.fat) / 100).toFixed(1)),
            calories: Math.round((batataData.calories * jantarBatataQty) / 100)
          });
        }

        const currentJantarFat = ((peixeData.fat * jantarPeixeQty) / 100) + ((batataData.fat * jantarBatataQty) / 100);
        const remainingJantarFat = Math.max(0, targetFat - currentJantarFat);
        const jantarAzeiteQty = Math.round((remainingJantarFat / azeiteData.fat) * 100);

        if (jantarAzeiteQty >= 2) {
          items.push({
            name: 'Azeite, de oliva, extra virgem',
            quantity: jantarAzeiteQty,
            protein: 0,
            carbs: 0,
            fat: jantarAzeiteQty,
            calories: Math.round((azeiteData.calories * jantarAzeiteQty) / 100)
          });
        }
      }
      else if (def.name === 'Ceia') {
        const iogurteQty = 150;
        items.push({
          name: 'Iogurte, natural, desnatado',
          quantity: iogurteQty,
          protein: Number(((iogurteData.protein * iogurteQty) / 100).toFixed(1)),
          carbs: Number(((iogurteData.carbs * iogurteQty) / 100).toFixed(1)),
          fat: Number(((iogurteData.fat * iogurteQty) / 100).toFixed(1)),
          calories: Math.round((iogurteData.calories * iogurteQty) / 100)
        });

        const currentCeiaFat = ((iogurteData.fat * iogurteQty) / 100);
        const remainingCeiaFat = Math.max(0, targetFat - currentCeiaFat);
        const ceiaCastanhaQty = Math.round((remainingCeiaFat / castanhaData.fat) * 100);

        if (ceiaCastanhaQty >= 5) {
          items.push({
            name: 'Castanha-de-caju, torrada, salgada',
            quantity: ceiaCastanhaQty,
            protein: Number(((castanhaData.protein * ceiaCastanhaQty) / 100).toFixed(1)),
            carbs: Number(((castanhaData.carbs * ceiaCastanhaQty) / 100).toFixed(1)),
            fat: Number(((castanhaData.fat * ceiaCastanhaQty) / 100).toFixed(1)),
            calories: Math.round((castanhaData.calories * ceiaCastanhaQty) / 100)
          });
        }
      }

      mealsResult.push({
        name: def.name,
        items
      });
    }

    // --- Lógica de Calibração Fina de Calorias (Fine-Tuning) ---
    // Objetivo: ajustar os carboidratos/gorduras de energia rápida (arroz, batata doce, azeite)
    // para alinhar o total do preset com o target_calories exato do usuário.
    let totalPlannedCalories = 0;
    mealsResult.forEach(m => {
      m.items.forEach(i => {
        totalPlannedCalories += Math.round((Number(i.calories) * Number(i.quantity)) / 100);
      });
    });

    let calorieDiff = totalPlannedCalories - targetCalories;

    if (Math.abs(calorieDiff) > 10) {
      let arrozItem = null;
      let batataItem = null;
      let azeiteAlmocoItem = null;
      let azeiteJantarItem = null;

      mealsResult.forEach(m => {
        if (m.name === 'Almoço') {
          arrozItem = m.items.find(i => i.name === 'Arroz, integral, cozido');
          azeiteAlmocoItem = m.items.find(i => i.name === 'Azeite, de oliva, extra virgem');
        }
        if (m.name === 'Jantar') {
          batataItem = m.items.find(i => i.name === 'Batata, doce, cozida');
          azeiteJantarItem = m.items.find(i => i.name === 'Azeite, de oliva, extra virgem');
        }
      });

      // 1. Ajustar pelos carboidratos (Arroz e Batata)
      // Cada grama de Arroz integral tem aprox 1.24 kcal.
      // Cada grama de Batata doce tem aprox 0.77 kcal.
      if (calorieDiff > 0) {
        // Reduzir carboidratos para cortar excesso calórico
        if (arrozItem && batataItem) {
          const arrozReductionCal = calorieDiff * 0.6;
          const batataReductionCal = calorieDiff * 0.4;

          const arrozQtyReduction = Math.round(arrozReductionCal / 1.24);
          const batataQtyReduction = Math.round(batataReductionCal / 0.77);

          arrozItem.quantity = Math.max(50, arrozItem.quantity - arrozQtyReduction);
          batataItem.quantity = Math.max(50, batataItem.quantity - batataQtyReduction);
        } else if (arrozItem) {
          const arrozQtyReduction = Math.round(calorieDiff / 1.24);
          arrozItem.quantity = Math.max(50, arrozItem.quantity - arrozQtyReduction);
        } else if (batataItem) {
          const batataQtyReduction = Math.round(calorieDiff / 0.77);
          batataItem.quantity = Math.max(50, batataItem.quantity - batataQtyReduction);
        }
      } else {
        // Aumentar carboidratos (se faltou calorias na heurística)
        if (arrozItem && batataItem) {
          const arrozIncreaseCal = Math.abs(calorieDiff) * 0.6;
          const batataIncreaseCal = Math.abs(calorieDiff) * 0.4;

          const arrozQtyIncrease = Math.round(arrozIncreaseCal / 1.24);
          const batataQtyIncrease = Math.round(batataIncreaseCal / 0.77);

          arrozItem.quantity += arrozQtyIncrease;
          batataItem.quantity += batataQtyIncrease;
        } else if (arrozItem) {
          const arrozQtyIncrease = Math.round(Math.abs(calorieDiff) / 1.24);
          arrozItem.quantity += arrozQtyIncrease;
        }
      }

      // Recalcular macros dos itens de carboidratos modificados
      if (arrozItem) {
        const q = arrozItem.quantity;
        arrozItem.protein = Number(((2.6 * q) / 100).toFixed(1));
        arrozItem.carbs = Number(((25.8 * q) / 100).toFixed(1));
        arrozItem.fat = Number(((1.0 * q) / 100).toFixed(1));
        arrozItem.calories = Math.round((124 * q) / 100);
      }
      if (batataItem) {
        const q = batataItem.quantity;
        batataItem.protein = Number(((0.6 * q) / 100).toFixed(1));
        batataItem.carbs = Number(((18.4 * q) / 100).toFixed(1));
        batataItem.fat = Number(((0.1 * q) / 100).toFixed(1));
        batataItem.calories = Math.round((77 * q) / 100);
      }

      // 2. Segunda checagem para calibrar azeite se houver diferença calórica residual
      let newTotalPlanned = 0;
      mealsResult.forEach(m => {
        m.items.forEach(i => {
          newTotalPlanned += Math.round((Number(i.calories) * Number(i.quantity)) / 100);
        });
      });
      calorieDiff = newTotalPlanned - targetCalories;

      if (Math.abs(calorieDiff) > 10) {
        if (calorieDiff > 0) {
          if (azeiteAlmocoItem) {
            const azeiteQtyReduction = Math.round(calorieDiff / 8.84);
            azeiteAlmocoItem.quantity = Math.max(5, azeiteAlmocoItem.quantity - azeiteQtyReduction);
          } else if (azeiteJantarItem) {
            const azeiteQtyReduction = Math.round(calorieDiff / 8.84);
            azeiteJantarItem.quantity = Math.max(5, azeiteJantarItem.quantity - azeiteQtyReduction);
          }
        } else {
          if (azeiteAlmocoItem) {
            const azeiteQtyIncrease = Math.round(Math.abs(calorieDiff) / 8.84);
            azeiteAlmocoItem.quantity += azeiteQtyIncrease;
          }
        }

        // Recalcular macros dos azeites modificados
        if (azeiteAlmocoItem) {
          const q = azeiteAlmocoItem.quantity;
          azeiteAlmocoItem.fat = q;
          azeiteAlmocoItem.calories = Math.round((884 * q) / 100);
        }
        if (azeiteJantarItem) {
          const q = azeiteJantarItem.quantity;
          azeiteJantarItem.fat = q;
          azeiteJantarItem.calories = Math.round((884 * q) / 100);
        }
      }
    }

    // 5. Deletar dieta antiga e persistir as novas refeições
    await conn.query('DELETE FROM diet_meals WHERE user_id = ?', [req.userId]);

    for (const meal of mealsResult) {
      const [mealResult] = await conn.query(
        'INSERT INTO diet_meals (user_id, name) VALUES (?, ?)',
        [req.userId, meal.name]
      );
      
      const mealId = mealResult.insertId;

      for (const item of meal.items) {
        const qty = Number(item.quantity) || 100;
        const factor = qty / 100;
        const protein100g = Number((Number(item.protein) / factor).toFixed(1));
        const carbs100g = Number((Number(item.carbs) / factor).toFixed(1));
        const fat100g = Number((Number(item.fat) / factor).toFixed(1));
        const calories100g = Math.round(Number(item.calories) / factor);

        await conn.query(
          `INSERT INTO diet_meal_items (diet_meal_id, name, quantity, protein, carbs, fat, calories) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            mealId,
            item.name,
            qty,
            protein100g,
            carbs100g,
            fat100g,
            calories100g
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


// ============================================================
// @route   POST /api/diet/import/preview
// @desc    Faz parse do Excel e retorna preview de macros SEM salvar
// @access  Private
// ============================================================
router.post('/import/preview', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Aceitar aba "Plano Recomendado" ou primeira aba
    const targetSheet = wb.SheetNames.find(n => n.toLowerCase().includes('plano')) || wb.SheetNames[0];
    if (!targetSheet) return res.status(400).json({ error: 'Arquivo Excel sem abas válidas.' });

    const ws = wb.Sheets[targetSheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Validar cabeçalho (linha 0)
    const header = (rows[0] || []).map(c => String(c).toLowerCase().trim());
    const hasRefeicao = header.some(h => h.includes('refei'));
    const hasAlimento = header.some(h => h.includes('alimento'));
    const hasKcal    = header.some(h => h.includes('kcal') || h.includes('cal'));
    if (!hasRefeicao || !hasAlimento || !hasKcal) {
      return res.status(400).json({
        error: 'Formato inválido. O arquivo deve ter as colunas: Refeição, Alimento, Quantidade (g), Kcal, Proteínas (g), Carboidratos (g), Gorduras (g).'
      });
    }

    // Índices de colunas (flexible)
    const idxOf = keyword => header.findIndex(h => h.includes(keyword));
    const iRefeicao  = idxOf('refei');
    const iAlimento  = idxOf('alimento');
    const iQtd       = idxOf('quant');
    const iKcal      = idxOf('kcal') !== -1 ? idxOf('kcal') : idxOf('cal');
    const iProt      = idxOf('prot');
    const iCarbs     = idxOf('carb');
    const iFat       = header.findIndex(h => h.includes('gordu') || h.includes('fat'));

    // Agrupar em refeições
    const mealsMap = {};
    let currentMeal = '';

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const mealCell = String(row[iRefeicao] || '').trim();
      if (mealCell) currentMeal = mealCell;

      const foodName = String(row[iAlimento] || '').trim();
      if (!foodName) continue;

      const qty      = Number(row[iQtd]   || 100);
      const calories = Number(row[iKcal]  || 0);
      const protein  = Number(row[iProt]  || 0);
      const carbs    = Number(row[iCarbs] || 0);
      const fat      = Number(row[iFat]   || 0);

      if (!mealsMap[currentMeal]) mealsMap[currentMeal] = { name: currentMeal, items: [] };
      mealsMap[currentMeal].items.push({ name: foodName, quantity: qty, calories, protein, carbs, fat });
    }

    const meals = Object.values(mealsMap);
    if (meals.length === 0) return res.status(400).json({ error: 'Nenhuma refeição encontrada no arquivo.' });

    // Calcular totais
    let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0;
    meals.forEach(m => m.items.forEach(item => {
      totalCal   += item.calories;
      totalProt  += item.protein;
      totalCarbs += item.carbs;
      totalFat   += item.fat;
    }));

    return res.json({
      ok: true,
      sheetName: targetSheet,
      meals,
      totals: {
        calories: Math.round(totalCal),
        protein:  Math.round(totalProt * 10) / 10,
        carbs:    Math.round(totalCarbs * 10) / 10,
        fat:      Math.round(totalFat * 10) / 10
      }
    });
  } catch (err) {
    console.error('Erro no preview de importação:', err);
    res.status(500).json({ error: 'Erro ao processar o arquivo Excel.' });
  }
});

// ============================================================
// @route   POST /api/diet/import/confirm
// @desc    Salva o plano importado como plano recomendado do usuário
// @access  Private
// ============================================================
router.post('/import/confirm', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { meals } = req.body;

  if (!meals || !Array.isArray(meals) || meals.length === 0) {
    return res.status(400).json({ error: 'Dados do plano inválidos.' });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Remover dieta existente
    const [[existingDiet]] = await conn.query('SELECT id FROM diets WHERE user_id = ? LIMIT 1', [userId]);
    if (existingDiet) {
      const dietId = existingDiet.id;
      const [existingMeals] = await conn.query('SELECT id FROM diet_meals WHERE diet_id = ?', [dietId]);
      for (const meal of existingMeals) {
        await conn.query('DELETE FROM diet_meal_items WHERE meal_id = ?', [meal.id]);
      }
      await conn.query('DELETE FROM diet_meals WHERE diet_id = ?', [dietId]);
      await conn.query('DELETE FROM diets WHERE id = ?', [dietId]);
    }

    // 2. Criar nova dieta
    const [dietResult] = await conn.query(
      'INSERT INTO diets (user_id, name, description, goal) VALUES (?, ?, ?, ?)',
      [userId, 'Plano Importado', 'Plano alimentar importado de arquivo Excel', 'importado']
    );
    const dietId = dietResult.insertId;

    // 3. Inserir refeições e itens
    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i];
      const [mealResult] = await conn.query(
        'INSERT INTO diet_meals (diet_id, name, meal_order) VALUES (?, ?, ?)',
        [dietId, meal.name, i + 1]
      );
      const mealId = mealResult.insertId;

      for (const item of (meal.items || [])) {
        // calories/protein/carbs/fat no Excel já são valores calculados para a porção
        // precisamos de valores por 100g para armazenar consistentemente
        const qty = Number(item.quantity) || 100;
        const cal100  = qty > 0 ? (Number(item.calories) / qty) * 100 : 0;
        const prot100 = qty > 0 ? (Number(item.protein)  / qty) * 100 : 0;
        const carb100 = qty > 0 ? (Number(item.carbs)    / qty) * 100 : 0;
        const fat100  = qty > 0 ? (Number(item.fat)      / qty) * 100 : 0;

        await conn.query(
          'INSERT INTO diet_meal_items (meal_id, food_name, quantity, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [mealId, item.name, qty, Number(cal100.toFixed(1)), Number(prot100.toFixed(2)), Number(carb100.toFixed(2)), Number(fat100.toFixed(2))]
        );
      }
    }

    await conn.commit();
    res.json({ ok: true, message: 'Plano importado com sucesso!', dietId });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao confirmar importação:', err);
    res.status(500).json({ error: 'Erro ao salvar o plano importado.' });
  } finally {
    conn.release();
  }
});

export default router;
