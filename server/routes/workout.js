import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';
import { workoutPresets } from '../../src/data/workoutPresets.js';

const router = express.Router();

// Helper para obter o nome e descrição do treino baseado no cadastro
async function getWorkoutMeta(pool, userId) {
  const [users] = await pool.query('SELECT workout_days FROM users WHERE id = ?', [userId]);
  const days = users.length > 0 ? users[0].workout_days : 4;

  let name = 'Treino Personalizado';
  let description = 'Rotina customizada configurada por você.';

  if (days <= 3) {
    name = 'Full Body 3x (Corpo Inteiro)';
    description = 'Excelente para iniciantes ou pessoas com tempo reduzido. Foco em movimentos compostos 3 vezes por semana.';
  } else if (days === 4) {
    name = 'Upper / Lower 4x (Superior / Inferior)';
    description = 'Frequência ideal de 4 dias semanais divididos entre treinos para a parte superior e parte inferior do corpo.';
  } else if (days >= 5) {
    name = 'Push / Pull / Legs 6x (Empurrar / Puxar / Pernas)';
    description = 'Divisão de treino avançada focada em frequência máxima. Divide os dias em movimentos de empurrar, puxar e pernas.';
  }

  return { name, description };
}

// @route   GET /api/workout
// @desc    Obter a rotina de treinos e exercícios do usuário
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const { name, description } = await getWorkoutMeta(pool, req.userId);

    // Buscar os dias de treinos do usuário
    const [days] = await pool.query(
      'SELECT id, name, description FROM workout_days WHERE user_id = ? ORDER BY id ASC',
      [req.userId]
    );

    const daysWithExercises = [];
    for (const day of days) {
      const [exercises] = await pool.query(
        'SELECT id, name, sets, reps, rest, weight FROM workout_exercises WHERE workout_day_id = ? ORDER BY id ASC',
        [day.id]
      );

      const mappedExercises = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: Number(ex.sets),
        reps: ex.reps,
        rest: Number(ex.rest),
        weight: Number(ex.weight)
      }));

      daysWithExercises.push({
        id: day.id,
        name: day.name,
        description: day.description,
        exercises: mappedExercises
      });
    }

    res.json({
      name,
      description,
      days: daysWithExercises
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar rotina de treinos.' });
  }
});

