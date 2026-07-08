import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_token_key';

// Função auxiliar para mapear o registro do BD para o formato do Frontend
function mapUserToClient(user) {
  if (!user.goal) return null; // Usuário não fez o wizard ainda
  return {
    gender: user.gender,
    age: user.age,
    weight: user.weight ? Number(user.weight) : null,
    height: user.height ? Number(user.height) : null,
    activityLevel: user.activity_level ? Number(user.activity_level) : null,
    goal: user.goal,
    workoutDays: user.workout_days,
    bmr: user.bmr,
    tdee: user.tdee,
    targetCalories: user.target_calories,
    macros: {
      protein: user.protein_target || 0,
      carbs: user.carbs_target || 0,
      fat: user.fat_target || 0
    },
    useWhey: user.use_whey !== 0,
    mealsPerDay: user.meals_per_day || 4
  };
}

// @route   POST /api/auth/register
// @desc    Cadastrar um novo usuário
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, insira email e senha.' });
  }

  try {
    const pool = getPool();
    
    // Verificar se o usuário já existe
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Este email já está sendo utilizado.' });
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Inserir no banco de dados
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );

    const userId = result.insertId;

    // Gerar token JWT
    const token = jwt.sign({ userId }, jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: userId,
        email,
        profile: null // Inicialmente sem perfil (precisa rodar o Wizard)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor ao registrar usuário.' });
  }
});

// @route   POST /api/auth/login
// @desc    Autenticar usuário e obter token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Por favor, insira email e senha.' });
  }

  try {
    const pool = getPool();

    // Buscar usuário
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const user = users[0];

    // Verificar senha
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    // Gerar token JWT
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        profile: mapUserToClient(user)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor ao fazer login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Obter os dados do usuário autenticado atual
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      email: user.email,
      profile: mapUserToClient(user)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário.' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Atualizar ou preencher o perfil do usuário (dados do Wizard/Dashboard)
router.put('/profile', authMiddleware, async (req, res) => {
  const { 
    gender, 
    age, 
    weight, 
    height, 
    activityLevel, 
    goal, 
    workoutDays, 
    bmr, 
    tdee, 
    targetCalories, 
    macros,
    useWhey,
    mealsPerDay
  } = req.body;

  try {
    const pool = getPool();

    await pool.query(
      `UPDATE users SET 
        gender = ?, 
        age = ?, 
        weight = ?, 
        height = ?, 
        activity_level = ?, 
        goal = ?, 
        workout_days = ?, 
        bmr = ?, 
        tdee = ?, 
        target_calories = ?, 
        protein_target = ?, 
        carbs_target = ?, 
        fat_target = ?,
        use_whey = ?,
        meals_per_day = ?
      WHERE id = ?`,
      [
        gender,
        age,
        weight,
        height,
        activityLevel,
        goal,
        workoutDays,
        bmr,
        tdee,
        targetCalories,
        macros?.protein || 0,
        macros?.carbs || 0,
        macros?.fat || 0,
        useWhey !== undefined ? (useWhey ? 1 : 0) : 1,
        mealsPerDay !== undefined ? mealsPerDay : 4,
        req.userId
      ]
    );

    // Buscar perfil atualizado para retornar
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const updatedUser = users[0];

    res.json({
      message: 'Perfil atualizado com sucesso.',
      profile: mapUserToClient(updatedUser)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar o perfil.' });
  }
});

// @route   PUT /api/auth/profile/calories
// @desc    Atualizar rapidamente as metas de calorias e macros diretamente
router.put('/profile/calories', authMiddleware, async (req, res) => {
  const { targetCalories, protein, carbs, fat } = req.body;

  if (!targetCalories || protein === undefined || carbs === undefined || fat === undefined) {
    return res.status(400).json({ error: 'Calorias e macros (proteínas, carboidratos e gorduras) são obrigatórios.' });
  }

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE users SET 
        target_calories = ?, 
        protein_target = ?, 
        carbs_target = ?, 
        fat_target = ? 
      WHERE id = ?`,
      [targetCalories, protein, carbs, fat, req.userId]
    );

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);
    const updatedUser = users[0];

    res.json({
      message: 'Metas calóricas atualizadas com sucesso.',
      profile: mapUserToClient(updatedUser)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar as metas calóricas.' });
  }
});

// @route   DELETE /api/auth/account
// @desc    Excluir a conta do usuário e todos os registros associados
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM users WHERE id = ?', [req.userId]);
    res.json({ message: 'Conta excluída com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir a conta.' });
  }
});

export default router;
