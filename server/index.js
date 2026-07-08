import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import trackerRoutes from './routes/tracker.js';
import dietTrackerRoutes from './routes/dietTracker.js';
import dietRoutes from './routes/diet.js';
import workoutRoutes from './routes/workout.js';
import foodsRoutes from './routes/foods.js';

import os from 'os';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Registro de rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/tracker/diet', dietTrackerRoutes);
app.use('/api/diet', dietRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/foods', foodsRoutes);

// Rota base de verificação de status
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API FitLife ativa e operando.' });
});

// Inicializar banco de dados e iniciar o servidor Express
async function startServer() {
  try {
    // Inicializar conexão e tabelas do MySQL
    await initDatabase();
    
    // Obter o IP de rede local
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    for (const name in networkInterfaces) {
      for (const iface of networkInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
          break;
        }
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`Servidor rodando com sucesso!`);
      console.log(`Local: http://localhost:${PORT}/health`);
      console.log(`Rede Local: http://${localIP}:${PORT}/health`);
      console.log(`Use este IP no aplicativo móvel: ${localIP}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Falha ao iniciar o servidor devido a erros no banco de dados.');
    process.exit(1);
  }
}

startServer();