// @route   POST /api/workout/preset
// @desc    Aplicar um preset de treinos completo
router.post('/preset', authMiddleware, async (req, res) => {
  const { presetKey } = req.body; // 'fullbody3x', 'upperlower4x', 'ppl6x'

  const preset = workoutPresets[presetKey];
  if (!preset) {
    return res.status(400).json({ error: 'Preset de treinos inválido.' });
  }

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Limpar treinos antigos (tabelas em cascata)
    await conn.query('DELETE FROM workout_days WHERE user_id = ?', [req.userId]);

    // 2. Inserir novos dias e exercícios
    for (const day of preset.days) {
      const [dayResult] = await conn.query(
        'INSERT INTO workout_days (user_id, name, description) VALUES (?, ?, ?)',
        [req.userId, day.name, day.description || '']
      );

      const dayId = dayResult.insertId;

      if (day.exercises && day.exercises.length > 0) {
        for (const ex of day.exercises) {
          await conn.query(
            `INSERT INTO workout_exercises (workout_day_id, name, sets, reps, rest, weight) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              dayId,
              ex.name,
              ex.sets,
              ex.reps,
              ex.rest,
              ex.weight || 0
            ]
          );
        }
      }
    }

    await conn.commit();
    conn.release();

    res.redirect(303, '/api/workout');
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error(error);
    res.status(500).json({ error: 'Erro ao aplicar preset de treinos.' });
  }
});

// @route   POST /api/workout/day
// @desc    Adicionar um novo dia de treinos
router.post('/day', authMiddleware, async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do dia de treino é obrigatório.' });
  }

  try {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO workout_days (user_id, name, description) VALUES (?, ?, ?)',
      [req.userId, name, description || '']
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description: description || '',
      exercises: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar novo dia de treino.' });
  }
});

// @route   DELETE /api/workout/day/:id
// @desc    Excluir um dia de treino
router.delete('/day/:id', authMiddleware, async (req, res) => {
  const dayId = req.params.id;

  try {
    const pool = getPool();

    // Validar se o dia pertence ao usuário logado
    const [check] = await pool.query('SELECT id FROM workout_days WHERE id = ? AND user_id = ?', [dayId, req.userId]);
    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou dia de treino não encontrado.' });
    }

    await pool.query('DELETE FROM workout_days WHERE id = ?', [dayId]);
    res.json({ message: 'Dia de treino excluído com sucesso.', id: Number(dayId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir dia de treino.' });
  }
});

// @route   POST /api/workout/day/:id/exercise
// @desc    Adicionar um exercício ao dia de treino
router.post('/day/:id/exercise', authMiddleware, async (req, res) => {
  const dayId = req.params.id;
  const { name, sets, reps, rest, weight } = req.body;

  if (!name || sets === undefined || reps === undefined || rest === undefined) {
    return res.status(400).json({ error: 'Parâmetros incompletos para criação de exercício.' });
  }

  try {
    const pool = getPool();

    // Validar se o dia de treino pertence ao usuário logado
    const [check] = await pool.query('SELECT id FROM workout_days WHERE id = ? AND user_id = ?', [dayId, req.userId]);
    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou dia de treino não encontrado.' });
    }

    const [result] = await pool.query(
      `INSERT INTO workout_exercises (workout_day_id, name, sets, reps, rest, weight) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        dayId,
        name,
        sets,
        reps,
        rest,
        weight || 0
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      sets: Number(sets),
      reps,
      rest: Number(rest),
      weight: Number(weight || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao adicionar exercício.' });
  }
});

// @route   PUT /api/workout/day/:dayId/exercise/:exerciseId
// @desc    Atualizar a carga (peso) ou informações do exercício
router.put('/day/:dayId/exercise/:exerciseId', authMiddleware, async (req, res) => {
  const { dayId, exerciseId } = req.params;
  const { weight, name, sets, reps, rest } = req.body;

  try {
    const pool = getPool();

    // Validar se o dia e o exercício pertencem ao usuário logado
    const [check] = await pool.query(
      `SELECT e.id FROM workout_exercises e 
       JOIN workout_days d ON e.workout_day_id = d.id 
       WHERE e.id = ? AND d.id = ? AND d.user_id = ?`,
      [exerciseId, dayId, req.userId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou exercício não encontrado.' });
    }

    // Montar query dinâmica baseada nos campos fornecidos
    let query = 'UPDATE workout_exercises SET ';
    const params = [];
    const fields = [];

    if (weight !== undefined) {
      fields.push('weight = ?');
      params.push(weight);
    }
    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (sets !== undefined) {
      fields.push('sets = ?');
      params.push(sets);
    }
    if (reps !== undefined) {
      fields.push('reps = ?');
      params.push(reps);
    }
    if (rest !== undefined) {
      fields.push('rest = ?');
      params.push(rest);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar fornecido.' });
    }

    query += fields.join(', ') + ' WHERE id = ?';
    params.push(exerciseId);

    await pool.query(query, params);

    res.json({ 
      message: 'Exercício atualizado com sucesso.', 
      exerciseId: Number(exerciseId),
      weight: weight !== undefined ? Number(weight) : undefined
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar exercício.' });
  }
});

// @route   DELETE /api/workout/day/:dayId/exercise/:exerciseId
// @desc    Excluir um exercício do dia de treino
router.delete('/day/:dayId/exercise/:exerciseId', authMiddleware, async (req, res) => {
  const { dayId, exerciseId } = req.params;

  try {
    const pool = getPool();

    // Validar se o dia e o exercício pertencem ao usuário logado
    const [check] = await pool.query(
      `SELECT e.id FROM workout_exercises e 
       JOIN workout_days d ON e.workout_day_id = d.id 
       WHERE e.id = ? AND d.id = ? AND d.user_id = ?`,
      [exerciseId, dayId, req.userId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: 'Não autorizado ou exercício não encontrado.' });
    }

    await pool.query('DELETE FROM workout_exercises WHERE id = ?', [exerciseId]);
    res.json({ message: 'Exercício excluído com sucesso.', exerciseId: Number(exerciseId) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir exercício.' });
  }
});

export default router;
