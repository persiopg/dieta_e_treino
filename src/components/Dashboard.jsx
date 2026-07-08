import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from '../utils/translations';
import { 
  Droplet, 
  Flame, 
  Dumbbell, 
  Apple, 
  RotateCcw,
  CheckCircle,
  Plus,
  Trash2,
  PlusCircle,
  Search,
  Check,
  Info,
  RefreshCw,
  Scale,
  HelpCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { initialFoodDatabase } from '../data/foodDatabase';

export default function Dashboard({ 
  profile, 
  setProfile,
  diet, 
  workout, 
  activeTab, 
  setActiveTab, 
  waterIntake, 
  setWaterIntake, 
  workoutDoneToday, 
  setWorkoutDoneToday,
  workoutCaloriesToday = 0,
  workoutDurationToday = 0,
  lang = 'pt',
  activeDate,
  setActiveDate,
  dietLogs = [],
  onRefreshData
}) {
  const [weightInput, setWeightInput] = useState(profile?.weight || '');
  const [weightSuccess, setWeightSuccess] = useState(false);
  
  // Estados locais do Diário Alimentar
  const [copyingPlan, setCopyingPlan] = useState(false);
  const [selectedMealForAdd, setSelectedMealForAdd] = useState(null); // Refeição ativa para adicionar item
  const [searchTerm, setSearchTerm] = useState('');
  const [foodQuantity, setFoodQuantity] = useState('100');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  
  // Estados para Substituição por Equivalência
  const [substitutingItem, setSubstitutingItem] = useState(null);
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [substituteSearchResults, setSubstituteSearchResults] = useState([]);
  const [selectedSubstituteFood, setSelectedSubstituteFood] = useState(null);
  
  // Estado local para Comparativos Nutricionais
  const [compareData, setCompareData] = useState(null);
  
  // Estado local de treino concluído no dia (nome do treino concluído)
  const [loggedWorkoutName, setLoggedWorkoutName] = useState(null);

  // Estado local para Modal de edição de quantidade
  const [editingLogItem, setEditingLogItem] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  // Fallback se o perfil não estiver configurado
  useEffect(() => {
    if (profile?.weight) {
      setWeightInput(profile.weight);
    }
  }, [profile]);

  // Carregar dados de comparação nutricional (Hoje x Ontem)
  useEffect(() => {
    const fetchCompareData = async () => {
      if (!profile) return;
      try {
        const res = await axios.get(`/api/tracker/diet/compare?date=${activeDate}`);
        setCompareData(res.data);
      } catch (err) {
        console.error('Erro ao buscar comparativo nutricional:', err);
      }
    };

    const fetchWorkoutLog = async () => {
      try {
        const res = await axios.get(`/api/tracker/workout-done?date=${activeDate}`);
        if (res.data.isDone) {
          setLoggedWorkoutName(res.data.workout_day_name);
        } else {
          setLoggedWorkoutName(null);
        }
      } catch (err) {
        console.error('Erro ao buscar log de treino:', err);
      }
    };

    fetchCompareData();
    fetchWorkoutLog();
  }, [activeDate, dietLogs, workoutDoneToday, profile]);

  // Buscar alimentos conforme digita
  useEffect(() => {
    let active = true;
    const searchFoods = async () => {
      if (searchTerm.trim() === '') {
        setSearchResults([]);
        return;
      }
      try {
        const res = await axios.get('/api/foods', { params: { q: searchTerm } });
        if (active) {
          setSearchResults(res.data.slice(0, 15));
        }
      } catch (err) {
        console.error('Erro ao buscar alimentos da API:', err);
        // Fallback local
        const filtered = initialFoodDatabase.filter(food => 
          food.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 15);
        if (active) setSearchResults(filtered);
      }
    };

    searchFoods();
    return () => { active = false; };
  }, [searchTerm]);

  // Buscar alimentos para substituição conforme digita
  useEffect(() => {
    let active = true;
    const searchSubstituteFoods = async () => {
      if (substituteSearchTerm.trim() === '') {
        setSubstituteSearchResults([]);
        return;
      }
      try {
        const res = await axios.get('/api/foods', { params: { q: substituteSearchTerm } });
        if (active) {
          setSubstituteSearchResults(res.data.slice(0, 15));
        }
      } catch (err) {
        console.error('Erro ao buscar alimentos da API:', err);
        // Fallback local
        const filtered = initialFoodDatabase.filter(food => 
          food.name.toLowerCase().includes(substituteSearchTerm.toLowerCase())
        ).slice(0, 15);
        if (active) setSubstituteSearchResults(filtered);
      }
    };

    searchSubstituteFoods();
    return () => { active = false; };
  }, [substituteSearchTerm]);

  if (!profile) {
    return (
      <div className="text-center py-12 space-y-4">
        <HelpCircle className="w-16 h-16 text-zinc-400 mx-auto" />
        <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">Você ainda não configurou seu planejamento</h3>
        <p className="text-zinc-500 max-w-sm mx-auto">Calcule suas necessidades de treino e dieta para desbloquear seu painel de controle.</p>
        <button
          onClick={() => setActiveTab('wizard')}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-xl shadow-sm transition-all"
        >
          Iniciar Assistente
        </button>
      </div>
    );
  }

  // Navegação de Datas
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

  const handleSetToday = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setActiveDate(`${year}-${month}-${day}`);
  };

  const formatDateDisplay = (dateStr) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dateStr === todayStr) {
      return lang === 'pt' ? 'Hoje' : 'Today';
    } else if (dateStr === yesterdayStr) {
      return lang === 'pt' ? 'Ontem' : 'Yesterday';
    } else {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' });
    }
  };

  // Cálculos de Água
  const waterTarget = profile.weight ? profile.weight * 35 : 2500;
  const waterPercentage = Math.min(Math.round((waterIntake / waterTarget) * 100), 100);

  // Cálculos de Nutrição com base no diário real (dietLogs)
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;
  let consumedCalories = 0;

  if (dietLogs && dietLogs.length > 0) {
    dietLogs.forEach(item => {
      consumedProtein += Math.round(Number(item.protein || 0));
      consumedCarbs += Math.round(Number(item.carbs || 0));
      consumedFat += Math.round(Number(item.fat || 0));
      consumedCalories += Math.round(Number(item.calories || 0));
    });
  }

  const netCalories = consumedCalories - workoutCaloriesToday;
  const caloriePercentage = Math.min(Math.round((netCalories / profile.targetCalories) * 100), 100);
  const proteinPercentage = Math.min(Math.round((consumedProtein / profile.macros.protein) * 100), 100);
  const carbsPercentage = Math.min(Math.round((consumedCarbs / profile.macros.carbs) * 100), 100);
  const fatPercentage = Math.min(Math.round((consumedFat / profile.macros.fat) * 100), 100);
  const remainingCalories = profile.targetCalories - netCalories;

  // Frase de conselho dinâmico da IA
  const getAiMessage = () => {
    if (lang === 'en') {
      if (waterPercentage < 50) {
        return {
          text: 'Remember to drink water! Proper hydration helps with protein synthesis and fat loss.',
          variant: 'warning'
        };
      }
      if (!workoutDoneToday) {
        return {
          text: `How about doing today's workout? The active routine is "${workout?.name || 'Workout'}".`,
          variant: 'info'
        };
      }
      if (caloriePercentage > 95 && caloriePercentage <= 105) {
        return {
          text: 'Excellent! You hit your daily calorie target almost perfectly.',
          variant: 'success'
        };
      }
      if (caloriePercentage > 105) {
        return {
          text: 'You exceeded your planned calories. Adjust your next meals or increase energy expenditure.',
          variant: 'danger'
        };
      }
      return {
        text: 'Your day is going great! Keep logging your meals to stay focused on the goal.',
        variant: 'success'
      };
    } else {
      if (waterPercentage < 50) {
        return {
          text: 'Lembre-se de beber água! A hidratação adequada ajuda na síntese proteica e na queima de gordura.',
          variant: 'warning'
        };
      }
      if (!workoutDoneToday) {
        return {
          text: `Que tal realizar seu treino de hoje? Sua ficha atual é "${workout?.name || 'Treino'}".`,
          variant: 'info'
        };
      }
      if (caloriePercentage > 95 && caloriePercentage <= 105) {
        return {
          text: 'Excelente! Você bateu a sua meta calórica diária quase perfeitamente.',
          variant: 'success'
        };
      }
      if (caloriePercentage > 105) {
        return {
          text: 'Você ultrapassou as calorias planejadas. Ajuste as próximas refeições ou aumente o gasto calórico.',
          variant: 'danger'
        };
      }
      return {
        text: 'Seu dia está indo muito bem! Continue registrando suas refeições para manter o foco na meta.',
        variant: 'success'
      };
    }
  };

  const aiMessage = getAiMessage();

  // Ações de Água (Envia direto para a API e atualiza)
  const handleQuickWaterAdd = async (amount) => {
    try {
      const newVal = waterIntake + amount;
      setWaterIntake(newVal);
      await axios.post('/api/tracker/water', { amount_ml: newVal, date: activeDate });
    } catch (err) {
      console.error(err);
      setWaterIntake(waterIntake);
    }
  };

  const handleWaterReset = async () => {
    try {
      setWaterIntake(0);
      await axios.post('/api/tracker/water', { amount_ml: 0, date: activeDate });
    } catch (err) {
      console.error(err);
      setWaterIntake(waterIntake);
    }
  };

  // Copiar plano base de refeições para o diário
  const handleCopyPlan = async () => {
    setCopyingPlan(true);
    try {
      await axios.post('/api/tracker/diet/copy-plan', { date: activeDate });
      onRefreshData();
    } catch (err) {
      console.error('Erro ao importar planejamento:', err);
      alert('Erro ao importar planejamento de dieta.');
    } finally {
      setCopyingPlan(false);
    }
  };

  // Alterar quantidade de alimento no diário (+/-)
  const handleAdjustLogQuantity = async (logItem, multiplier) => {
    const factor = multiplier === 'increment' ? 1.25 : 0.75;
    const newQty = Math.max(10, Math.round(logItem.quantity * factor));
    const ratio = newQty / logItem.quantity;
    
    try {
      await axios.put(`/api/tracker/diet/${logItem.id}`, {
        quantity: newQty,
        protein: logItem.protein * ratio,
        carbs: logItem.carbs * ratio,
        fat: logItem.fat * ratio,
        calories: logItem.calories * ratio
      });
      onRefreshData();
    } catch (err) {
      console.error('Erro ao ajustar quantidade do alimento:', err);
    }
  };

  // Abrir Modal de edição de quantidade
  const handleEditLogQuantityDirectly = (logItem) => {
    setEditingLogItem(logItem);
    setEditingQuantity(Math.round(logItem.quantity).toString());
  };

  // Salvar a nova quantidade digitada no Modal
  const handleSaveQuantityModal = async (e) => {
    if (e) e.preventDefault();
    if (!editingLogItem) return;
    
    const newQty = Number(editingQuantity);
    if (isNaN(newQty) || newQty <= 0) {
      alert(
        lang === 'pt' 
          ? 'Por favor, insira um número válido maior que 0.' 
          : 'Please enter a valid number greater than 0.'
      );
      return;
    }
    
    const ratio = newQty / editingLogItem.quantity;
    
    try {
      await axios.put(`/api/tracker/diet/${editingLogItem.id}`, {
        food_name: editingLogItem.food_name,
        quantity: newQty,
        protein: editingLogItem.protein * ratio,
        carbs: editingLogItem.carbs * ratio,
        fat: editingLogItem.fat * ratio,
        calories: editingLogItem.calories * ratio
      });
      onRefreshData();
      setEditingLogItem(null);
    } catch (err) {
      console.error('Erro ao ajustar quantidade do alimento:', err);
    }
  };

  // Excluir alimento do diário
  const handleDeleteLogItem = async (id) => {
    try {
      await axios.delete(`/api/tracker/diet/${id}`);
      onRefreshData();
    } catch (err) {
      console.error('Erro ao excluir item do diário:', err);
    }
  };

  // Adicionar alimento avulso no diário
  const handleAddFoodToLog = async (e) => {
    e.preventDefault();
    if (!selectedFood || !selectedMealForAdd || Number(foodQuantity) <= 0) return;

    const qty = Number(foodQuantity);
    const ratio = qty / 100;

    try {
      await axios.post('/api/tracker/diet', {
        meal_name: selectedMealForAdd,
        food_name: selectedFood.name,
        quantity: qty,
        protein: selectedFood.protein * ratio,
        carbs: selectedFood.carbs * ratio,
        fat: selectedFood.fat * ratio,
        calories: selectedFood.calories * ratio,
        date: activeDate
      });
      
      // Limpar form
      setSelectedFood(null);
      setSearchTerm('');
      setFoodQuantity('100');
      setSelectedMealForAdd(null);
      
      onRefreshData();
    } catch (err) {
      console.error('Erro ao adicionar alimento no diário:', err);
      alert('Erro ao registrar alimento.');
    }
  };

  // Substituir alimento do diário por outro com equivalência calórica
  const handleReplaceFoodWithEquivalent = async (e) => {
    e.preventDefault();
    if (!substitutingItem || !selectedSubstituteFood) return;

    // Calcular quantidade equivalente
    // Q_nova = (Calorias_originais * 100) / Calorias_100g_nova
    const originalCalories = substitutingItem.calories;
    const newFoodCal100g = selectedSubstituteFood.calories;
    
    if (newFoodCal100g <= 0) {
      alert(lang === 'pt' ? 'Alimento equivalente inválido (calorias igual a zero).' : 'Invalid equivalent food (zero calories).');
      return;
    }

    const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
    const ratio = equivalentQuantity / 100;

    try {
      await axios.put(`/api/tracker/diet/${substitutingItem.id}`, {
        food_name: selectedSubstituteFood.name,
        quantity: equivalentQuantity,
        protein: selectedSubstituteFood.protein * ratio,
        carbs: selectedSubstituteFood.carbs * ratio,
        fat: selectedSubstituteFood.fat * ratio,
        calories: originalCalories, // Mantém a mesma caloria exata
      });

      // Limpar estados
      setSubstitutingItem(null);
      setSubstituteSearchTerm('');
      setSelectedSubstituteFood(null);
      
      onRefreshData();
    } catch (err) {
      console.error('Erro ao substituir alimento por equivalente:', err);
      alert(lang === 'pt' ? 'Erro ao substituir alimento.' : 'Error replacing food.');
    }
  };

  // Registrar conclusão de treinos dinâmicos
  const handleWorkoutCheckIn = async (workoutName) => {
    try {
      const isDone = workoutName !== 'Descanso' && workoutName !== null;
      setLoggedWorkoutName(workoutName);
      setWorkoutDoneToday(isDone);
      
      let durationMinutes = 60;
      if (isDone) {
        const val = window.prompt(lang === 'pt' ? 'Quantos minutos durou seu treino?' : 'How many minutes did your workout last?', '60');
        if (val) {
          const num = Number(val);
          if (!isNaN(num) && num > 0) {
            durationMinutes = num;
          }
        }
      }
      
      await axios.post('/api/tracker/workout-done', {
        workout_day_name: workoutName || 'Descanso',
        date: activeDate,
        isDone: workoutName !== null,
        duration_minutes: durationMinutes
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Erro ao registrar treino:', err);
    }
  };

  // Agrupamento dos itens de diário alimentar por refeição baseado no perfil do usuário
  const mealsPerDay = profile?.mealsPerDay || 4;
  let mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'];
  
  if (mealsPerDay === 3) {
    mealsStructure = ['Café da Manhã', 'Almoço', 'Jantar'];
  } else if (mealsPerDay === 5) {
    mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'];
  } else if (mealsPerDay === 6) {
    mealsStructure = ['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'];
  }

  const groupedDietLogs = {};
  mealsStructure.forEach(meal => {
    groupedDietLogs[meal] = dietLogs.filter(log => log.meal_name === meal);
  });
  
  // Captura refeições do plano base que possam ser diferentes das estruturadas por padrão
  if (dietLogs) {
    dietLogs.forEach(log => {
      if (!mealsStructure.includes(log.meal_name)) {
        if (!groupedDietLogs[log.meal_name]) {
          groupedDietLogs[log.meal_name] = [];
        }
        groupedDietLogs[log.meal_name].push(log);
      }
    });
  }

  // Lista de treinos cadastrados do usuário para o seletor rápido
  const availableWorkouts = [];
  if (workout && workout.days) {
    workout.days.forEach(day => {
      availableWorkouts.push(day.name);
    });
  }
  if (availableWorkouts.length === 0) {
    availableWorkouts.push('Treino A', 'Treino B');
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 pb-24">
      
      {/* Cabeçalho com Navegação de Data */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            {translations[lang].welcome} {profile?.gender === 'female' || profile?.gender === 'feminino' ? translations[lang].campea : translations[lang].campeao}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'pt' ? 'Gerencie e compare suas rotinas diárias com facilidade.' : 'Manage and compare your daily metrics easily.'}
          </p>
        </div>
        
        {/* Seletor de Data */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 shadow-sm">
          <button 
            onClick={handlePrevDay}
            className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400"
            title={lang === 'pt' ? 'Dia anterior' : 'Previous day'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="px-3 text-xs font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 select-none min-w-[120px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>{formatDateDisplay(activeDate)}</span>
          </div>

          <button 
            onClick={handleNextDay}
            className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-zinc-600 dark:text-zinc-400"
            title={lang === 'pt' ? 'Próximo dia' : 'Next day'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {activeDate !== new Date().toISOString().split('T')[0] && (
            <button
              onClick={handleSetToday}
              className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-bold uppercase transition-all"
            >
              {lang === 'pt' ? 'Hoje' : 'Today'}
            </button>
          )}
        </div>
      </div>

      {/* Caixa de Mensagem Inteligente (AI Insight) */}
      <div className={`p-4 rounded-xl border flex gap-3 items-start transition-all ${
        aiMessage.variant === 'warning' ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300' :
        aiMessage.variant === 'danger' ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300' :
        aiMessage.variant === 'info' ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-300' :
        'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
      }`}>
        <div className="p-1 rounded bg-white dark:bg-zinc-900 border shadow-sm flex-shrink-0">
          <Sparkles className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider block mb-0.5">{translations[lang].insightTitle}</span>
          <p className="text-sm leading-relaxed font-medium">{aiMessage.text}</p>
        </div>
      </div>

      {/* Grid de KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* KPI: Calorias Líquidas */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2 col-span-1 md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center text-zinc-500">
              <span className="text-xs font-bold uppercase tracking-wide">
                {lang === 'pt' ? 'Balanço Calórico Líquido' : 'Net Calories'}
              </span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>

            <div className="grid grid-cols-3 gap-2 py-1 text-center border-b border-zinc-100 dark:border-zinc-850 pb-2 mt-2">
              <div>
                <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Alimentação</span>
                <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-50">{consumedCalories}</span>
                <span className="text-[8px] text-zinc-400 font-bold block -mt-1">kcal</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-405 uppercase font-black tracking-wider block">Exercício</span>
                <span className="font-mono text-base font-bold text-emerald-500">- {workoutCaloriesToday}</span>
                <span className="text-[8px] text-zinc-400 font-bold block -mt-1">kcal</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-405 uppercase font-black tracking-wider block">Saldo Líquido</span>
                <span className="font-mono text-base font-bold text-indigo-500">{netCalories}</span>
                <span className="text-[8px] text-zinc-400 font-bold block -mt-1">/ {profile.targetCalories}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1 mt-2">
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all" style={{ width: `${caloriePercentage}%` }}></div>
            </div>
            <div className="text-[10px] font-semibold text-zinc-500 flex justify-between">
              <span>{caloriePercentage}% {lang === 'pt' ? 'da meta' : 'of goal'}</span>
              <span className={remainingCalories >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {remainingCalories >= 0 
                  ? `${remainingCalories} ${lang === 'pt' ? 'kcal livres' : 'kcal free'}` 
                  : `${Math.abs(remainingCalories)} ${lang === 'pt' ? 'kcal acima' : 'kcal over'}`}
              </span>
            </div>
          </div>
        </div>

        {/* KPI: Água */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">{lang === 'pt' ? 'Hidratação Diária' : 'Daily Hydration'}</span>
            <Droplet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">{waterIntake}</span>
            <span className="text-xs text-zinc-400 font-medium">/ {Math.round(waterTarget)} ml</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all animate-pulse" style={{ width: `${waterPercentage}%` }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{waterPercentage}% {lang === 'pt' ? 'da meta' : 'of goal'}</span>
            <span>{lang === 'pt' ? 'Meta' : 'Goal'}: {(waterTarget / 1000).toFixed(1)}L</span>
          </div>
        </div>

        {/* KPI: Treino */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">{lang === 'pt' ? 'Treino Concluído' : 'Workout Done'}</span>
            <Dumbbell className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 py-1">
            {loggedWorkoutName ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="truncate max-w-[150px]">{loggedWorkoutName}</span>
              </div>
            ) : (
              <div className="text-zinc-505 dark:text-zinc-400 font-bold text-md italic">
                {lang === 'pt' ? 'Nenhum Marcado' : 'No workout logged'}
              </div>
            )}
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${loggedWorkoutName ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} style={{ width: loggedWorkoutName ? '100%' : '0%' }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{loggedWorkoutName ? (lang === 'pt' ? 'Registrado!' : 'Logged!') : (lang === 'pt' ? 'Aguardando registro' : 'Awaiting entry')}</span>
            <button 
              onClick={() => setActiveTab('workout')} 
              className="text-blue-500 hover:underline font-bold text-[11px]"
            >
              {lang === 'pt' ? 'Fichas' : 'Workouts'}
            </button>
          </div>
        </div>

        {/* KPI: Peso Atual */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">{translations[lang].currentWeight}</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between w-full">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">{profile.weight}</span>
              <span className="text-xs text-zinc-400 font-medium">kg</span>
            </div>
            <button 
              onClick={() => {
                const newW = window.prompt(lang === 'pt' ? 'Digite o seu peso atual (em kg):' : 'Enter your current weight (in kg):', profile.weight);
                if (newW && Number(newW) > 0) {
                  setProfile({
                    ...profile,
                    weight: Number(newW)
                  });
                  setWeightSuccess(true);
                  setTimeout(() => setWeightSuccess(false), 3000);
                }
              }}
              className="text-xs text-indigo-500 hover:underline font-bold"
            >
              {translations[lang].weightBtn}
            </button>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{translations[lang].goal}:</span>
            <span className="capitalize font-bold text-indigo-500 text-[10px]">{translations[lang][profile.goal] || profile.goal}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal Dividido: Diário Alimentar vs Inteligência */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: DIÁRIO ALIMENTAR DIÁRIO */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Apple className="w-5 h-5 text-rose-500" />
                {lang === 'pt' ? 'Diário Alimentar do Dia' : 'Daily Food Diary'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'pt' ? 'Ajuste sua alimentação real de hoje sem perder seu planejamento original.' : 'Edit your real food intake without changing your core meal plan.'}
              </p>
            </div>
            {dietLogs.length === 0 && (
              <button
                onClick={handleCopyPlan}
                disabled={copyingPlan}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {copyingPlan ? (lang === 'pt' ? 'Copiando...' : 'Copying...') : (lang === 'pt' ? 'Importar Plano Base' : 'Import Base Plan')}
              </button>
            )}
          </div>

          {/* Seletor de Refeição ativa para Adicionar Alimento */}
          {selectedMealForAdd && (
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  {lang === 'pt' ? `Adicionar ao ${selectedMealForAdd}` : `Add to ${selectedMealForAdd}`}
                </span>
                <button 
                  onClick={() => { setSelectedMealForAdd(null); setSelectedFood(null); setSearchTerm(''); }}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>

              <form onSubmit={handleAddFoodToLog} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                {/* Busca */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    {lang === 'pt' ? 'Buscar Alimento' : 'Search Food'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder={lang === 'pt' ? "Digite aveia, frango, arroz..." : "Type chicken, oats, rice..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Resultados da busca */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-20 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg mt-1 w-full max-w-[400px] overflow-hidden">
                      {searchResults.map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => {
                            setSelectedFood(food);
                            setSearchTerm(food.name);
                            setSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-900 last:border-0 block"
                        >
                          <span className="font-bold">{food.name}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{food.calories} kcal / 100g (P: {food.protein}g C: {food.carbs}g G: {food.fat}g)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantidade */}
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      {lang === 'pt' ? 'Quantidade (g)' : 'Qty (g)'}
                    </label>
                    <input
                      type="number"
                      value={foodQuantity}
                      onChange={(e) => setFoodQuantity(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all h-[38px] cursor-pointer"
                  >
                    {lang === 'pt' ? 'Adicionar' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          )}



          {/* Listagem das Refeições do Diário */}
          <div className="space-y-6">
            {dietLogs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3.5">
                <Apple className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Diário Alimentar Vazio</h4>
                  <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mt-1">Registre o que comeu hoje para poder comparar sua ingestão nutricional.</p>
                </div>
                <button
                  onClick={handleCopyPlan}
                  disabled={copyingPlan}
                  className="mx-auto px-4 py-2 text-xs font-bold rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {lang === 'pt' ? 'Registrar Plano Base para Hoje' : 'Use Base Plan for Today'}
                </button>
              </div>
            ) : (
              (() => {
                const activeMealsList = [...mealsStructure];
                dietLogs.forEach(log => {
                  if (!activeMealsList.includes(log.meal_name)) {
                    activeMealsList.push(log.meal_name);
                  }
                });

                return activeMealsList.map((mealName) => {
                  const logs = groupedDietLogs[mealName] || [];
                  let mealCal = 0;
                  logs.forEach(l => mealCal += Math.round(Number(l.calories)));

                  return (
                    <div key={mealName} className="border border-zinc-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm bg-zinc-50/10 dark:bg-transparent">
                      {/* Header da Refeição no diário */}
                      <div className="px-4 py-3 bg-zinc-50 dark:bg-[#121216] border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <div>
                          <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{mealName}</span>
                          <span className="text-[10px] text-zinc-400 font-medium ml-2">({logs.length} {lang === 'pt' ? 'itens' : 'items'})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">{mealCal} kcal</span>
                          <button
                            onClick={() => setSelectedMealForAdd(mealName)}
                            className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                            title={lang === 'pt' ? 'Adicionar Alimento' : 'Add Food'}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Itens da Refeição no diário */}
                      <div className="p-4 space-y-3">
                        {logs.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic py-1">{lang === 'pt' ? 'Nenhum alimento registrado nesta refeição.' : 'No foods logged for this meal.'}</p>
                        ) : (
                          <div className="space-y-3.5">
                            {logs.map((item) => (
                              <div key={item.id} className="flex justify-between items-start gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0 last:pb-0">
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{item.food_name}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                    {item.food_name?.toLowerCase().includes('ovo') && (
                                      <>
                                        <span className="font-bold text-blue-500 dark:text-blue-400">
                                          ~{(Number(item.quantity) / 50).toFixed(1).replace('.0', '')} {lang === 'pt' ? 'unid' : 'units'}
                                        </span>
                                        <span>•</span>
                                      </>
                                    )}
                                    <span>P: {Math.round(item.protein)}g</span>
                                    <span>•</span>
                                    <span>C: {Math.round(item.carbs)}g</span>
                                    <span>•</span>
                                    <span>G: {Math.round(item.fat)}g</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3.5">
                                  <span className="font-mono font-extrabold text-xs text-zinc-900 dark:text-zinc-100">{Math.round(item.calories)} kcal</span>
                                  
                                  {/* Controles de ajuste rápido (+/-) */}
                                  <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                                    <button
                                      onClick={() => handleAdjustLogQuantity(item, 'decrement')}
                                      className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <button
                                       onClick={() => handleEditLogQuantityDirectly(item)}
                                       className="px-2.5 py-1 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 border-x border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-500 transition-colors cursor-pointer"
                                       title={lang === 'pt' ? 'Clique para alterar a quantidade' : 'Click to edit quantity'}
                                     >
                                       {Number(item.quantity).toFixed(0)}g
                                     </button>
                                    <button
                                      onClick={() => handleAdjustLogQuantity(item, 'increment')}
                                      className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setSubstitutingItem(item);
                                      setSubstituteSearchTerm('');
                                      setSelectedSubstituteFood(null);
                                      setSelectedMealForAdd(null);
                                    }}
                                    className="text-zinc-400 hover:text-indigo-500 p-1"
                                    title={lang === 'pt' ? 'Trocar por Equivalente' : 'Swap for Equivalent'}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteLogItem(item.id)}
                                    className="text-zinc-400 hover:text-rose-500 p-1"
                                    title="Remover"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>

          {/* Macros Totais Sugeridos vs Consumidos */}
          {dietLogs.length > 0 && (
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">{lang === 'pt' ? 'Métricas de Ingestão do Dia' : 'Daily Nutrient Summary'}</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Proteínas */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-zinc-500">
                    <span>{translations[lang].protein}</span>
                    <span className="font-mono font-bold text-rose-500">{consumedProtein}g / {profile.macros.protein}g</span>
                  </div>
                  <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${proteinPercentage}%` }}></div>
                  </div>
                </div>

                {/* Carboidratos */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-zinc-500">
                    <span>{translations[lang].carbs}</span>
                    <span className="font-mono font-bold text-blue-500">{consumedCarbs}g / {profile.macros.carbs}g</span>
                  </div>
                  <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${carbsPercentage}%` }}></div>
                  </div>
                </div>

                {/* Gorduras */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-zinc-500">
                    <span>{translations[lang].fat}</span>
                    <span className="font-mono font-bold text-amber-500">{consumedFat}g / {profile.macros.fat}g</span>
                  </div>
                  <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${fatPercentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: CHECK-IN DE TREINOS & INTELIGÊNCIA */}
        <div className="space-y-6">
          
          {/* CARD 1: CHECK-IN DE TREINO FLEXÍVEL */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-500" />
                {lang === 'pt' ? 'Check-in de Treino' : 'Workout Check-in'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'pt' ? 'Qual rotina você executou nesta data?' : 'Which routine did you perform on this date?'}
              </p>
            </div>

            {/* Grid de opções dinâmicas */}
            <div className="grid grid-cols-1 gap-2">
              {availableWorkouts.map((workoutName) => (
                <button
                  key={workoutName}
                  onClick={() => handleWorkoutCheckIn(workoutName)}
                  className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
                    loggedWorkoutName === workoutName
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#0c0c0f]'
                  }`}
                >
                  <span className="text-xs">{workoutName}</span>
                  {loggedWorkoutName === workoutName && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </button>
              ))}
              
              {/* Opção Cardio */}
              <button
                onClick={() => handleWorkoutCheckIn('Cardio')}
                className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
                  loggedWorkoutName === 'Cardio'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#0c0c0f]'
                }`}
              >
                <span className="text-xs">{lang === 'pt' ? 'Cardio / Aeróbico 🏃‍♂️' : 'Cardio / Running 🏃‍♂️'}</span>
                {loggedWorkoutName === 'Cardio' && (
                  <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
              </button>

              {/* Opção Descanso */}
              <button
                onClick={() => handleWorkoutCheckIn('Descanso')}
                className={`w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
                  loggedWorkoutName === 'Descanso'
                    ? 'border-amber-600 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 font-bold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#0c0c0f]'
                }`}
              >
                <span className="text-xs">{lang === 'pt' ? 'Descanso / Off 🛌' : 'Rest / Off Day 🛌'}</span>
                {loggedWorkoutName === 'Descanso' && (
                  <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
              </button>
            </div>

            {loggedWorkoutName !== null && (
              <button
                onClick={() => handleWorkoutCheckIn(null)}
                className="w-full py-2 text-center text-xs font-semibold text-zinc-400 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 transition-all cursor-pointer"
              >
                {lang === 'pt' ? 'Desmarcar Treino' : 'Clear Workout Log'}
              </button>
            )}
          </div>

          {/* CARD 2: INTELIGÊNCIA COMPARATIVA (Hoje x Ontem) */}
          {compareData && (
            <div className="bg-[#0c0c0f] border border-zinc-800 text-zinc-100 rounded-2xl p-6 shadow-md space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-0.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  {lang === 'pt' ? 'Inteligência Nutricional' : 'Nutrition Insights'}
                </span>
                <h3 className="text-md font-bold text-zinc-100">
                  {lang === 'pt' ? 'Comparativo Ontem x Hoje' : 'Yesterday vs Today'}
                </h3>
              </div>

              {/* Bloco de comparação calórica */}
              <div className="space-y-3.5 pt-2">
                <div className="flex justify-between items-end gap-4 h-24 px-2">
                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-bold text-zinc-500">{lang === 'pt' ? 'Ontem' : 'Yest.'}</span>
                    <div 
                      className="w-full bg-zinc-800 rounded-t-lg transition-all duration-500 min-h-[10px]" 
                      style={{ height: `${Math.min(100, Math.round((compareData.yesterday.calories / profile.targetCalories) * 60))}%` }}
                    />
                    <span className="font-mono text-[10px] font-bold text-zinc-400">{compareData.yesterday.calories} kcal</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[9px] font-bold text-blue-400">{lang === 'pt' ? 'Hoje' : 'Today'}</span>
                    <div 
                      className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-lg transition-all duration-500 min-h-[10px]" 
                      style={{ height: `${Math.min(100, Math.round((compareData.today.calories / profile.targetCalories) * 60))}%` }}
                    />
                    <span className="font-mono text-[10px] font-bold text-blue-400">{compareData.today.calories} kcal</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">{lang === 'pt' ? 'Diferença Calórica:' : 'Calorie difference:'}</span>
                    <span className={`font-mono font-extrabold ${
                      compareData.today.calories - compareData.yesterday.calories > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}>
                      {compareData.today.calories - compareData.yesterday.calories > 0 ? '+' : ''}
                      {compareData.today.calories - compareData.yesterday.calories} kcal
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] border-t border-zinc-800 pt-2">
                    <span className="text-zinc-400">{lang === 'pt' ? 'Consumo de Proteínas:' : 'Protein intake:'}</span>
                    <span className="font-mono font-bold text-zinc-200">
                      {compareData.today.protein}g {lang === 'pt' ? 'hoje' : 'today'} (vs {compareData.yesterday.protein}g)
                    </span>
                  </div>
                </div>

                {/* Insight do assistente sobre ontem x hoje */}
                <div className="text-[11px] leading-relaxed text-zinc-400 flex gap-2 items-start">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    {compareData.today.calories === 0 ? (
                      lang === 'pt' ? 'Você ainda não registrou alimentos hoje.' : 'You have not logged any foods today.'
                    ) : compareData.today.calories < compareData.yesterday.calories ? (
                      lang === 'pt' 
                        ? 'Você está em um déficit calórico em relação a ontem. Bom trabalho controlando a ingestão!'
                        : 'Your calories are lower than yesterday. Great job controling your intake!'
                    ) : (
                      lang === 'pt'
                        ? 'Você ingeriu mais calorias hoje em comparação com ontem. Monitore as próximas refeições.'
                        : 'Your calories are higher than yesterday. Keep track of your next meals.'
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CARD 3: REGISTRO DE ÁGUA RÁPIDO */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-500" />
              {translations[lang].waterTitle}
            </h3>
            
            <div className="flex justify-center py-2">
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-4 border-zinc-100 dark:border-zinc-800">
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-blue-500/20 dark:bg-blue-500/10 rounded-b-full transition-all duration-500 overflow-hidden flex items-end justify-center"
                  style={{ height: `${waterPercentage}%` }}
                >
                  <div className="h-full w-full bg-blue-500/30 dark:bg-blue-400/20 animate-pulse"></div>
                </div>
                <div className="z-10 text-center">
                  <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">{waterPercentage}%</span>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">{waterIntake}ml</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickWaterAdd(250)}
                className="flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 animate-bounce" /> +250ml
              </button>
              <button
                onClick={() => handleQuickWaterAdd(500)}
                className="flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> +500ml
              </button>
            </div>
            <button
              onClick={handleWaterReset}
              className="w-full flex items-center justify-center gap-1.5 border border-transparent text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg py-1 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {lang === 'pt' ? 'Reiniciar Contador' : 'Reset Counter'}
            </button>
          </div>

        </div>
      </div>

      {/* Modal Customizado para Edição de Quantidade (g) */}
      {editingLogItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
                {lang === 'pt' ? 'Alterar Quantidade' : 'Edit Quantity'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' 
                  ? `Altere a quantidade consumida de "${editingLogItem.food_name}"` 
                  : `Edit quantity consumed for "${editingLogItem.food_name}"`}
              </p>
            </div>

            <form onSubmit={handleSaveQuantityModal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center">
                  {lang === 'pt' ? 'Quantidade em gramas (g)' : 'Quantity in grams (g)'}
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="Ex: 160"
                  value={editingQuantity}
                  onChange={(e) => setEditingQuantity(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-lg font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLogItem(null)}
                  className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  {lang === 'pt' ? 'Salvar' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Customizado de Substituição Equivalente */}
      {substitutingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-indigo-650 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                {lang === 'pt' ? 'Substituição Equivalente' : 'Equivalent Swap'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' 
                  ? `Selecione um novo alimento para substituir as ${Math.round(substitutingItem.calories)} kcal de ${substitutingItem.quantity}g de "${substitutingItem.food_name}"` 
                  : `Select a new food to replace the ${Math.round(substitutingItem.calories)} kcal of ${substitutingItem.quantity}g of "${substitutingItem.food_name}"`}
              </p>
            </div>

            <form onSubmit={handleReplaceFoodWithEquivalent} className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {lang === 'pt' ? 'Buscar Novo Alimento' : 'Search New Food'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={lang === 'pt' ? "Substituir por aveia, batata, filé..." : "Substitute with potatoes, steak..."}
                    value={substituteSearchTerm}
                    onChange={(e) => setSubstituteSearchTerm(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Resultados da busca */}
                {substituteSearchResults.length > 0 && (
                  <div className="absolute z-50 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg mt-1 w-full overflow-hidden max-h-48 overflow-y-auto">
                    {substituteSearchResults.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubstituteFood(food);
                          setSubstituteSearchTerm(food.name);
                          setSubstituteSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-900 last:border-0 block cursor-pointer"
                      >
                        <span className="font-bold">{food.name}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{food.calories} kcal / 100g (P: {food.protein}g C: {food.carbs}g G: {food.fat}g)</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Exibição do cálculo de equivalência */}
              {selectedSubstituteFood && (() => {
                const originalCalories = substitutingItem.calories;
                const newFoodCal100g = selectedSubstituteFood.calories;
                const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
                const ratio = equivalentQuantity / 100;
                
                return (
                  <div className="p-3.5 bg-zinc-550 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                      <span className="text-xs text-zinc-650 dark:text-zinc-300">
                        {lang === 'pt' ? 'Equivalente calculado:' : 'Calculated equivalent:'}{' '}
                        <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-extrabold block sm:inline">
                          {equivalentQuantity}g de {selectedSubstituteFood.name}
                        </strong>
                      </span>
                      <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold self-start">
                        {Math.round(originalCalories)} kcal (Mantido)
                      </span>
                    </div>

                    {/* Comparativo de macros */}
                    <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-zinc-200 dark:border-zinc-800/85 pt-2.5">
                      <div className="space-y-0.5">
                        <span className="text-zinc-450 dark:text-zinc-500 font-bold uppercase">{translations[lang].protein}</span>
                        <span className="block text-zinc-750 dark:text-zinc-200 font-mono">
                          {Math.round(substitutingItem.protein)}g →{' '}
                          <span className="text-rose-500 font-bold">{Math.round(selectedSubstituteFood.protein * ratio)}g</span>
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zinc-450 dark:text-zinc-500 font-bold uppercase">{translations[lang].carbs}</span>
                        <span className="block text-zinc-750 dark:text-zinc-200 font-mono">
                          {Math.round(substitutingItem.carbs)}g →{' '}
                          <span className="text-blue-500 font-bold">{Math.round(selectedSubstituteFood.carbs * ratio)}g</span>
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-zinc-450 dark:text-zinc-500 font-bold uppercase">{translations[lang].fat}</span>
                        <span className="block text-zinc-750 dark:text-zinc-200 font-mono">
                          {Math.round(substitutingItem.fat)}g →{' '}
                          <span className="text-amber-500 font-bold">{Math.round(selectedSubstituteFood.fat * ratio)}g</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubstitutingItem(null);
                    setSelectedSubstituteFood(null);
                    setSubstituteSearchTerm('');
                  }}
                  className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!selectedSubstituteFood}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {lang === 'pt' ? 'Substituir' : 'Swap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
