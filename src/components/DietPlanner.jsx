import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initialFoodDatabase } from '../data/foodDatabase';
import { translations } from '../utils/translations';
import { 
  Plus, 
  Trash2, 
  Apple, 
  Search, 
  Info,
  Sparkles,
  PlusCircle,
  FolderHeart,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Edit2,
  Settings,
  RefreshCw,
  Calendar,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function DietPlanner({ 
  diet, 
  setDiet, 
  profile, 
  setProfile,
  lang = 'pt', 
  activeDate, 
  setActiveDate, 
  dietLogs = [], 
  onRefreshData 
}) {
  // Controle de edição do plano recomendado (Aside)
  const [isEditingBasePlan, setIsEditingBasePlan] = useState(false);
  const [activeMealIndex, setActiveMealIndex] = useState(null); // Índice da refeição para modal
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(100);
  const [searchQueryResults, setSearchQueryResults] = useState([]);

  // Estados para edição rápida de calorias e macros
  const [showEditCaloriesModal, setShowEditCaloriesModal] = useState(false);
  const [editCaloriesForm, setEditCaloriesForm] = useState({
    targetCalories: profile?.targetCalories || 2000,
    protein: profile?.macros?.protein || 150,
    carbs: profile?.macros?.carbs || 200,
    fat: profile?.macros?.fat || 60
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
    regenerateDiet: true,
    regenerateWorkout: false
  });

  // Estado para cadastro de alimento customizado no modal do plano base
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    quantity: 100
  });

  // Estados locais do Diário Alimentar (Body)
  const [copyingPlan, setCopyingPlan] = useState(false);
  const [selectedMealForAdd, setSelectedMealForAdd] = useState(null); // Refeição do diário ativa
  const [searchTerm, setSearchTerm] = useState('');
  const [foodQuantity, setFoodQuantity] = useState('100');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDiaryFood, setSelectedDiaryFood] = useState(null);

  // Estados para Substituição por Equivalência
  const [substitutingItem, setSubstitutingItem] = useState(null);
  const [isSubstitutingBasePlan, setIsSubstitutingBasePlan] = useState(false);
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [substituteSearchResults, setSubstituteSearchResults] = useState([]);
  const [selectedSubstituteFood, setSelectedSubstituteFood] = useState(null);

  // Sincronizar dados do perfil
  useEffect(() => {
    if (profile) {
      setEditCaloriesForm({
        targetCalories: profile.targetCalories || 2000,
        protein: profile.macros?.protein || 150,
        carbs: profile.macros?.carbs || 200,
        fat: profile.macros?.fat || 60
      });
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

  // Buscar alimentos para o Diário Alimentar
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
        console.error('Erro ao buscar alimentos da API no diário:', err);
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

  // Buscar alimentos para Substituição
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
        console.error('Erro ao buscar alimentos da API para substituição:', err);
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

  // Buscar alimentos para o Modal do Plano Base
  useEffect(() => {
    let active = true;
    const searchBaseFoods = async () => {
      if (searchQuery.trim() === '') {
        setSearchQueryResults([]);
        return;
      }
      try {
        const res = await axios.get('/api/foods', { params: { q: searchQuery } });
        if (active) {
          setSearchQueryResults(res.data.slice(0, 15));
        }
      } catch (err) {
        console.error('Erro ao buscar alimentos da API no plano base:', err);
        // Fallback local
        const filtered = initialFoodDatabase.filter(food => 
          food.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 15);
        if (active) setSearchQueryResults(filtered);
      }
    };

    searchBaseFoods();
    return () => { active = false; };
  }, [searchQuery]);

  // Abrir modal de adição de alimento
  const openAddFood = (mealIdx) => {
    setActiveMealIndex(mealIdx);
    setShowAddFoodModal(true);
    setSearchQuery('');
    setSelectedFood(null);
    setSelectedQuantity(100);
  };

  // ==========================================
  // AÇÕES DO PLANO RECOMENDADO (BASE)
  // ==========================================

  // Mudar preset de dieta
  const handlePresetSelect = async (presetKey) => {
    if (window.confirm(lang === 'pt' ? 'Substituir dieta atual por este preset? Alterações serão perdidas.' : 'Replace current diet with preset? Changes will be lost.')) {
      try {
        const res = await axios.post('/api/diet/preset', { presetKey });
        setDiet(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Alterar quantidade do plano base
  const handleQuantityChange = async (mealIdx, itemIdx, newQty) => {
    if (newQty < 0 || newQty === '') return;
    const meal = diet.meals[mealIdx];
    const item = meal.items[itemIdx];
    try {
      await axios.put(`/api/diet/meal/${meal.id}/item/${item.id}`, { quantity: Number(newQty) });
      const updatedDiet = { ...diet };
      updatedDiet.meals[mealIdx].items[itemIdx].quantity = Number(newQty);
      setDiet(updatedDiet);
    } catch (err) {
      console.error(err);
    }
  };

  // Remover item do plano base
  const handleRemoveFood = async (mealIdx, itemIdx) => {
    const meal = diet.meals[mealIdx];
    const item = meal.items[itemIdx];
    try {
      await axios.delete(`/api/diet/meal/${meal.id}/item/${item.id}`);
      const updatedDiet = { ...diet };
      updatedDiet.meals[mealIdx].items.splice(itemIdx, 1);
      setDiet(updatedDiet);
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar alimento da biblioteca ao plano base
  const handleAddFoodFromDb = async () => {
    if (!selectedFood || activeMealIndex === null) return;
    const meal = diet.meals[activeMealIndex];
    try {
      const res = await axios.post(`/api/diet/meal/${meal.id}/item`, {
        name: selectedFood.name,
        quantity: Number(selectedQuantity),
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        calories: selectedFood.calories
      });
      const updatedDiet = { ...diet };
      updatedDiet.meals[activeMealIndex].items.push(res.data);
      setDiet(updatedDiet);
      setShowAddFoodModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar alimento customizado ao plano base
  const handleAddCustomFood = async () => {
    if (!customFoodForm.name.trim() || activeMealIndex === null) return alert('Insira o nome');
    const meal = diet.meals[activeMealIndex];
    try {
      const res = await axios.post(`/api/diet/meal/${meal.id}/item`, {
        name: customFoodForm.name,
        quantity: Number(customFoodForm.quantity),
        protein: Number(customFoodForm.protein),
        carbs: Number(customFoodForm.carbs),
        fat: Number(customFoodForm.fat),
        calories: Number(customFoodForm.calories)
      });
      const updatedDiet = { ...diet };
      updatedDiet.meals[activeMealIndex].items.push(res.data);
      setDiet(updatedDiet);
      setShowAddFoodModal(false);
      setCustomFoodForm({ name: '', calories: 100, protein: 10, carbs: 10, fat: 2, quantity: 100 });
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar nova refeição ao plano base
  const handleAddMeal = async () => {
    const mealNames = ['Lanche da Noite', 'Ceia', 'Lanche da Manhã', 'Lanche Pré-Treino', 'Lanche Pós-Treino'];
    const count = diet?.meals?.length || 0;
    const defaultName = mealNames[count % mealNames.length];
    const name = window.prompt(lang === 'pt' ? 'Qual o nome da nova refeição?' : 'Name of new meal?', defaultName);
    if (!name) return;
    try {
      const res = await axios.post('/api/diet/meal', { name });
      const updatedDiet = { ...diet };
      if (!updatedDiet.meals) updatedDiet.meals = [];
      updatedDiet.meals.push(res.data);
      setDiet(updatedDiet);
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // AÇÕES DO DIÁRIO ALIMENTAR (REAL) & INTEGRAÇÃO
  // ==========================================

  // Copiar alimento individual do plano base para o diário de hoje
  const handleCopySingleItemToDiary = async (mealName, item) => {
    try {
      await axios.post('/api/tracker/diet', {
        meal_name: mealName,
        food_name: item.name,
        quantity: item.quantity,
        protein: (item.protein * item.quantity) / 100,
        carbs: (item.carbs * item.quantity) / 100,
        fat: (item.fat * item.quantity) / 100,
        calories: (item.calories * item.quantity) / 100,
        date: activeDate
      });
      onRefreshData();
    } catch (err) {
      console.error('Erro ao copiar alimento:', err);
    }
  };

  // Copiar plano base inteiro para o diário
  const handleCopyFullPlan = async () => {
    setCopyingPlan(true);
    try {
      await axios.post('/api/tracker/diet/copy-plan', { date: activeDate });
      onRefreshData();
    } catch (err) {
      console.error(err);
      alert('Erro ao copiar plano alimentar.');
    } finally {
      setCopyingPlan(false);
    }
  };

  // Ajustar quantidade log do diário
  const handleAdjustLogQuantity = async (logItem, direction) => {
    const factor = direction === 'increment' ? 1.25 : 0.75;
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
      console.error(err);
    }
  };

  // Excluir log do diário
  const handleDeleteLogItem = async (id) => {
    try {
      await axios.delete(`/api/tracker/diet/${id}`);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Adicionar alimento avulso no diário
  const handleAddDiaryFood = async (e) => {
    e.preventDefault();
    if (!selectedDiaryFood || !selectedMealForAdd || Number(foodQuantity) <= 0) return;
    const qty = Number(foodQuantity);
    const ratio = qty / 100;
    try {
      await axios.post('/api/tracker/diet', {
        meal_name: selectedMealForAdd,
        food_name: selectedDiaryFood.name,
        quantity: qty,
        protein: selectedDiaryFood.protein * ratio,
        carbs: selectedDiaryFood.carbs * ratio,
        fat: selectedDiaryFood.fat * ratio,
        calories: selectedDiaryFood.calories * ratio,
        date: activeDate
      });
      setSelectedDiaryFood(null);
      setSearchTerm('');
      setFoodQuantity('100');
      setSelectedMealForAdd(null);
      onRefreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Substituir por equivalente calórico (no Diário ou no Plano Base)
  const handleReplaceFoodWithEquivalent = async (e) => {
    e.preventDefault();
    if (!substitutingItem || !selectedSubstituteFood) return;

    // As calorias originais do item a ser substituído (calculadas proporcionais à gramagem atual)
    let originalCalories = substitutingItem.calories;
    if (isSubstitutingBasePlan) {
      originalCalories = Math.round((substitutingItem.calories * substitutingItem.quantity) / 100);
    }

    const newFoodCal100g = selectedSubstituteFood.calories;
    if (newFoodCal100g <= 0) return alert(lang === 'pt' ? 'Alimento inválido' : 'Invalid food');

    const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
    const ratio = equivalentQuantity / 100;

    try {
      if (isSubstitutingBasePlan) {
        // Atualizar no Plano Base
        await axios.put(`/api/diet/meal/${substitutingItem.mealId}/item/${substitutingItem.id}`, {
          name: selectedSubstituteFood.name,
          quantity: equivalentQuantity,
          protein: selectedSubstituteFood.protein,
          carbs: selectedSubstituteFood.carbs,
          fat: selectedSubstituteFood.fat,
          calories: selectedSubstituteFood.calories
        });

        // Sincronizar plano base localmente na hora
        const updatedDiet = { ...diet };
        const mealIdx = updatedDiet.meals.findIndex(m => m.id === substitutingItem.mealId);
        if (mealIdx !== -1) {
          const itemIdx = updatedDiet.meals[mealIdx].items.findIndex(i => i.id === substitutingItem.id);
          if (itemIdx !== -1) {
            updatedDiet.meals[mealIdx].items[itemIdx] = {
              id: substitutingItem.id,
              name: selectedSubstituteFood.name,
              quantity: equivalentQuantity,
              protein: selectedSubstituteFood.protein,
              carbs: selectedSubstituteFood.carbs,
              fat: selectedSubstituteFood.fat,
              calories: selectedSubstituteFood.calories
            };
          }
        }
        setDiet(updatedDiet);
      } else {
        // Atualizar no Diário Alimentar
        await axios.put(`/api/tracker/diet/${substitutingItem.id}`, {
          food_name: selectedSubstituteFood.name,
          quantity: equivalentQuantity,
          protein: selectedSubstituteFood.protein * ratio,
          carbs: selectedSubstituteFood.carbs * ratio,
          fat: selectedSubstituteFood.fat * ratio,
          calories: originalCalories,
        });
        onRefreshData();
      }

      setSubstitutingItem(null);
      setSubstituteSearchTerm('');
      setSelectedSubstituteFood(null);
      setIsSubstitutingBasePlan(false);
    } catch (err) {
      console.error('Erro ao substituir alimento:', err);
    }
  };

  // Salvar edição direta de calorias e macros
  const handleSaveQuickCalories = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put('/api/auth/profile/calories', {
        targetCalories: Number(editCaloriesForm.targetCalories),
        protein: Number(editCaloriesForm.protein),
        carbs: Number(editCaloriesForm.carbs),
        fat: Number(editCaloriesForm.fat)
      });
      setProfile(res.data.profile);
      setShowEditCaloriesModal(false);
      onRefreshData();

      if (window.confirm(lang === 'pt' ? 'Deseja recalcular e re-gerar automaticamente as porções do seu Plano Recomendado de Dieta para bater as novas metas?' : 'Would you like to automatically recalculate and regenerate your Base Recommended Plan portions to match the new targets?')) {
        const presetRes = await axios.post('/api/diet/preset', { presetKey: res.data.profile.goal });
        setDiet(presetRes.data);
      }
    } catch (err) {
      console.error('Erro ao atualizar metas calóricas:', err);
      alert(lang === 'pt' ? 'Erro ao salvar novas metas.' : 'Error saving targets.');
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
        setDiet(dietRes.data);
      }

      // 3. Re-gerar Treino
      if (recalculateForm.regenerateWorkout) {
        let presetKey = 'upperlower4x';
        if (workoutDaysVal <= 3) {
          presetKey = 'fullbody3x';
        } else if (workoutDaysVal >= 5) {
          presetKey = 'ppl6x';
        }
        await axios.post('/api/workout/preset', { presetKey });
      }

      // 4. Finalizar
      setShowRecalculateModal(false);
      onRefreshData();
      alert(lang === 'pt' ? 'Plano recalculado com sucesso!' : 'Plan successfully recalculated!');
    } catch (err) {
      console.error('Erro ao recalcular plano:', err);
      alert(lang === 'pt' ? 'Erro ao recalcular plano.' : 'Error recalculating plan.');
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

  // ==========================================
  // TOTAIS DA DIETA REAL DO DIÁRIO (BODY)
  // ==========================================
  let consumedCal = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (dietLogs && dietLogs.length > 0) {
    dietLogs.forEach(l => {
      consumedCal += Math.round(Number(l.calories));
      consumedProtein += Math.round(Number(l.protein));
      consumedCarbs += Math.round(Number(l.carbs));
      consumedFat += Math.round(Number(l.fat));
    });
  }

  // Agrupamento do diário
  const mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar'];
  const groupedDietLogs = {};
  mealsStructure.forEach(m => groupedDietLogs[m] = dietLogs.filter(l => l.meal_name === m));
  dietLogs.forEach(l => {
    if (!mealsStructure.includes(l.meal_name)) {
      if (!groupedDietLogs[l.meal_name]) groupedDietLogs[l.meal_name] = [];
      groupedDietLogs[l.meal_name].push(l);
    }
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 pb-24">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Apple className="w-8 h-8 text-rose-500" />
            {lang === 'pt' ? 'Planejamento e Diário Alimentar' : 'Nutrition Hub'}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {lang === 'pt' ? 'Compare seu plano padrão recomendado (Aside) com seu diário real (Body) e gerencie sua dieta.' : 'Compare planned macros vs real intake.'}
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

      {/* Grid Central Lado a Lado (ASIDE + BODY) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* ASIDE (ESQUERDA - 1/3): PLANO RECOMENDADO BASE */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                {lang === 'pt' ? 'Plano Recomendado' : 'Base Plan'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-400 font-bold">
                  {profile.targetCalories} kcal • P:{profile.macros.protein}g C:{profile.macros.carbs}g
                </span>
                {isEditingBasePlan && (
                  <button 
                    onClick={() => setShowEditCaloriesModal(true)}
                    className="p-0.5 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded text-blue-500 cursor-pointer"
                    title={lang === 'pt' ? "Ajustar calorias/macros" : "Adjust calories/macros"}
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
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

          {/* Listagem das refeições do plano recomendado */}
          <div className="space-y-4">
            {diet?.meals && diet.meals.length > 0 ? (
              diet.meals.map((meal, mealIdx) => {
                let mealCal = 0;
                meal.items?.forEach(i => mealCal += Math.round((i.calories * i.quantity) / 100));

                return (
                  <div key={meal.id} className="border border-zinc-100 dark:border-zinc-900 rounded-xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/5">
                    <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-[#121216] border-b border-zinc-150 dark:border-zinc-900 flex justify-between items-center">
                      <span className="font-extrabold text-xs text-zinc-800 dark:text-zinc-200">{meal.name}</span>
                      <span className="font-mono text-[10px] font-bold text-zinc-400">{mealCal} kcal</span>
                    </div>

                    <div className="p-3 space-y-2.5">
                      {meal.items && meal.items.length > 0 ? (
                        meal.items.map((item, itemIdx) => (
                          <div key={item.id} className="flex justify-between items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-900 last:border-0 last:pb-0">
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <span className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 block truncate">{item.name}</span>
                              <span className="text-[9px] text-zinc-400 block font-mono">
                                {item.quantity}g • {Math.round((item.calories * item.quantity) / 100)} kcal
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Se NÃO estiver editando o plano base: Botão de Cópia Individual */}
                              {!isEditingBasePlan ? (
                                <button
                                  onClick={() => handleCopySingleItemToDiary(meal.name, item)}
                                  className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-all cursor-pointer"
                                  title={lang === 'pt' ? 'Adicionar ao diário de hoje' : 'Add to diary'}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {/* Botão de Substituição no plano base */}
                                  <button
                                    onClick={() => {
                                      setSubstitutingItem({
                                        id: item.id,
                                        mealId: meal.id,
                                        food_name: item.name,
                                        quantity: item.quantity,
                                        protein: item.protein,
                                        carbs: item.carbs,
                                        fat: item.fat,
                                        calories: item.calories
                                      });
                                      setIsSubstitutingBasePlan(true);
                                      setSubstituteSearchTerm('');
                                      setSelectedSubstituteFood(null);
                                    }}
                                    className="p-1 hover:bg-indigo-500/10 rounded-lg text-indigo-500 transition-all cursor-pointer"
                                    title={lang === 'pt' ? 'Substituir por equivalente' : 'Swap food'}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Botão de Excluir do plano padrão */}
                                  <button
                                    onClick={() => handleRemoveFood(mealIdx, itemIdx)}
                                    className="p-1 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-all cursor-pointer"
                                    title="Remover do plano padrão"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-400 italic py-1">{lang === 'pt' ? 'Sem alimentos cadastrados.' : 'No foods.'}</p>
                      )}

                      {/* Botão de Adicionar Alimento no Plano Base */}
                      {isEditingBasePlan && (
                        <button
                          onClick={() => openAddFood(mealIdx)}
                          className="w-full mt-1.5 py-1.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" />
                          {lang === 'pt' ? 'Adicionar Alimento Padrão' : 'Add Default Food'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-zinc-400 italic text-center py-4">{lang === 'pt' ? 'Nenhuma refeição ativa.' : 'No meals active.'}</p>
            )}

            {isEditingBasePlan && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                <button
                  onClick={handleAddMeal}
                  className="flex-1 py-2 text-center text-xs font-bold text-blue-500 border border-blue-500/30 hover:bg-blue-500/5 rounded-xl transition-all cursor-pointer"
                >
                  + Nova Refeição
                </button>
                <button
                  onClick={() => handlePresetSelect('hipertrofia')}
                  className="py-2 px-3 text-center text-xs font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all cursor-pointer"
                  title="Restaurar Presets do Objetivo"
                >
                  Presets
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BODY (DIREITA - 2/3): DIÁRIO ALIMENTAR DO DIA ATIVO */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-500">Diário Alimentar</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md font-mono text-[10px] font-bold">
                  {consumedCal} kcal
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'pt' ? 'O que você realmente comeu na data selecionada.' : 'Your logged food intake.'}
              </p>
            </div>

            {/* Seletor de Data */}
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800 rounded-2xl p-1 shadow-sm self-start">
              <button onClick={handlePrevDay} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="px-2 text-xs font-extrabold text-zinc-700 dark:text-zinc-300 min-w-[100px] text-center flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>{formatDateDisplay(activeDate)}</span>
              </div>
              <button onClick={handleNextDay} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Seletor de Refeição ativa para Adicionar Alimento no Diário (Modal) */}
          {selectedMealForAdd && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
                <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-850 pb-3">
                  <h3 className="font-extrabold text-md text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                    <PlusCircle className="w-5 h-5 text-blue-500" />
                    {lang === 'pt' ? `Adicionar ao ${selectedMealForAdd}` : `Add to ${selectedMealForAdd}`}
                  </h3>
                  <button 
                    onClick={() => { setSelectedMealForAdd(null); setSelectedDiaryFood(null); setSearchTerm(''); }}
                    className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {lang === 'pt' ? 'Fechar' : 'Close'}
                  </button>
                </div>

                <form onSubmit={handleAddDiaryFood} className="space-y-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Buscar Alimento</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder={lang === 'pt' ? "Digite batata, frango..." : "Search food..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="absolute z-50 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg mt-1 w-full overflow-hidden max-h-48 overflow-y-auto">
                        {searchResults.map((food) => (
                          <button
                            key={food.id}
                            type="button"
                            onClick={() => { setSelectedDiaryFood(food); setSearchTerm(food.name); setSearchResults([]); }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-900 last:border-0 block cursor-pointer"
                          >
                            <span className="font-bold">{food.name}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">{food.calories} kcal / 100g</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Quantidade (g)</label>
                      <input
                        type="number"
                        value={foodQuantity}
                        onChange={(e) => setFoodQuantity(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none font-bold"
                      />
                    </div>
                    <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md h-[38px] cursor-pointer transition-all">
                      Adicionar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Substituição Inteligente por Equivalência Calórica (Modal) */}
          {substitutingItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 animate-scale-up">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5">
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
                    const origCal = substitutingItem.calories;
                    const targetCal = selectedSubstituteFood.calories;
                    const equivQty = Math.round((origCal * 100) / targetCal);
                    const r = equivQty / 100;
                    
                    return (
                      <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                          <span className="text-xs text-zinc-655 dark:text-zinc-300">
                            {lang === 'pt' ? 'Equivalente calculado:' : 'Calculated equivalent:'}{' '}
                            <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-extrabold block sm:inline">
                              {equivQty}g de {selectedSubstituteFood.name}
                            </strong>
                          </span>
                          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-bold self-start sm:self-center">
                            {Math.round(origCal)} kcal
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-zinc-200 dark:border-zinc-800 pt-2 text-zinc-500 dark:text-zinc-400 font-mono">
                          <div>
                            <span>PROTEÍNAS:</span>
                            <span className="block font-bold text-zinc-800 dark:text-zinc-200">
                              {Math.round(substitutingItem.protein)}g → <span className="text-rose-500 font-extrabold">{Math.round(selectedSubstituteFood.protein * r)}g</span>
                            </span>
                          </div>
                          <div>
                            <span>CARBOS:</span>
                            <span className="block font-bold text-zinc-800 dark:text-zinc-200">
                              {Math.round(substitutingItem.carbs)}g → <span className="text-blue-500 font-extrabold">{Math.round(selectedSubstituteFood.carbs * r)}g</span>
                            </span>
                          </div>
                          <div>
                            <span>GORDURAS:</span>
                            <span className="block font-bold text-zinc-800 dark:text-zinc-200">
                              {Math.round(substitutingItem.fat)}g → <span className="text-amber-500 font-extrabold">{Math.round(selectedSubstituteFood.fat * r)}g</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setSubstitutingItem(null); setSelectedSubstituteFood(null); setSubstituteSearchTerm(''); }}
                      className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                    >
                      {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedSubstituteFood}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
                    >
                      {lang === 'pt' ? 'Confirmar Troca' : 'Confirm Swap'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Listagem das refeições do diário alimentar real */}
          <div className="space-y-6">
            {dietLogs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                <Apple className="w-12 h-12 text-zinc-300 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{lang === 'pt' ? 'Diário do Dia Vazio' : 'No food logs today'}</h4>
                  <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mt-1">
                    {lang === 'pt' ? 'Você ainda não registrou alimentos nesta data. Importe o plano base recomendado para fazer ajustes.' : 'Log foods or import your plan.'}
                  </p>
                </div>
                <button
                  onClick={handleCopyFullPlan}
                  disabled={copyingPlan}
                  className="mx-auto px-4 py-2 text-xs font-bold rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {lang === 'pt' ? 'Copiar Todo o Plano Recomendado' : 'Import Full Plan'}
                </button>
              </div>
            ) : (
              mealsStructure.map((mealName) => {
                const logs = groupedDietLogs[mealName] || [];
                let mealCal = 0;
                logs.forEach(l => mealCal += Math.round(Number(l.calories)));

                return (
                  <div key={mealName} className="border border-zinc-150 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="px-4 py-3 bg-zinc-50 dark:bg-[#121216] border-b border-zinc-150 dark:border-zinc-800 flex justify-between items-center">
                      <div>
                        <span className="font-extrabold text-sm text-zinc-950 dark:text-zinc-50">{mealName}</span>
                        <span className="text-[10px] text-zinc-400 ml-2 font-medium">({logs.length} alimentos)</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">{mealCal} kcal</span>
                        <button
                          onClick={() => setSelectedMealForAdd(mealName)}
                          className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Itens */}
                    <div className="p-4 space-y-3">
                      {logs.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-1">Nenhum alimento registrado nesta refeição.</p>
                      ) : (
                        <div className="space-y-3.5">
                          {logs.map((item) => (
                            <div key={item.id} className="flex justify-between items-start gap-4 pb-3 border-b border-zinc-100 dark:border-zinc-900 last:border-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-xs text-zinc-850 dark:text-zinc-200">{item.food_name}</span>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                  <span>{item.quantity}g</span>
                                  <span>•</span>
                                  <span>P: {Math.round(item.protein)}g</span>
                                  <span>•</span>
                                  <span>C: {Math.round(item.carbs)}g</span>
                                  <span>•</span>
                                  <span>G: {Math.round(item.fat)}g</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3.5">
                                <span className="font-mono font-extrabold text-xs text-zinc-950 dark:text-zinc-100">{Math.round(item.calories)} kcal</span>
                                
                                {/* Ajuste +/- */}
                                <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                                  <button onClick={() => handleAdjustLogQuantity(item, 'decrement')} className="px-2 py-0.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold">-</button>
                                  <span className="px-1 text-[9px] font-bold text-zinc-400 border-x border-zinc-100 dark:border-zinc-800">Qtd</span>
                                  <button onClick={() => handleAdjustLogQuantity(item, 'increment')} className="px-2 py-0.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold">+</button>
                                </div>

                                {/* Botão Equivalente */}
                                <button
                                  onClick={() => {
                                    setSubstitutingItem(item);
                                    setSubstituteSearchTerm('');
                                    setSelectedSubstituteFood(null);
                                    setSelectedMealForAdd(null);
                                  }}
                                  className="text-zinc-400 hover:text-indigo-500 p-1"
                                  title="Substituir por equivalente"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>

                                {/* Remover */}
                                <button onClick={() => handleDeleteLogItem(item.id)} className="text-zinc-400 hover:text-rose-500 p-1">
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
              })
            )}
          </div>

          {/* Barra de Progresso Nutricional do Diário no Body */}
          {dietLogs.length > 0 && (
            <div className="border border-zinc-100 dark:border-zinc-850 rounded-xl p-4 bg-zinc-50/50 dark:bg-zinc-900/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Proteínas</span>
                  <span className="font-mono font-bold text-rose-500">{consumedProtein}g / {profile.macros.protein}g</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min((consumedProtein / profile.macros.protein) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Carboidratos</span>
                  <span className="font-mono font-bold text-blue-500">{consumedCarbs}g / {profile.macros.carbs}g</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min((consumedCarbs / profile.macros.carbs) * 100, 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-zinc-500">
                  <span>Gorduras</span>
                  <span className="font-mono font-bold text-amber-500">{consumedFat}g / {profile.macros.fat}g</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${Math.min((consumedFat / profile.macros.fat) * 100, 100)}%` }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODAL DE ADIÇÃO DE ALIMENTOS (PLAN RECOMENDADO BASE)
          ========================================== */}
      {showAddFoodModal && activeMealIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-extrabold text-md text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
                <PlusCircle className="w-5 h-5 text-blue-500" />
                {lang === 'pt' ? `Adicionar ao ${diet.meals[activeMealIndex].name} (Plano Padrão)` : `Add to ${diet.meals[activeMealIndex].name}`}
              </h3>
              <button 
                onClick={() => setShowAddFoodModal(false)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {lang === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1: Buscar da Biblioteca */}
              <div className="space-y-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Buscar na Biblioteca</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Ex: banana, aveia, frango..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[200px] overflow-y-auto">
                  {searchQueryResults.map(food => (
                      <button
                        key={food.id}
                        onClick={() => setSelectedFood(food)}
                        className={`w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 flex justify-between items-center ${
                          selectedFood?.id === food.id ? 'bg-blue-500/10 font-bold text-blue-600' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span>{food.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{food.calories} kcal / 100g</span>
                      </button>
                    ))}
                </div>

                {selectedFood && (
                  <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-850 rounded-xl">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedFood.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={selectedQuantity}
                          onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                          className="w-14 px-1 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded font-mono text-center text-xs font-bold text-zinc-800 dark:text-zinc-200"
                        />
                        <span className="text-[10px] text-zinc-400 font-bold">g</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAddFoodFromDb}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Adicionar Selecionado
                    </button>
                  </div>
                )}
              </div>

              {/* Coluna 2: Criar Alimento Customizado */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Criar Personalizado</span>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome do Alimento</label>
                    <input
                      type="text"
                      placeholder="Ex: Iogurte Grego Caseiro"
                      value={customFoodForm.name}
                      onChange={(e) => setCustomFoodForm({ ...customFoodForm, name: e.target.value })}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Quantidade (g)</label>
                      <input
                        type="number"
                        value={customFoodForm.quantity}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, quantity: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Calorias (kcal)</label>
                      <input
                        type="number"
                        value={customFoodForm.calories}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, calories: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Proteínas (g)</label>
                      <input
                        type="number"
                        value={customFoodForm.protein}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, protein: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Carboidratos (g)</label>
                      <input
                        type="number"
                        value={customFoodForm.carbs}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, carbs: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Gorduras (g)</label>
                      <input
                        type="number"
                        value={customFoodForm.fat}
                        onChange={(e) => setCustomFoodForm({ ...customFoodForm, fat: Number(e.target.value) })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-1.5 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddCustomFood}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Criar e Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ajustar Metas Calóricas e Macros */}
      {showEditCaloriesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 animate-scale-up">
            <div className="text-center space-y-1">
              <h3 className="text-md font-extrabold text-zinc-950 dark:text-zinc-50 flex items-center justify-center gap-1.5">
                <Edit2 className="w-5 h-5 text-blue-500" />
                {lang === 'pt' ? 'Ajustar Metas de Calorias e Macros' : 'Adjust Calories & Macros'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' ? 'Edite diretamente suas calorias e macronutrientes alvos do perfil.' : 'Edit target values for daily intake.'}
              </p>
            </div>

            <form onSubmit={handleSaveQuickCalories} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Calorias Meta (kcal)' : 'Target Calories (kcal)'}</label>
                <input
                  type="number"
                  required
                  value={editCaloriesForm.targetCalories}
                  onChange={(e) => setEditCaloriesForm({ ...editCaloriesForm, targetCalories: Number(e.target.value) })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Proteína (g)' : 'Protein (g)'}</label>
                  <input
                    type="number"
                    required
                    value={editCaloriesForm.protein}
                    onChange={(e) => setEditCaloriesForm({ ...editCaloriesForm, protein: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Carbos (g)' : 'Carbs (g)'}</label>
                  <input
                    type="number"
                    required
                    value={editCaloriesForm.carbs}
                    onChange={(e) => setEditCaloriesForm({ ...editCaloriesForm, carbs: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Gordura (g)' : 'Fat (g)'}</label>
                  <input
                    type="number"
                    required
                    value={editCaloriesForm.fat}
                    onChange={(e) => setEditCaloriesForm({ ...editCaloriesForm, fat: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditCaloriesModal(false)}
                  className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-550 dark:text-zinc-400 cursor-pointer"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer"
                >
                  {lang === 'pt' ? 'Salvar' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recálculo do Plano */}
      {showRecalculateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
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
                    className="w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>{lang === 'pt' ? 'Recalcular e Re-gerar Dieta Recomendada' : 'Regenerate Recommended Diet'}</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recalculateForm.regenerateWorkout}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, regenerateWorkout: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-blue-500 cursor-pointer"
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
