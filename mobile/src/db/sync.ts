import { type SQLiteDatabase } from 'expo-sqlite';
import api from '../constants/api';
import { Alert } from 'react-native';

export class SyncManager {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  // Obter número de itens pendentes na fila
  async getPendingCount(): Promise<number> {
    try {
      const res = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM sync_queue');
      return res?.count || 0;
    } catch (err) {
      console.error('Erro ao ler contagem de sync_queue:', err);
      return 0;
    }
  }

  // Limpar tabelas no logout
  async clearAllLocalTables() {
    try {
      await this.db.execAsync(`
        DELETE FROM profile;
        DELETE FROM diet_logs;
        DELETE FROM workout_logs;
        DELETE FROM water_logs;
        DELETE FROM weight_logs;
        DELETE FROM sync_queue;
        DELETE FROM cached_metadata;
      `);
      console.log('Tabelas SQLite limpas com sucesso no logout.');
    } catch (err) {
      console.error('Erro ao limpar tabelas SQLite:', err);
    }
  }

  // Sincronizar Fila de Alterações Pendentes Offline
  async syncQueue(): Promise<boolean> {
    try {
      const queue = await this.db.getAllAsync<{ id: number; action: string; payload: string; target_id: string }>(
        'SELECT * FROM sync_queue ORDER BY id ASC'
      );
      
      if (queue.length === 0) return true;

      console.log(`Iniciando sincronização de ${queue.length} alterações pendentes...`);
      const idMap: { [tempId: string]: string } = {};

      for (const item of queue) {
        const payload = JSON.parse(item.payload);
        
        try {
          if (item.action === 'ADD_FOOD_LOG') {
            const response = await api.post('/api/tracker/diet', {
              meal_name: payload.meal_name,
              food_name: payload.food_name,
              calories: payload.calories,
              quantity: payload.quantity,
              protein: payload.protein,
              carbs: payload.carbs,
              fat: payload.fat,
              date: payload.logged_date
            });
            
            const serverId = response.data.id;
            if (payload.tempId) {
              idMap[payload.tempId] = serverId.toString();
              // Atualizar no banco local o ID temporário para o ID do servidor
              await this.db.runAsync(
                'UPDATE diet_logs SET id = ?, is_pending_sync = 0 WHERE id = ?',
                [serverId.toString(), payload.tempId]
              );
            }
          } 
          else if (item.action === 'UPDATE_FOOD_LOG') {
            const targetId = idMap[item.target_id] || item.target_id;
            await api.put(`/api/tracker/diet/${targetId}`, {
              food_name: payload.food_name,
              quantity: payload.quantity,
              protein: payload.protein,
              carbs: payload.carbs,
              fat: payload.fat,
              calories: payload.calories
            });
            await this.db.runAsync('UPDATE diet_logs SET is_pending_sync = 0 WHERE id = ?', [targetId]);
          } 
          else if (item.action === 'DELETE_FOOD_LOG') {
            const targetId = idMap[item.target_id] || item.target_id;
            await api.delete(`/api/tracker/diet/${targetId}`);
          } 
          else if (item.action === 'CHECK_IN_WORKOUT') {
            await api.post(`/api/workout/day/${payload.date}`, {
              workout_day_name: payload.workoutDayName
            });
            await this.db.runAsync('UPDATE workout_logs SET is_pending_sync = 0 WHERE logged_date = ?', [payload.date]);
          } 
          else if (item.action === 'DELETE_WORKOUT') {
            const doneRes = await api.get(`/api/tracker/workout-done?date=${payload.date}`);
            if (doneRes.data && doneRes.data.id) {
              await api.delete(`/api/workout/day/${doneRes.data.id}`);
            }
          } 
          else if (item.action === 'LOG_WATER') {
            await api.post('/api/tracker/water', {
              amount_ml: payload.amount_ml,
              date: payload.date
            });
            await this.db.runAsync('UPDATE water_logs SET is_pending_sync = 0 WHERE logged_date = ?', [payload.date]);
          } 
          else if (item.action === 'UPDATE_WEIGHT') {
            const profileRes = await api.get('/api/auth/me');
            if (profileRes.data && profileRes.data.profile) {
              const updatedProfile = { ...profileRes.data.profile, weight: payload.weight };
              await Promise.all([
                api.put('/api/auth/profile', updatedProfile),
                api.post('/api/tracker/weight', { weight: payload.weight, date: payload.date })
              ]);
            }
            await this.db.runAsync('UPDATE weight_logs SET is_pending_sync = 0 WHERE logged_date = ?', [payload.date]);
          }
          else if (item.action === 'COPY_BASE_PLAN') {
            await api.post('/api/tracker/diet/copy-plan', { date: payload.date });
            // Atualizar todos os itens inseridos localmente do plano base para is_pending_sync = 0
            await this.db.runAsync('UPDATE diet_logs SET is_pending_sync = 0 WHERE logged_date = ?', [payload.date]);
          }
          else if (item.action === 'UPDATE_EXERCISE_WEIGHT') {
            await api.put(`/api/workout/day/${payload.dayId}/exercise/${payload.exerciseId}`, { weight: payload.weight });
          }

          // Remover item com sucesso da fila
          await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);

        } catch (err: any) {
          console.error(`Erro ao sincronizar item da fila (ID: ${item.id}, action: ${item.action}):`, err?.response?.status, err?.response?.data || err?.message);
          // Se for erro de rede/timeout, aborta para tentar mais tarde
          if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !err.response) {
            return false;
          }
          // Se for 404 ou 400 (registro não encontrado ou dados inválidos), remove da fila para não travar
          await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [item.id]);
        }
      }
      return true;
    } catch (err) {
      console.error('Erro no processamento da syncQueue:', err);
      return false;
    }
  }

  // Mutação: Adicionar Alimento Offline
  async addFoodLog(
    mealName: string,
    foodName: string,
    calories: number,
    quantity: number,
    macros: { protein: number; carbs: number; fat: number },
    date: string
  ) {
    const tempId = 'temp_' + Date.now() + '_' + Math.round(Math.random() * 1000);
    
    // 1. Salvar no SQLite localmente de imediato
    await this.db.runAsync(
      `INSERT INTO diet_logs (id, user_id, food_name, quantity, protein, carbs, fat, calories, logged_date, meal_name, is_pending_sync) 
       VALUES (?, '1', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [tempId, foodName, quantity, macros.protein, macros.carbs, macros.fat, calories, date, mealName]
    );

    // 2. Adicionar na fila de sincronização
    const payload = JSON.stringify({
      tempId,
      meal_name: mealName,
      food_name: foodName,
      calories,
      quantity,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      logged_date: date
    });
    
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('ADD_FOOD_LOG', ?, datetime('now'))",
      [payload]
    );

    // 3. Tentar disparar sincronização em background
    this.syncQueue().catch(console.error);
    return tempId;
  }

  // Mutação: Ajustar Quantidade Offline
  async adjustFoodLogQuantity(item: any, newQty: number, ratio: number) {
    const newProtein = item.protein * ratio;
    const newCarbs = item.carbs * ratio;
    const newFat = item.fat * ratio;
    const newCalories = item.calories * ratio;

    // 1. Atualizar SQLite local de imediato
    await this.db.runAsync(
      `UPDATE diet_logs 
       SET quantity = ?, protein = ?, carbs = ?, fat = ?, calories = ?, is_pending_sync = 1 
       WHERE id = ?`,
      [newQty, newProtein, newCarbs, newFat, newCalories, item.id]
    );

    // 2. Enfileirar ou atualizar na fila
    if (String(item.id).startsWith('temp_')) {
      // Se for um item temporário ainda não sincronizado, podemos atualizar a payload do ADD_FOOD_LOG original na fila
      const queue = await this.db.getAllAsync<{ id: number; payload: string }>('SELECT * FROM sync_queue WHERE action = \'ADD_FOOD_LOG\'');
      for (const q of queue) {
        const payload = JSON.parse(q.payload);
        if (payload.tempId === item.id) {
          payload.quantity = newQty;
          payload.protein = newProtein;
          payload.carbs = newCarbs;
          payload.fat = newFat;
          payload.calories = newCalories;
          
          await this.db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [JSON.stringify(payload), q.id]);
          return;
        }
      }
    }

    // Se já existia no servidor, enfileirar uma ação de UPDATE
    const payload = JSON.stringify({
      food_name: item.food_name,
      quantity: newQty,
      protein: newProtein,
      carbs: newCarbs,
      fat: newFat,
      calories: newCalories
    });
    
    // Só enfileira UPDATE se o item já tem ID real do servidor (não temporário)
    if (!String(item.id).startsWith('temp_')) {
      await this.db.runAsync(
        "INSERT INTO sync_queue (action, payload, target_id, created_at) VALUES ('UPDATE_FOOD_LOG', ?, ?, datetime('now'))",
        [payload, item.id]
      );
      this.syncQueue().catch(console.error);
    }
    // Se ainda é temp_, o UPDATE do ADD_FOOD_LOG na fila já foi feito acima
  }

  // Mutação: Excluir Alimento Offline
  async deleteFoodLog(id: string) {
    // 1. Remover do SQLite local de imediato
    await this.db.runAsync('DELETE FROM diet_logs WHERE id = ?', [id]);

    // 2. Gerenciar fila
    if (String(id).startsWith('temp_')) {
      // Se for item temporário, remove o ADD_FOOD_LOG correspondente da fila e qualquer UPDATE_FOOD_LOG associado
      const queue = await this.db.getAllAsync<{ id: number; payload: string; action: string; target_id: string }>('SELECT * FROM sync_queue');
      for (const q of queue) {
        if (q.action === 'ADD_FOOD_LOG') {
          const payload = JSON.parse(q.payload || '{}');
          if (payload.tempId === id) {
            await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [q.id]);
          }
        } else if (q.action === 'UPDATE_FOOD_LOG' && q.target_id === id) {
          await this.db.runAsync('DELETE FROM sync_queue WHERE id = ?', [q.id]);
        }
      }
      // Não enfileira DELETE pois o item nunca chegou ao servidor
      return;
    }

    // Se já existia no servidor, enfileirar DELETE
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, target_id, created_at) VALUES ('DELETE_FOOD_LOG', ?, datetime('now'))",
      [id]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Check-in de Treino Offline
  async checkInWorkout(workoutDayName: string, date: string) {
    // 1. Atualizar SQLite local
    await this.db.runAsync('DELETE FROM workout_logs WHERE logged_date = ?', [date]);
    await this.db.runAsync(
      'INSERT INTO workout_logs (id, workout_day_name, logged_date, is_pending_sync) VALUES (?, ?, ?, 1)',
      ['temp_w_' + Date.now(), workoutDayName, date]
    );

    // 2. Remover qualquer DELETE_WORKOUT pendente para este dia
    await this.db.runAsync("DELETE FROM sync_queue WHERE action = 'DELETE_WORKOUT' AND payload LIKE ?", [`%"date":"${date}"%`]);

    // 3. Enfileirar CHECK_IN_WORKOUT
    const payload = JSON.stringify({ workoutDayName, date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('CHECK_IN_WORKOUT', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Excluir Check-in de Treino Offline
  async deleteWorkoutCheckIn(date: string) {
    // 1. Remover do SQLite local
    await this.db.runAsync('DELETE FROM workout_logs WHERE logged_date = ?', [date]);

    // 2. Remover qualquer CHECK_IN_WORKOUT pendente da fila para não gerar tráfego desnecessário
    await this.db.runAsync("DELETE FROM sync_queue WHERE action = 'CHECK_IN_WORKOUT' AND payload LIKE ?", [`%"date":"${date}"%`]);

    // 3. Enfileirar DELETE_WORKOUT
    const payload = JSON.stringify({ date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('DELETE_WORKOUT', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Registrar Água Offline
  async logWater(amountMl: number, date: string) {
    // 1. Obter quantidade atual
    const res = await this.db.getFirstAsync<{ amount_ml: number }>('SELECT amount_ml FROM water_logs WHERE logged_date = ?', [date]);
    const newAmount = (res?.amount_ml || 0) + amountMl;

    // 2. Atualizar SQLite local
    await this.db.runAsync(
      'INSERT OR REPLACE INTO water_logs (id, amount_ml, logged_date, is_pending_sync) VALUES (?, ?, ?, 1)',
      [`water_${date}`, newAmount, date]
    );

    // 3. Remover LOG_WATER pendentes anteriores da fila para evitar requisições redundantes
    await this.db.runAsync("DELETE FROM sync_queue WHERE action = 'LOG_WATER' AND payload LIKE ?", [`%"date":"${date}"%`]);

    // 4. Enfileirar LOG_WATER com o valor consolidado final
    const payload = JSON.stringify({ amount_ml: newAmount, date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('LOG_WATER', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Reiniciar Água Offline
  async resetWater(date: string) {
    // 1. Atualizar SQLite local
    await this.db.runAsync(
      'INSERT OR REPLACE INTO water_logs (id, amount_ml, logged_date, is_pending_sync) VALUES (?, 0, ?, 1)',
      [`water_${date}`, date]
    );

    // 2. Remover LOG_WATER pendentes anteriores
    await this.db.runAsync("DELETE FROM sync_queue WHERE action = 'LOG_WATER' AND payload LIKE ?", [`%"date":"${date}"%`]);

    // 3. Enfileirar com valor 0
    const payload = JSON.stringify({ amount_ml: 0, date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('LOG_WATER', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Atualizar Peso Offline
  async updateWeight(weight: number, date: string) {
    // 1. Atualizar perfil e logs de peso no SQLite local
    await this.db.runAsync('UPDATE profile SET weight = ?', [weight]);
    await this.db.runAsync(
      'INSERT OR REPLACE INTO weight_logs (id, weight, logged_date, is_pending_sync) VALUES (?, ?, ?, 1)',
      [`weight_${date}`, weight, date]
    );

    // 2. Remover pesos pendentes da fila para o mesmo dia
    await this.db.runAsync("DELETE FROM sync_queue WHERE action = 'UPDATE_WEIGHT' AND payload LIKE ?", [`%"date":"${date}"%`]);

    // 3. Enfileirar
    const payload = JSON.stringify({ weight, date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('UPDATE_WEIGHT', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Salvar Peso de Exercício Offline
  async updateExerciseWeight(dayId: number, exerciseId: number, weight: number) {
    const localWorkout = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM cached_metadata WHERE key = ?', ['workout_plan']);
    if (localWorkout) {
      try {
        const routineObj = JSON.parse(localWorkout.value);
        if (routineObj && routineObj.days) {
          for (let day of routineObj.days) {
            if (day.id === dayId && day.exercises) {
              for (let ex of day.exercises) {
                if (ex.id === exerciseId) {
                  ex.weight = weight;
                }
              }
            }
          }
          await this.db.runAsync(
            'INSERT OR REPLACE INTO cached_metadata (key, value) VALUES (?, ?)',
            ['workout_plan', JSON.stringify(routineObj)]
          );
        }
      } catch (err) {
        console.error('Erro ao atualizar cache local do treino:', err);
      }
    }

    const payload = JSON.stringify({ dayId, exerciseId, weight });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('UPDATE_EXERCISE_WEIGHT', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Mutação: Copiar Plano Base Offline
  async copyBasePlan(date: string, basePlanMeals: any[]) {
    // 1. Gerar os logs locais temporários no SQLite com base no plano base carregado
    for (const meal of basePlanMeals) {
      if (!meal.items || meal.items.length === 0) continue;
      for (const foodItem of meal.items) {
        const tempId = 'temp_' + Date.now() + '_' + Math.round(Math.random() * 10000);
        await this.db.runAsync(
          `INSERT INTO diet_logs (id, user_id, food_name, quantity, protein, carbs, fat, calories, logged_date, meal_name, is_pending_sync) 
           VALUES (?, '1', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            tempId,
            foodItem.name,
            Number(foodItem.quantity),
            Number(foodItem.protein || 0),
            Number(foodItem.carbs || 0),
            Number(foodItem.fat || 0),
            Number(foodItem.calories || 0),
            date,
            meal.name
          ]
        );
      }
    }

    // 2. Enfileirar a chamada COPY_BASE_PLAN que rebatendo no servidor irá registrar o plano base completo com um único comando
    const payload = JSON.stringify({ date });
    await this.db.runAsync(
      "INSERT INTO sync_queue (action, payload, created_at) VALUES ('COPY_BASE_PLAN', ?, datetime('now'))",
      [payload]
    );

    this.syncQueue().catch(console.error);
  }

  // Obter Dados Sincronizados do Servidor (Cacheando Localmente) ou do SQLite
  async syncFromServer(date: string): Promise<any> {
    try {
      // 1. Tentar processar a fila local se houver conexão
      await this.syncQueue();

      // 2. Chamar endpoints da API em paralelo
      const [userRes, dietRes, workoutRes, waterRes, workoutDoneRes, dietLogsRes, compareRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/diet').catch(() => ({ data: null })),
        api.get('/api/workout').catch(() => ({ data: null })),
        api.get(`/api/tracker/water?date=${date}`).catch(() => ({ data: { amount_ml: 0 } })),
        api.get(`/api/tracker/workout-done?date=${date}`).catch(() => ({ data: { isDone: false, workout_day_name: null } })),
        api.get(`/api/tracker/diet?date=${date}`).catch(() => ({ data: [] })),
        api.get(`/api/tracker/diet/compare?date=${date}`).catch(() => ({ data: null }))
      ]);

      const profile = userRes.data.profile;
      const dietLogs = dietLogsRes.data || [];
      const waterAmount = waterRes.data?.amount_ml || 0;
      const workoutDone = !!workoutDoneRes.data?.isDone;
      const workoutName = workoutDoneRes.data?.workout_day_name || null;
      const compareData = compareRes.data || null;

      // 3. Atualizar Tabelas Locais (Caches) no SQLite
      await this.db.runAsync('DELETE FROM profile');
      await this.db.runAsync(
        `INSERT INTO profile (id, name, email, weight, height, target_calories, target_protein, target_carbs, target_fat, meals_per_day, use_whey) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.id?.toString() || '1',
          profile.name || '',
          profile.email || '',
          Number(profile.weight) || 0,
          Number(profile.height) || 0,
          profile.targetCalories || 0,
          profile.macros?.protein || 0,
          profile.macros?.carbs || 0,
          profile.macros?.fat || 0,
          profile.mealsPerDay || 4,
          profile.useWhey ? 1 : 0
        ]
      );

      // Caches de Metadados (Planos Base de Dieta e Treino)
      if (dietRes.data) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO cached_metadata (key, value) VALUES (?, ?)',
          ['diet_plan', JSON.stringify(dietRes.data)]
        );
      }
      if (workoutRes.data) {
        await this.db.runAsync(
          'INSERT OR REPLACE INTO cached_metadata (key, value) VALUES (?, ?)',
          ['workout_plan', JSON.stringify(workoutRes.data)]
        );
      }

      // Logs de Dieta para o dia
      const pendingDiet = await this.db.getAllAsync('SELECT id FROM diet_logs WHERE logged_date = ? AND is_pending_sync = 1', [date]);
      if (pendingDiet.length === 0) {
        await this.db.runAsync('DELETE FROM diet_logs WHERE logged_date = ?', [date]);
        for (const log of dietLogs) {
          await this.db.runAsync(
            `INSERT INTO diet_logs (id, user_id, food_name, quantity, protein, carbs, fat, calories, logged_date, meal_name, is_pending_sync) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              log.id.toString(),
              log.user_id?.toString() || '',
              log.food_name,
              Number(log.quantity),
              Number(log.protein),
              Number(log.carbs),
              Number(log.fat),
              Number(log.calories),
              date,
              log.meal_name
            ]
          );
        }
      }

      // Água para o dia
      const pendingWater = await this.db.getAllAsync('SELECT id FROM water_logs WHERE logged_date = ? AND is_pending_sync = 1', [date]);
      if (pendingWater.length === 0) {
        await this.db.runAsync('DELETE FROM water_logs WHERE logged_date = ?', [date]);
        await this.db.runAsync(
          'INSERT OR REPLACE INTO water_logs (id, amount_ml, logged_date, is_pending_sync) VALUES (?, ?, ?, 0)',
          [`water_${date}`, waterAmount, date]
        );
      }

      // Workout logs para o dia
      const pendingWorkout = await this.db.getAllAsync('SELECT id FROM workout_logs WHERE logged_date = ? AND is_pending_sync = 1', [date]);
      if (pendingWorkout.length === 0) {
        await this.db.runAsync('DELETE FROM workout_logs WHERE logged_date = ?', [date]);
        if (workoutDone && workoutName) {
          await this.db.runAsync(
            'INSERT INTO workout_logs (id, workout_day_name, logged_date, is_pending_sync) VALUES (?, ?, ?, 0)',
            [`workout_${date}`, workoutName, date]
          );
        }
      }

      return {
        profile,
        diet: dietRes.data,
        workout: workoutRes.data,
        dietLogs,
        waterIntake: waterAmount,
        workoutDoneToday: workoutDone,
        loggedWorkoutName: workoutName,
        compareData,
        isOffline: false
      };

    } catch (err) {
      console.log('Erro de sincronização. Carregando dados locais do SQLite...', err);
      return this.getLocalDashboardData(date);
    }
  }

  // Carregar dados offline do SQLite local em caso de falha de conexão
  async getLocalDashboardData(date: string): Promise<any> {
    // 1. Perfil
    const localProfile = await this.db.getFirstAsync<any>('SELECT * FROM profile');
    const profile = localProfile
      ? {
          id: localProfile.id,
          name: localProfile.name,
          email: localProfile.email,
          weight: localProfile.weight,
          height: localProfile.height,
          targetCalories: localProfile.target_calories,
          mealsPerDay: localProfile.meals_per_day,
          useWhey: localProfile.use_whey === 1,
          macros: {
            protein: localProfile.target_protein,
            carbs: localProfile.target_carbs,
            fat: localProfile.target_fat
          }
        }
      : null;

    // 2. Metadados de Dieta e Treino Planos
    const localDiet = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM cached_metadata WHERE key = ?', ['diet_plan']);
    const diet = localDiet ? JSON.parse(localDiet.value) : null;

    const localWorkout = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM cached_metadata WHERE key = ?', ['workout_plan']);
    const workout = localWorkout ? JSON.parse(localWorkout.value) : null;

    // 3. Logs de Dieta
    const dbDietLogs = await this.db.getAllAsync<any>('SELECT * FROM diet_logs WHERE logged_date = ?', [date]);
    const dietLogs = dbDietLogs.map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      food_name: l.food_name,
      quantity: l.quantity,
      protein: l.protein,
      carbs: l.carbs,
      fat: l.fat,
      calories: l.calories,
      logged_date: l.logged_date,
      meal_name: l.meal_name,
      is_pending_sync: l.is_pending_sync
    }));

    // 4. Água
    const localWater = await this.db.getFirstAsync<any>('SELECT amount_ml FROM water_logs WHERE logged_date = ?', [date]);
    const waterIntake = localWater?.amount_ml || 0;

    // 5. Treinos concluídos
    const localWorkoutDone = await this.db.getFirstAsync<any>('SELECT workout_day_name FROM workout_logs WHERE logged_date = ?', [date]);
    const workoutDoneToday = !!localWorkoutDone;
    const loggedWorkoutName = localWorkoutDone?.workout_day_name || null;

    // 6. Calcular dados de ingestão/comparação locais
    let consumedCalories = 0;
    let consumedProtein = 0;
    let consumedCarbs = 0;
    let consumedFat = 0;

    dietLogs.forEach((l) => {
      consumedCalories += Math.round(Number(l.calories));
      consumedProtein += Math.round(Number(l.protein));
      consumedCarbs += Math.round(Number(l.carbs));
      consumedFat += Math.round(Number(l.fat));
    });

    const compareData = {
      today: {
        calories: consumedCalories,
        protein: consumedProtein,
        carbs: consumedCarbs,
        fat: consumedFat
      },
      yesterday: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    };

    return {
      profile,
      diet,
      workout,
      dietLogs,
      waterIntake,
      workoutDoneToday,
      loggedWorkoutName,
      compareData,
      isOffline: true
    };
  }
}
