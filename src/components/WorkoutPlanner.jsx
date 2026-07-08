import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { exercisesDatabase } from '../data/workoutPresets';
import { translations } from '../utils/translations';
import { 
  Play, 
  Check, 
  Plus, 
  Trash2, 
  Timer, 
  Dumbbell, 
  Info, 
  RotateCcw,
  Sparkles,
  StopCircle,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  FileText,
  Trash,
  RefreshCw
} from 'lucide-react';

export default function WorkoutPlanner({ 
  workout, 
  setWorkout, 
  profile,
  setProfile,
  setDiet,
  loggedWorkoutName, 
  onWorkoutCheckIn, 
  lang = 'pt', 
  activeDate, 
  setActiveDate,
  onRefreshData
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isEditingBasePlan, setIsEditingBasePlan] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timer de descanso
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Estado para conclusão de séries locais e pesos na execução
  const [completedSets, setCompletedSets] = useState({});
  const [exerciseWeights, setExerciseWeights] = useState({});

  const [newExerciseForm, setNewExerciseForm] = useState({
    name: '',
    category: 'Peito',
    sets: 3,
    reps: '10',
    rest: 60,
    weight: 0
  });

  // Estados para o Modal de Recálculo do Plano
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [recalculateForm, setRecalculateForm] = useState({
    gender: profile?.gender || 'masculino',
    age: profile?.age || 30,
    weight: profile?.weight || 80,
    height: profile?.height || 170,
    activityLevel: profile?.activityLevel || 'moderado',
    goal: profile?.goal || 'emagrecimento',
    workoutDays: profile?.workoutDays || 4,
    regenerateDiet: false,
    regenerateWorkout: true
  });

  // Sincronizar dados do perfil
  useEffect(() => {
    if (profile) {
      setRecalculateForm(prev => ({
        ...prev,
        gender: profile.gender || 'masculino',
        age: profile.age || 30,
        weight: profile.weight || 80,
        height: profile.height || 170,
        activityLevel: profile.activityLevel || 'moderado',
        goal: profile.goal || 'emagrecimento',
        workoutDays: profile.workoutDays || 4
      }));
    }
  }, [profile]);

  // Atualizar cargas de peso locais ao mudar a ficha selecionada
  useEffect(() => {
    if (workout?.days?.[selectedDayIndex]) {
      const weights = {};
      workout.days[selectedDayIndex].exercises.forEach((ex, idx) => {
        weights[idx] = ex.weight || '';
      });
      setExerciseWeights(weights);
      setCompletedSets({});
    }
  }, [selectedDayIndex, workout]);

  // Efeito do Timer de Descanso
  useEffect(() => {
    if (timerActive && timerSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timerSecondsLeft]);

  // Alterar preset de treino completo
  const handlePresetSelect = async (presetKey) => {
    if (window.confirm(lang === 'pt' ? 'Substituir treino atual por este preset? Customizações serão limpas.' : 'Replace training with preset? Changes lost.')) {
      try {
        const res = await axios.post('/api/workout/preset', { presetKey });
        setWorkout(res.data);
        setSelectedDayIndex(0);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Confirmar e recalcular plano completo (dieta, treino ou ambos)
  const handleConfirmRecalculate = async (e) => {
    e.preventDefault();
    
    const genderVal = recalculateForm.gender;
    const ageVal = Number(recalculateForm.age);
    const weightVal = Number(recalculateForm.weight);
    const heightVal = Number(recalculateForm.height);
    const activityLevelFactor = Number(recalculateForm.activityLevel);
    const goalVal = recalculateForm.goal;
    const workoutDaysVal = Number(recalculateForm.workoutDays);

    // TMB (Mifflin-St Jeor)
    let calculatedBmr = 0;
    if (genderVal === 'masculino' || genderVal === 'male') {
      calculatedBmr = 10 * weightVal + 6.25 * heightVal - 5 * ageVal + 5;
    } else {
      calculatedBmr = 10 * weightVal + 6.25 * heightVal - 5 * ageVal - 161;
    }

    // TDEE
    const calculatedTdee = Math.round(calculatedBmr * activityLevelFactor);

    // Ajuste calórico por objetivo
    let calculatedTargetCalories = calculatedTdee;
    if (goalVal === 'emagrecimento') {
      calculatedTargetCalories = Math.round(calculatedTdee - 500);
      if (calculatedTargetCalories < calculatedBmr * 0.9) {
        calculatedTargetCalories = Math.round(calculatedBmr * 0.9);
      }
    } else if (goalVal === 'hipertrofia') {
      calculatedTargetCalories = Math.round(calculatedTdee + 300);
    }

    // Macros alvos
    let pMultiplier = 2.0;
    let fMultiplier = 0.9;
    if (goalVal === 'emagrecimento') {
      pMultiplier = 2.2;
      fMultiplier = 0.8;
    } else if (goalVal === 'hipertrofia') {
      pMultiplier = 2.0;
      fMultiplier = 1.0;
    } else {
      pMultiplier = 1.8;
      fMultiplier = 0.9;
    }

    const proteinGrams = Math.round(weightVal * pMultiplier);
    const fatGrams = Math.round(weightVal * fMultiplier);
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const remainingCalories = calculatedTargetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(remainingCalories > 0 ? remainingCalories / 4 : 50);

    try {
      // 1. Atualizar perfil com novos dados e macros recalculados
      const profileRes = await axios.put('/api/auth/profile', {
        gender: genderVal,
        age: ageVal,
        weight: weightVal,
        height: heightVal,
        activityLevel: activityLevelFactor,
        goal: goalVal,
        workoutDays: workoutDaysVal,
        bmr: calculatedBmr,
        tdee: calculatedTdee,
        targetCalories: calculatedTargetCalories,
        macros: {
          protein: proteinGrams,
          carbs: carbGrams,
          fat: fatGrams
        }
      });

      // Atualizar perfil global no frontend
      setProfile(profileRes.data.profile);

      // 2. Re-gerar Dieta
      if (recalculateForm.regenerateDiet) {
        const dietRes = await axios.post('/api/diet/preset', { presetKey: goalVal });
        if (setDiet) setDiet(dietRes.data);
      }

      // 3. Re-gerar Treino
      if (recalculateForm.regenerateWorkout) {
        let presetKey = 'upperlower4x';
        if (workoutDaysVal <= 3) {
          presetKey = 'fullbody3x';
        } else if (workoutDaysVal >= 5) {
          presetKey = 'ppl6x';
        }
        const workoutRes = await axios.post('/api/workout/preset', { presetKey });
        setWorkout(workoutRes.data);
        setSelectedDayIndex(0);
      }

      // 4. Finalizar
      setShowRecalculateModal(false);
      if (onRefreshData) onRefreshData();
      alert(lang === 'pt' ? 'Plano recalculado com sucesso!' : 'Plan successfully recalculated!');
    } catch (err) {
      console.error('Erro ao recalcular plano:', err);
      alert(lang === 'pt' ? 'Erro ao recalcular plano.' : 'Error recalculating plan.');
    }
  };

  // Salvar nova carga de exercício da ficha no banco de dados
  const handleWeightChange = async (ex, val) => {
    const numericWeight = Number(val);
    if (isNaN(numericWeight)) return;
    try {
      const day = workout.days[selectedDayIndex];
      await axios.put(`/api/workout/day/${day.id}/exercise/${ex.id}`, { weight: numericWeight });
      const updatedWorkout = { ...workout };
      const exIdx = updatedWorkout.days[selectedDayIndex].exercises.findIndex(e => e.id === ex.id);
      if (exIdx !== -1) {
        updatedWorkout.days[selectedDayIndex].exercises[exIdx].weight = numericWeight;
      }
      setWorkout(updatedWorkout);
    } catch (err) {
      console.error(err);
    }
  };

  // Deletar exercício
  const handleDeleteExercise = async (exIdx) => {
    const day = workout.days[selectedDayIndex];
    const ex = day.exercises[exIdx];
    if (window.confirm(lang === 'pt' ? 'Excluir exercício da ficha?' : 'Delete exercise?')) {
      try {
        await axios.delete(`/api/workout/day/${day.id}/exercise/${ex.id}`);
        const updatedWorkout = { ...workout };
        updatedWorkout.days[selectedDayIndex].exercises.splice(exIdx, 1);
        setWorkout(updatedWorkout);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Adicionar exercício padrão
  const handleAddExercise = async (selectedExercise) => {
    const day = workout.days[selectedDayIndex];
    try {
      const res = await axios.post(`/api/workout/day/${day.id}/exercise`, {
        name: selectedExercise.name,
        sets: newExerciseForm.sets,
        reps: newExerciseForm.reps,
        rest: newExerciseForm.rest,
        weight: newExerciseForm.weight || 0
      });
      const updatedWorkout = { ...workout };
      updatedWorkout.days[selectedDayIndex].exercises.push(res.data);
      setWorkout(updatedWorkout);
      setShowAddExerciseModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar Ficha de Treino Base
  const handleCreateNewDay = async () => {
    const defaultName = `Ficha ${String.fromCharCode(65 + (workout?.days?.length || 0))}`;
    const name = window.prompt(lang === 'pt' ? 'Qual o nome do novo dia de treino?' : 'Name of new workout day?', defaultName);
    if (!name) return;
    try {
      const res = await axios.post('/api/workout/day', { name, description: '' });
      const updatedWorkout = { ...workout };
      if (!updatedWorkout.days) updatedWorkout.days = [];
      updatedWorkout.days.push({ ...res.data, exercises: [] });
      setWorkout(updatedWorkout);
      setSelectedDayIndex(updatedWorkout.days.length - 1);
    } catch (err) {
      console.error(err);
    }
  };

  // Deletar Ficha de Treino Base
  const handleDeleteDay = async (dayId) => {
    if (window.confirm(lang === 'pt' ? 'Deseja excluir esta ficha de treinos completa?' : 'Delete this complete workout?')) {
      try {
        await axios.delete(`/api/workout/day/${dayId}`);
        const updatedWorkout = { ...workout };
        updatedWorkout.days = updatedWorkout.days.filter(d => d.id !== dayId);
        setWorkout(updatedWorkout);
        setSelectedDayIndex(0);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Controle do Timer de Descanso
  const startRestTimer = (seconds) => {
    setTimerDuration(seconds);
    setTimerSecondsLeft(seconds);
    setTimerActive(true);
  };

  const toggleSetComplete = (exIdx, setIdx, restTime) => {
    const key = `${exIdx}-${setIdx}`;
    const isNowDone = !completedSets[key];
    setCompletedSets(prev => ({ ...prev, [key]: isNowDone }));
    if (isNowDone) {
      startRestTimer(restTime);
    }
  };

  // ==========================================
  // NAVEGAÇÃO DE DATAS
  // ==========================================
  const handlePrevDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) return lang === 'pt' ? 'Hoje' : 'Today';
    if (dateStr === yesterdayStr) return lang === 'pt' ? 'Ontem' : 'Yesterday';
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  // Ficha correspondente ao check-in realizado
  const loggedFicha = workout?.days?.find(d => d.name === loggedWorkoutName);

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 pb-24">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-indigo-500" />
            {lang === 'pt' ? 'Fichas e Diário de Treinos' : 'Workout Hub'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'pt' ? 'Monte suas rotinas padrão (Aside) e registre o que treinou no diário de cada dia (Body).' : 'Plan cards & log active sessions.'}
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowRecalculateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {lang === 'pt' ? 'Recalcular Plano' : 'Recalculate Plan'}
          </button>
        </div>
      </div>

      {/* Grid Central (ASIDE + BODY) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ASIDE (ESQUERDA - 1/3): ROTINAS DE TREINO BASE */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                {lang === 'pt' ? 'Fichas Planejadas' : 'Workout Plans'}
              </h3>
              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                {workout?.days?.length || 0} {lang === 'pt' ? 'rotinas ativas' : 'active plans'}
              </span>
            </div>

            <button
              onClick={() => setIsEditingBasePlan(!isEditingBasePlan)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isEditingBasePlan 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {isEditingBasePlan ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isEditingBasePlan ? (lang === 'pt' ? 'Concluir' : 'Done') : (lang === 'pt' ? 'Editar' : 'Edit')}
            </button>
          </div>

          {/* Abas das Fichas no Aside */}
          <div className="flex flex-col gap-2.5">
            {workout?.days?.map((day, idx) => (
              <div 
                key={day.id}
                className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                  selectedDayIndex === idx 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedDayIndex(idx)}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <span className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200 block">{day.name}</span>
                    {day.exercises?.length > 0 ? (
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{day.exercises.length} exercícios</span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic block mt-0.5">Sem exercícios</span>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Botão rápido "Treinar Hoje" se não estiver editando */}
                    {!isEditingBasePlan ? (
                      <button
                        onClick={() => onWorkoutCheckIn(day.name)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Fiz este treino hoje"
                      >
                        <Check className="w-3 h-3" />
                        Treinei
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteDay(day.id)}
                        className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                        title="Deletar Ficha"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditingBasePlan && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-850 flex gap-2">
                <button
                  onClick={handleCreateNewDay}
                  className="flex-1 py-2 text-center text-xs font-bold text-indigo-500 border border-indigo-500/30 hover:bg-indigo-500/5 rounded-xl transition-all cursor-pointer"
                >
                  + Nova Ficha
                </button>
                <button
                  onClick={() => handlePresetSelect('push-pull-legs')}
                  className="py-2 px-3 text-center text-xs font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                >
                  ABC
                </button>
              </div>
            )}
          </div>

          {/* Visualização de exercícios da Ficha selecionada */}
          {workout?.days?.[selectedDayIndex] && (
            <div className="border-t border-zinc-100 dark:border-zinc-850 pt-4 space-y-4">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
                Exercícios Planejados: {workout.days[selectedDayIndex].name}
              </span>
              
              <div className="space-y-2.5">
                {workout.days[selectedDayIndex].exercises?.map((ex, exIdx) => (
                  <div key={ex.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-100/50 dark:border-zinc-900 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block">{ex.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {ex.sets} séries • {ex.reps} reps • {ex.rest}s descanso
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditingBasePlan ? (
                        <button
                          onClick={() => handleDeleteExercise(exIdx)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono font-bold bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded">
                          {ex.weight} kg
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {isEditingBasePlan && (
                  <button
                    onClick={() => setShowAddExerciseModal(true)}
                    className="w-full py-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Adicionar Exercício
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BODY (DIREITA - 2/3): DIÁRIO DE TREINOS DO DIA ATIVO */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500">Diário de Atividade</span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                  loggedWorkoutName 
                    ? loggedWorkoutName === 'Descanso' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  {loggedWorkoutName ? loggedWorkoutName : 'Sem treino registrado'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'pt' ? 'Gerencie o que você treinou e acompanhe a execução.' : 'Log training check-in for specific dates.'}
              </p>
            </div>

            {/* Seletor de Data */}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-1 shadow-sm self-start">
              <button onClick={handlePrevDay} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-2 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 min-w-[100px] text-center flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-500" />
                <span>{formatDateDisplay(activeDate)}</span>
              </div>
              <button onClick={handleNextDay} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Casos do Diário: */}
          {!loggedWorkoutName ? (
            /* CASO 1: SEM CHECK-IN */
            <div className="text-center py-12 space-y-6">
              <div className="space-y-2">
                <Dumbbell className="w-12 h-12 text-zinc-300 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {lang === 'pt' ? 'O que você treinou hoje?' : 'What did you train today?'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-[320px] mx-auto">
                  Marque sua ficha planejada, registre um cardio livre ou registre o descanso para recuperar o corpo.
                </p>
              </div>

              {/* Opções de Check-in */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-[600px] mx-auto">
                {workout?.days?.map((day) => (
                  <button
                    key={day.id}
                    onClick={() => onWorkoutCheckIn(day.name)}
                    className="p-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-extrabold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer flex flex-col items-center gap-1"
                  >
                    <span>💪 {day.name}</span>
                    <span className="text-[9px] text-zinc-400 font-bold font-mono">{day.exercises?.length || 0} EXERCÍCIOS</span>
                  </button>
                ))}
                
                <button
                  onClick={() => onWorkoutCheckIn('Cardio')}
                  className="p-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-extrabold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span>🏃 Cardio Livre</span>
                  <span className="text-[9px] text-zinc-400 font-bold font-mono">CORRIDA / BIKE</span>
                </button>

                <button
                  onClick={() => onWorkoutCheckIn('Descanso')}
                  className="p-4 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-extrabold text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer flex flex-col items-center gap-1"
                >
                  <span>🛌 Descanso / Off</span>
                  <span className="text-[9px] text-zinc-400 font-bold font-mono">RECUPERAÇÃO</span>
                </button>
              </div>
            </div>
          ) : (
            /* CASO 2: COM CHECK-IN REALIZADO */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#121216] border border-zinc-150 dark:border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {loggedWorkoutName === 'Descanso' ? '🛌' : loggedWorkoutName === 'Cardio' ? '🏃' : '🏆'}
                  </span>
                  <div>
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 block">
                      {loggedWorkoutName === 'Descanso' 
                        ? 'Dia de Descanso Registrado' 
                        : loggedWorkoutName === 'Cardio' 
                        ? 'Sessão de Cardio Livre Concluída' 
                        : `Treino Realizado: ${loggedWorkoutName}`}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                      Check-in ativo para o dia {formatDateDisplay(activeDate)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onWorkoutCheckIn(null)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/5 hover:bg-rose-500/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
                >
                  Desmarcar Treino
                </button>
              </div>

              {/* Se o treino for uma Ficha de Treino padrão: Mostra a listagem de execução com Timer de descanso */}
              {loggedFicha ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider block">
                      Ficha e Cargas do Treino Realizado
                    </span>
                    
                    {/* Timer no Header */}
                    {timerActive && (
                      <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 px-3 py-1 rounded-xl font-mono text-xs font-bold animate-pulse">
                        <Timer className="w-3.5 h-3.5" />
                        <span>Resting: {timerSecondsLeft}s</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {loggedFicha.exercises?.map((ex, exIdx) => (
                      <div key={ex.id} className="p-4 bg-zinc-50/50 dark:bg-[#121216]/50 border border-zinc-100 dark:border-zinc-900 rounded-2xl space-y-3.5">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-50 block">{ex.name}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold font-mono">
                              {ex.sets} séries • {ex.reps} reps • {ex.rest}s descanso
                            </span>
                          </div>

                          {/* Ajuste de Carga de Peso no Diário */}
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Carga (kg):</label>
                            <input
                              type="number"
                              defaultValue={ex.weight}
                              onBlur={(e) => handleWeightChange(ex, e.target.value)}
                              className="w-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-0.5 font-mono text-xs font-bold text-center text-zinc-800 dark:text-zinc-200"
                            />
                          </div>
                        </div>

                        {/* Checklist de Séries Concluídas (Interativo) */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-900">
                          {Array.from({ length: ex.sets }).map((_, setIdx) => {
                            const isDone = completedSets[`${exIdx}-${setIdx}`];
                            return (
                              <button
                                key={setIdx}
                                onClick={() => toggleSetComplete(exIdx, setIdx, ex.rest)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide transition-all cursor-pointer border ${
                                  isDone 
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                              >
                                {isDone ? '✓ ' : ''}SÉRIE {setIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : loggedWorkoutName === 'Cardio' ? (
                <div className="p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs py-10 space-y-2">
                  <Play className="w-10 h-10 text-indigo-500 mx-auto opacity-75" />
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">Corrida, natação ou bike realizados hoje.</p>
                  <p className="max-w-[280px] mx-auto text-[10px]">Utilize para fins de déficit calórico. Ótima escolha para manter o condicionamento cardiovascular em dia!</p>
                </div>
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs py-10 space-y-2">
                  <Sparkles className="w-10 h-10 text-amber-500 mx-auto opacity-75" />
                  <p className="font-bold text-zinc-700 dark:text-zinc-300">Dia focado na recuperação muscular total.</p>
                  <p className="max-w-[280px] mx-auto text-[10px]">Aproveite para dormir bem, alongar-se, e manter a hidratação alta para que os músculos possam se reconstruir mais fortes!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL DE ADIÇÃO DE EXERCÍCIOS (PLAN BASE)
          ========================================== */}
      {showAddExerciseModal && workout?.days?.[selectedDayIndex] && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-md text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-indigo-500" />
                {lang === 'pt' ? `Adicionar Exercício ao ${workout.days[selectedDayIndex].name}` : `Add exercise`}
              </h3>
              <button 
                onClick={() => setShowAddExerciseModal(false)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Biblioteca de exercícios */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Escolher da Biblioteca</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Buscar supino, agachamento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[220px] overflow-y-auto">
                  {exercisesDatabase
                    .filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 15)
                    .map(ex => (
                      <button
                        key={ex.name}
                        onClick={() => handleAddExercise(ex)}
                        className="w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 flex justify-between items-center"
                      >
                        <span className="font-bold">{ex.name}</span>
                        <span className="text-[9px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-bold">{ex.category}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* Formulário personalizado */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Configurar Séries & Repetições</span>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Séries (sets)</label>
                      <input
                        type="number"
                        value={newExerciseForm.sets}
                        onChange={(e) => setNewExerciseForm({ ...newExerciseForm, sets: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Repetições</label>
                      <input
                        type="text"
                        value={newExerciseForm.reps}
                        onChange={(e) => setNewExerciseForm({ ...newExerciseForm, reps: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Descanso (s)</label>
                      <input
                        type="number"
                        value={newExerciseForm.rest}
                        onChange={(e) => setNewExerciseForm({ ...newExerciseForm, rest: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Peso Inicial (kg)</label>
                      <input
                        type="number"
                        value={newExerciseForm.weight}
                        onChange={(e) => setNewExerciseForm({ ...newExerciseForm, weight: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 italic">
                    Dica: Para concluir a inserção rápida, basta clicar em qualquer exercício da biblioteca na lista ao lado com as séries já configuradas acima!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Recálculo do Plano */}
      {showRecalculateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in text-zinc-950 dark:text-zinc-50">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 flex items-center justify-center gap-1.5">
                <RefreshCw className="w-5 h-5 text-indigo-500" />
                {lang === 'pt' ? 'Recalcular Dieta e Treino' : 'Recalculate Plan'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' ? 'Responda abaixo para atualizar seus dados físicos e regerar seus planos.' : 'Answer below to update physical metrics and regenerate plans.'}
              </p>
            </div>

            <form onSubmit={handleConfirmRecalculate} className="space-y-4 text-xs">
              {/* Sexo e Idade */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Sexo' : 'Gender'}</label>
                  <select
                    value={recalculateForm.gender}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, gender: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="masculino">{lang === 'pt' ? 'Masculino' : 'Male'}</option>
                    <option value="feminino">{lang === 'pt' ? 'Feminino' : 'Female'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Idade (anos)' : 'Age (years)'}</label>
                  <input
                    type="number"
                    required
                    value={recalculateForm.age}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, age: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 font-mono"
                  />
                </div>
              </div>

              {/* Peso e Altura */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Peso (kg)' : 'Weight (kg)'}</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={recalculateForm.weight}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, weight: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Altura (cm)' : 'Height (cm)'}</label>
                  <input
                    type="number"
                    required
                    value={recalculateForm.height}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, height: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 font-mono"
                  />
                </div>
              </div>

              {/* Nível de Atividade Física */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Nível de Atividade' : 'Activity Level'}</label>
                <select
                  value={recalculateForm.activityLevel}
                  onChange={(e) => setRecalculateForm({ ...recalculateForm, activityLevel: Number(e.target.value) })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value={1.2}>{lang === 'pt' ? 'Sedentário (Pouco/Sem exercício)' : 'Sedentary'}</option>
                  <option value={1.375}>{lang === 'pt' ? 'Levemente Ativo (1-3 dias/semana)' : 'Lightly Active'}</option>
                  <option value={1.55}>{lang === 'pt' ? 'Moderadamente Ativo (3-5 dias/semana)' : 'Moderately Active'}</option>
                  <option value={1.725}>{lang === 'pt' ? 'Altamente Ativo (6-7 dias/semana)' : 'Very Active'}</option>
                  <option value={1.9}>{lang === 'pt' ? 'Extremamente Ativo (Treino pesado diário)' : 'Extremely Active'}</option>
                </select>
              </div>

              {/* Objetivo e Dias de Treino */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Objetivo' : 'Goal'}</label>
                  <select
                    value={recalculateForm.goal}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, goal: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="emagrecimento">{lang === 'pt' ? 'Emagrecimento' : 'Fat Loss'}</option>
                    <option value="manutencao">{lang === 'pt' ? 'Manutenção' : 'Maintenance'}</option>
                    <option value="hipertrofia">{lang === 'pt' ? 'Hipertrofia' : 'Muscle Gain'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Dias de Treino/Semana' : 'Workout Days'}</label>
                  <select
                    value={recalculateForm.workoutDays}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, workoutDays: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value={3}>{lang === 'pt' ? '3 dias' : '3 days'}</option>
                    <option value={4}>{lang === 'pt' ? '4 dias' : '4 days'}</option>
                    <option value={5}>{lang === 'pt' ? '5 ou mais dias' : '5+ days'}</option>
                  </select>
                </div>
              </div>

              {/* O que Re-gerar (Checkboxes) */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                  {lang === 'pt' ? 'Escolha o que deseja re-gerar' : 'Choose what to regenerate'}
                </span>
                
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recalculateForm.regenerateDiet}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, regenerateDiet: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{lang === 'pt' ? 'Recalcular e Re-gerar Dieta Recomendada' : 'Regenerate Recommended Diet'}</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recalculateForm.regenerateWorkout}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, regenerateWorkout: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-805 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{lang === 'pt' ? 'Recalcular e Re-gerar Treino Recomendado' : 'Regenerate Recommended Workout'}</span>
                </label>
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecalculateModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-550 dark:text-zinc-400 cursor-pointer"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!recalculateForm.regenerateDiet && !recalculateForm.regenerateWorkout}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all"
                >
                  {lang === 'pt' ? 'Confirmar e Recalcular' : 'Confirm & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
