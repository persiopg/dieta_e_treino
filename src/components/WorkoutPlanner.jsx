import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { exercisesDatabase } from '../data/workoutPresets';
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
  PlusCircle
} from 'lucide-react';

export default function WorkoutPlanner({ workout, setWorkout, workoutDoneToday, setWorkoutDoneToday }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Estado para execução do treino
  const [completedSets, setCompletedSets] = useState({}); // chave: `${exerciseIndex}-${setIndex}`, valor: bool
  const [exerciseWeights, setExerciseWeights] = useState({}); // chave: exerciseIndex, valor: weight (string/number)
  
  // Timer de descanso
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Modais de Edição
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newExerciseForm, setNewExerciseForm] = useState({
    name: '',
    category: 'Peito',
    sets: 3,
    reps: '10',
    rest: 60,
    weight: 0
  });

  // Atualizar cargas de peso locais quando o dia ou o treino mudar
  useEffect(() => {
    if (workout?.days?.[selectedDayIndex]) {
      const weights = {};
      workout.days[selectedDayIndex].exercises.forEach((ex, idx) => {
        weights[idx] = ex.weight || '';
      });
      setExerciseWeights(weights);
      // Resetar sets concluídos
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

  // Função para mudar o preset de treino completo no MySQL
  const handlePresetSelect = async (presetKey) => {
    if (window.confirm('Tem certeza que deseja substituir seu treino atual por este preset? Todas as customizações anteriores serão limpas.')) {
      try {
        const res = await axios.post('/api/workout/preset', { presetKey });
        setWorkout(res.data);
        setSelectedDayIndex(0);
        setIsExecuting(false);
      } catch (err) {
        console.error('Erro ao salvar preset de treinos.', err);
        alert('Erro ao carregar o preset.');
      }
    }
  };

  // Iniciar execução do treino
  const handleStartWorkout = () => {
    setIsExecuting(true);
    setCompletedSets({});
  };

  // Finalizar execução do treino e salvar as cargas no MySQL
  const handleFinishWorkout = async () => {
    setIsExecuting(false);
    setWorkoutDoneToday(true);
    setTimerActive(false);
    setTimerSecondsLeft(0);
    
    const day = workout.days[selectedDayIndex];
    try {
      // 1. Atualizar todas as cargas alteradas na execução
      const updatePromises = day.exercises.map((ex, idx) => {
        if (exerciseWeights[idx] !== undefined && exerciseWeights[idx] !== '') {
          return axios.put(`/api/workout/day/${day.id}/exercise/${ex.id}`, { weight: Number(exerciseWeights[idx]) });
        }
        return Promise.resolve();
      });
      await Promise.all(updatePromises);

      // 2. Chamar o log de treino feito no banco
      setWorkoutDoneToday(true);

      // 3. Recarregar do banco para atualizar o estado completo
      const res = await axios.get('/api/workout');
      setWorkout(res.data);

      alert('Parabéns! Treino concluído e registrado no seu histórico diário. Cargas salvas!');
    } catch (err) {
      console.error('Erro ao salvar cargas de treino no MySQL.', err);
    }
  };

  // Cancelar execução
  const handleCancelWorkout = () => {
    if (window.confirm('Deseja realmente cancelar o treino atual? O progresso desta sessão será perdido.')) {
      setIsExecuting(false);
      setTimerActive(false);
      setTimerSecondsLeft(0);
    }
  };

  // Marcar/Desmarcar Set como feito
  const toggleSetComplete = (exIdx, setIdx, restTime) => {
    const key = `${exIdx}-${setIdx}`;
    const isNowDone = !completedSets[key];
    
    setCompletedSets(prev => ({
      ...prev,
      [key]: isNowDone
    }));

    if (isNowDone) {
      // Iniciar o timer de descanso automaticamente
      startRestTimer(restTime);
    }
  };

  const startRestTimer = (seconds) => {
    setTimerDuration(seconds);
    setTimerSecondsLeft(seconds);
    setTimerActive(true);
  };

  const handleWeightChange = (exIdx, val) => {
    setExerciseWeights(prev => ({
      ...prev,
      [exIdx]: val
    }));
  };

  // Deletar um exercício do dia atual no banco
  const handleDeleteExercise = async (exIdx) => {
    const day = workout.days[selectedDayIndex];
    const ex = day.exercises[exIdx];

    if (window.confirm('Deseja excluir este exercício do seu treino?')) {
      try {
        await axios.delete(`/api/workout/day/${day.id}/exercise/${ex.id}`);
        const updatedWorkout = { ...workout };
        updatedWorkout.days[selectedDayIndex].exercises.splice(exIdx, 1);
        setWorkout(updatedWorkout);
      } catch (err) {
        console.error('Erro ao excluir exercício do banco.', err);
      }
    }
  };

  // Adicionar Exercício da biblioteca ao dia atual no banco
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
      console.error('Erro ao adicionar exercício no banco.', err);
    }
  };

  // Criar exercício totalmente novo e adicionar no banco
  const handleCreateCustomExercise = async () => {
    if (!newExerciseForm.name.trim()) return alert('Insira o nome do exercício');
    const day = workout.days[selectedDayIndex];

    try {
      const res = await axios.post(`/api/workout/day/${day.id}/exercise`, {
        name: newExerciseForm.name,
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
      console.error('Erro ao criar exercício customizado no banco.', err);
    }
  };

  // Adicionar um novo dia de treino customizado no banco
  const handleAddNewDay = async () => {
    const dayLetter = String.fromCharCode(65 + (workout?.days?.length || 0)); // A, B, C...
    const dayName = `Treino ${dayLetter}: Novo Dia Customizado`;

    try {
      const res = await axios.post('/api/workout/day', { name: dayName });
      const updatedWorkout = { ...workout };
      if (!updatedWorkout.days) updatedWorkout.days = [];
      updatedWorkout.days.push(res.data);
      setWorkout(updatedWorkout);
      setSelectedDayIndex(updatedWorkout.days.length - 1);
    } catch (err) {
      console.error('Erro ao criar novo dia de treino no banco.', err);
    }
  };

  // Excluir o dia de treino inteiro do banco
  const handleDeleteDay = async () => {
    const day = workout.days[selectedDayIndex];

    if (workout.days.length <= 1) {
      return alert('Você precisa de pelo menos 1 dia de treino estruturado.');
    }
    if (window.confirm(`Deseja excluir permanentemente o "${day.name}"?`)) {
      try {
        await axios.delete(`/api/workout/day/${day.id}`);
        const updatedWorkout = { ...workout };
        updatedWorkout.days.splice(selectedDayIndex, 1);
        setWorkout(updatedWorkout);
        setSelectedDayIndex(0);
      } catch (err) {
        console.error('Erro ao excluir dia de treino no banco.', err);
      }
    }
  };

  // Filtragem para o modal de busca de exercícios
  const filteredExercises = exercisesDatabase.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimerTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activeDay = workout?.days?.[selectedDayIndex];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* Cabeçalho da Seção de Treinos */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-blue-500" />
            Estrutura de Treino
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Plano ativo: <strong className="text-zinc-900 dark:text-zinc-100">{workout?.name || 'Montagem Livre'}</strong>
          </p>
        </div>

        {/* Escolha Rápida de Presets */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePresetSelect('fullbody3x')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Preset 3x (FB)
          </button>
          <button
            onClick={() => handlePresetSelect('upperlower4x')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Preset 4x (UL)
          </button>
          <button
            onClick={() => handlePresetSelect('ppl6x')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Preset 6x (PPL)
          </button>
        </div>
      </div>

      {/* Timer Flutuante Ativo */}
      {timerActive && (
        <div className="fixed bottom-6 right-6 bg-zinc-950 text-white rounded-2xl border border-zinc-800 shadow-2xl p-4 flex items-center gap-4 z-50 animate-bounce">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full border-2 border-blue-500">
            <Timer className="w-5 h-5 text-blue-400 absolute" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wide">Descanso</span>
            <span className="font-mono text-2xl font-black">{formatTimerTime(timerSecondsLeft)}</span>
          </div>
          <button 
            onClick={() => setTimerActive(false)}
            className="p-2 hover:bg-zinc-800 rounded-xl text-rose-500"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navegação entre dias de treino */}
      {workout?.days && workout.days.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          {workout.days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (isExecuting) {
                  if (window.confirm('Você está executando outro treino. Mudar de aba perderá seu progresso de execução atual.')) {
                    setIsExecuting(false);
                    setSelectedDayIndex(idx);
                  }
                } else {
                  setSelectedDayIndex(idx);
                }
              }}
              className={`px-4 py-2 text-sm font-bold rounded-xl border transition-all ${
                selectedDayIndex === idx
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {day.name.split(':')[0]}
            </button>
          ))}
          {!isExecuting && (
            <button
              onClick={handleAddNewDay}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
            >
              <Plus className="w-4 h-4" /> Adicionar Dia
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <Dumbbell className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
          <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200">Nenhum dia de treino</h3>
          <button onClick={handleAddNewDay} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
            Criar Treino A
          </button>
        </div>
      )}

      {/* Visão do Dia Selecionado */}
      {activeDay && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card Principal: Exercícios */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                    {activeDay.name}
                  </h3>
                  <span className="text-xs text-zinc-500 font-medium">
                    {activeDay.exercises.length} exercícios cadastrados
                  </span>
                </div>
                {!isExecuting ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteDay}
                      className="text-xs border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 px-3 py-2 rounded-xl font-semibold transition-all"
                    >
                      Excluir Dia
                    </button>
                    {activeDay.exercises.length > 0 && (
                      <button
                        onClick={handleStartWorkout}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all"
                      >
                        <Play className="w-3.5 h-3.5" /> Iniciar Treino
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelWorkout}
                      className="text-xs border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 px-3 py-2 rounded-xl font-bold transition-all"
                    >
                      Cancelar Sessão
                    </button>
                    <button
                      onClick={handleFinishWorkout}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> Finalizar Treino
                    </button>
                  </div>
                )}
              </div>

              {/* Lista de Exercícios */}
              {activeDay.exercises.length > 0 ? (
                <div className="space-y-4">
                  {activeDay.exercises.map((ex, exIdx) => (
                    <div 
                      key={exIdx}
                      className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4 hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-lg shrink-0 mt-0.5">
                            <Dumbbell className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{ex.name}</h4>
                            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mt-0.5">
                              {ex.sets} séries × {ex.reps} repetições | Descanso: {ex.rest}s
                            </span>
                          </div>
                        </div>
                        {!isExecuting && (
                          <button
                            onClick={() => handleDeleteExercise(exIdx)}
                            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Configuração de Carga ou Caixa de Marcação */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                        {/* Ajuste de Carga */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-500">Carga Utilizada:</span>
                          <div className="relative w-24">
                            <input
                              type="number"
                              placeholder="0"
                              disabled={isExecuting}
                              value={exerciseWeights[exIdx] !== undefined ? exerciseWeights[exIdx] : ''}
                              onChange={(e) => handleWeightChange(exIdx, e.target.value)}
                              className="w-full text-xs font-semibold font-mono bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="absolute right-2 top-2 text-[10px] text-zinc-400">kg</span>
                          </div>
                        </div>

                        {/* Visualização e Checklist de Sets no modo Execução */}
                        {isExecuting ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: ex.sets }).map((_, setIdx) => {
                              const isSetDone = completedSets[`${exIdx}-${setIdx}`];
                              return (
                                <button
                                  key={setIdx}
                                  onClick={() => toggleSetComplete(exIdx, setIdx, ex.rest)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${
                                    isSetDone
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-500 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950'
                                  }`}
                                >
                                  {isSetDone ? <Check className="w-3.5 h-3.5" /> : setIdx + 1}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            {Array.from({ length: ex.sets }).map((_, setIdx) => (
                              <span 
                                key={setIdx}
                                className="w-5 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800"
                              ></span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400 space-y-2">
                  <p className="text-sm">Nenhum exercício cadastrado para este dia de treino.</p>
                  {!isExecuting && (
                    <button
                      onClick={() => setShowAddExerciseModal(true)}
                      className="bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-bold px-3 py-2 rounded-xl border"
                    >
                      Adicionar Primeiro Exercício
                    </button>
                  )}
                </div>
              )}

              {/* Botão de Adição no Rodapé do Bloco de Exercícios */}
              {!isExecuting && (
                <button
                  onClick={() => setShowAddExerciseModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 border border-dashed border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm font-semibold text-zinc-500 rounded-xl py-3 mt-4 transition-all"
                >
                  <PlusCircle className="w-4 h-4 text-blue-500" /> Adicionar Exercício
                </button>
              )}
            </div>
          </div>

          {/* Dicas e Progresso Lateral */}
          <div className="space-y-6">
            
            {/* Card informativo de execução */}
            {isExecuting && (
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-md space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Timer className="w-5 h-5 animate-pulse" />
                  Sessão em Andamento
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Basta clicar no número correspondente à série ao concluí-la. Um timer de descanso começará para te guiar na recuperação.
                </p>
                <div className="border-t border-blue-400/30 pt-3 flex justify-between text-xs">
                  <span>Séries concluídas:</span>
                  <span className="font-mono font-bold">
                    {Object.values(completedSets).filter(Boolean).length} totais
                  </span>
                </div>
              </div>
            )}

            {/* Dica da IA para Treinos */}
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-md font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Dica de Carga (Progressão)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Tente anotar suas cargas em cada treino. A progressão de carga (aumentar levemente o peso ou as repetições ao longo das semanas) é o fator mais importante para a hipertrofia e manutenção muscular.
              </p>
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-xl flex gap-3 text-[11px] text-zinc-500 leading-relaxed">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>O timer de descanso ideal é de 60 a 90 segundos para isoladores, e de 90 a 120 segundos para multiarticulares pesados.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ADICIONAR EXERCÍCIO */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-xl p-6 flex flex-col max-h-[85vh]">
            
            {/* Título & Fechar */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Adicionar Exercício</h3>
              <button 
                onClick={() => setShowAddExerciseModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Inputs de Série e Repetição antes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Séries</label>
                <input 
                  type="number"
                  value={newExerciseForm.sets}
                  onChange={(e) => setNewExerciseForm(prev => ({ ...prev, sets: parseInt(e.target.value) }))}
                  className="w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Reps</label>
                <input 
                  type="text"
                  value={newExerciseForm.reps}
                  onChange={(e) => setNewExerciseForm(prev => ({ ...prev, reps: e.target.value }))}
                  className="w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Descanso (s)</label>
                <input 
                  type="number"
                  value={newExerciseForm.rest}
                  onChange={(e) => setNewExerciseForm(prev => ({ ...prev, rest: parseInt(e.target.value) }))}
                  className="w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase">Carga (kg)</label>
                <input 
                  type="number"
                  value={newExerciseForm.weight}
                  onChange={(e) => setNewExerciseForm(prev => ({ ...prev, weight: parseFloat(e.target.value) }))}
                  className="w-full mt-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Criar exercício personalizado rápido se não achar */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Pesquisar exercício na biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Lista dos Exercícios na Base para Escolha */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 bg-zinc-50/20 dark:bg-zinc-950/20">
              {filteredExercises.length > 0 ? (
                filteredExercises.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddExercise(ex)}
                    className="w-full text-left p-3 border border-zinc-100 dark:border-zinc-800 hover:border-blue-500 rounded-xl flex justify-between items-center bg-white dark:bg-zinc-900 transition-all"
                  >
                    <div>
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">{ex.name}</span>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 block">{ex.category}</span>
                    </div>
                    <span className="text-xs text-blue-500 font-bold">+ Selecionar</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-zinc-400 space-y-3">
                  <p>Nenhum exercício encontrado com "{searchQuery}".</p>
                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-2 text-left">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Criar Exercício Customizado</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome do novo exercício..."
                        value={newExerciseForm.name}
                        onChange={(e) => setNewExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      <button
                        onClick={handleCreateCustomExercise}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
                      >
                        Criar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-3 flex justify-end">
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-700 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
