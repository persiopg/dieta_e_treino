import express from 'express';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';
import { workoutPresets } from '../../src/data/workoutPresets.js';

const exerciseDetailsMap = {
  'Supino Reto com Barra': {
    met: 4.5,
    rationale: 'Exercício multiarticular de empurrar. Constrói a base de força do tronco superior.',
    expected_result: 'Hipertrofia do peito, tríceps e ombro anterior.'
  },
  'Supino Inclinado com Halteres': {
    met: 4.2,
    rationale: 'Foca na porção superior do peitoral. O uso de halteres melhora a amplitude e simetria.',
    expected_result: 'Desenvolvimento do peitoral superior e ombros.'
  },
  'Crucifixo Reto com Halteres': {
    met: 3.5,
    rationale: 'Exercício isolador que trabalha o peitoral em alongamento máximo sem fadigar o tríceps.',
    expected_result: 'Definição e alongamento das fibras do peito.'
  },
  'Crossover na Polia': {
    met: 3.2,
    rationale: 'Mantém tensão constante no peitoral durante todo o movimento. Ótimo para finalização.',
    expected_result: 'Isolamento e pump no peito inferior e medial.'
  },
  'Puxada Aberta no Pulley': {
    met: 4.0,
    rationale: 'Movimento de puxada vertical composto. Essencial para a largura das costas.',
    expected_result: 'Fortalecimento do latíssimo do dorso e bíceps.'
  },
  'Remada Curvada com Barra': {
    met: 4.5,
    rationale: 'Movimento de puxada horizontal pesado. Desenvolve espessura e força na cadeia posterior.',
    expected_result: 'Hipertrofia de costas médias, romboides e trapézio.'
  },
  'Remada Baixa Sentada': {
    met: 3.8,
    rationale: 'Remada com polia que permite excelente contração dos dorsais com menos fadiga lombar.',
    expected_result: 'Espessura das costas e estabilização escapular.'
  },
  'Pull-down na Polia': {
    met: 3.2,
    rationale: 'Isola o latíssimo do dorso eliminando a ação do bíceps no movimento.',
    expected_result: 'Trabalho focado na expansão dorsal ("asas").'
  },
  'Agachamento Livre com Barra': {
    met: 6.0,
    rationale: 'O rei dos exercícios de pernas. Composto pesado que recruta quase todo o corpo.',
    expected_result: 'Desenvolvimento massivo de quadríceps, glúteos e estabilização do core.'
  },
  'Leg Press 45': {
    met: 5.0,
    rationale: 'Permite alto volume e carga para membros inferiores com menor compressão na coluna.',
    expected_result: 'Hipertrofia de quadríceps e glúteos.'
  },
  'Cadeira Extensora': {
    met: 3.5,
    rationale: 'Exercício isolador de quadríceps que trabalha o músculo em contração máxima.',
    expected_result: 'Isolamento e definição do quadríceps.'
  },
  'Cadeira Flexora': {
    met: 3.5,
    rationale: 'Isolador focado na flexão do joelho para treinar os posteriores de coxa.',
    expected_result: 'Hipertrofia e prevenção de lesões nos posteriores de coxa.'
  },
  'Stiff com Halteres': {
    met: 4.5,
    rationale: 'Treina a extensão de quadril, enfatizando alongamento dos posteriores e glúteos.',
    expected_result: 'Desenvolvimento da cadeia posterior, glúteos e lombar.'
  },
  'Elevação Pélvica': {
    met: 4.5,
    rationale: 'Melhor exercício isolador para glúteos com máxima ativação mecânica.',
    expected_result: 'Hipertrofia e força direcionada nos glúteos.'
  },
  'Gêmeos Sentado (Panturrilha)': {
    met: 3.0,
    rationale: 'Foca no músculo sóleo da panturrilha com o joelho flexionado.',
    expected_result: 'Desenvolvimento de volume e força no músculo sóleo.'
  },
  'Gêmeos em Pé': {
    met: 3.0,
    rationale: 'Foca no músculo gastrocnêmio com pernas totalmente estendidas.',
    expected_result: 'Força e definição das panturrilhas.'
  },
  'Desenvolvimento com Halteres': {
    met: 4.2,
    rationale: 'Exercício composto de empurrar vertical. Constrói ombros largos e fortes.',
    expected_result: 'Hipertrofia do deltoide anterior e lateral.'
  },
  'Elevação Lateral com Halteres': {
    met: 3.2,
    rationale: 'Isolador essencial para dar aspecto de ombros largos (V-taper).',
    expected_result: 'Desenvolvimento do deltoide lateral.'
  },
  'Elevação Frontal na Polia': {
    met: 3.2,
    rationale: 'Isola o deltoide anterior fornecendo tensão mecânica contínua da polia.',
    expected_result: 'Hipertrofia do deltoide frontal.'
  },
  'Crucifixo Invertido (Posterior)': {
    met: 3.2,
    rationale: 'Foco na porção posterior do ombro, auxiliando na postura e simetria.',
    expected_result: 'Trabalho do deltoide posterior e trapézio.'
  },
  'Tríceps Pulley (Corda ou Barra)': {
    met: 3.2,
    rationale: 'Trabalho isolado de extensão de cotovelo na polia com excelente ativação de tríceps.',
    expected_result: 'Hipertrofia do tríceps lateral e medial.'
  },
  'Tríceps Testa com Halteres': {
    met: 3.5,
    rationale: 'Exercício clássico de tríceps que enfatiza a cabeça longa do músculo.',
    expected_result: 'Volume e força no tríceps posterior.'
  },
  'Rosca Direta com Barra W': {
    met: 3.2,
    rationale: 'Exercício construtor de bíceps clássico. A barra W reduz estresse nos punhos.',
    expected_result: 'Volume e pico no bíceps.'
  },
  'Rosca Alternada com Halteres': {
    met: 3.2,
    rationale: 'Trabalha os bíceps de forma unilateral com supinação ativa do punho.',
    expected_result: 'Simetria e pico do bíceps.'
  },
  'Rosca Martelo com Halteres': {
    met: 3.2,
    rationale: 'Foca no braquiorradial (antebraço) e braquial, dando espessura ao braço.',
    expected_result: 'Força de pegada e volume nos antebraços e braços.'
  },
  'Prancha Isométrica': {
    met: 3.0,
    rationale: 'Estabilizador do core, fortalecendo a parede abdominal de forma estática e segura.',
    expected_result: 'Fortalecimento da musculatura profunda do core e proteção lombar.'
  },
  'Abdominal Supra na Prancha': {
    met: 3.0,
    rationale: 'Foco na flexão da coluna para treinar o reto abdominal superior.',
    expected_result: 'Hipertrofia e definição dos gomos do abdômen.'
  },
  'Abdominal Infra na Paralela': {
    met: 3.0,
    rationale: 'Foco na elevação de pernas/quadril para acionar a porção inferior do abdômen.',
    expected_result: 'Fortalecimento do abdômen inferior e flexores do quadril.'
  },
  'Extensão Lombar (Banco Romano)': {
    met: 3.2,
    rationale: 'Fortalece os eretores da espinha, promovendo melhor postura e proteção à coluna.',
    expected_result: 'Força lombar e prevenção de dores nas costas.'
  }
};

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
        'SELECT id, name, sets, reps, rest, weight, rationale, expected_result, met FROM workout_exercises WHERE workout_day_id = ? ORDER BY id ASC',
        [day.id]
      );

      const mappedExercises = exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: Number(ex.sets),
        reps: ex.reps,
        rest: Number(ex.rest),
        weight: Number(ex.weight),
        rationale: ex.rationale,
        expected_result: ex.expected_result,
        met: ex.met ? Number(ex.met) : 3.5
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
          const details = exerciseDetailsMap[ex.name] || {
            met: 3.5,
            rationale: 'Exercício complementar para rotina semanal.',
            expected_result: 'Ganho de força e tônus muscular geral.'
          };

          await conn.query(
            `INSERT INTO workout_exercises (workout_day_id, name, sets, reps, rest, weight, rationale, expected_result, met) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              dayId,
              ex.name,
              ex.sets,
              ex.reps,
              ex.rest,
              ex.weight || 0,
              details.rationale,
              details.expected_result,
              details.met
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

    const details = exerciseDetailsMap[name] || {
      met: 3.5,
      rationale: 'Exercício complementar adicionado manualmente.',
      expected_result: 'Ganho de força e tônus muscular geral.'
    };

    const [result] = await pool.query(
      `INSERT INTO workout_exercises (workout_day_id, name, sets, reps, rest, weight, rationale, expected_result, met) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dayId,
        name,
        sets,
        reps,
        rest,
        weight || 0,
        details.rationale,
        details.expected_result,
        details.met
      ]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      sets: Number(sets),
      reps,
      rest: Number(rest),
      weight: Number(weight || 0),
      rationale: details.rationale,
      expected_result: details.expected_result,
      met: Number(details.met)
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

      const details = exerciseDetailsMap[name] || {
        met: 3.5,
        rationale: 'Exercício complementar atualizado manualmente.',
        expected_result: 'Ganho de força e tônus muscular geral.'
      };

      fields.push('met = ?');
      params.push(details.met);

      fields.push('rationale = ?');
      params.push(details.rationale);

      fields.push('expected_result = ?');
      params.push(details.expected_result);
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
