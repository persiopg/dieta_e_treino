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
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [substituteSearchResults, setSubstituteSearchResults] = useState([]);
  const [selectedSubstituteFood, setSelectedSubstituteFood] = useState(null);

  // Buscar alimentos para o Diário Alimentar
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }
    const filtered = initialFoodDatabase.filter(food => 
      food.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
    setSearchResults(filtered);
  }, [searchTerm]);

  // Buscar alimentos para Substituição
  useEffect(() => {
    if (substituteSearchTerm.trim() === '') {
      setSubstituteSearchResults([]);
      return;
    }
    const filtered = initialFoodDatabase.filter(food => 
      food.name.toLowerCase().includes(substituteSearchTerm.toLowerCase())
    ).slice(0, 5);
    setSubstituteSearchResults(filtered);
  }, [substituteSearchTerm]);

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

  // Substituir por equivalente calórico
  const handleReplaceFoodWithEquivalent = async (e) => {
    e.preventDefault();
    if (!substitutingItem || !selectedSubstituteFood) return;
    const originalCalories = substitutingItem.calories;
    const newFoodCal100g = selectedSubstituteFood.calories;
    if (newFoodCal100g <= 0) return alert('Alimento inválido');
    const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
    const ratio = equivalentQuantity / 100;
    try {
      await axios.put(`/api/tracker/diet/${substitutingItem.id}`, {
        food_name: selectedSubstituteFood.name,
        quantity: equivalentQuantity,
        protein: selectedSubstituteFood.protein * ratio,
        carbs: selectedSubstituteFood.carbs * ratio,
        fat: selectedSubstituteFood.fat * ratio,
        calories: originalCalories,
      });
      setSubstitutingItem(null);
      setSubstituteSearchTerm('');
      setSelectedSubstituteFood(null);
      onRefreshData();
    } catch (err) {
      console.error(err);
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
              <span className="text-[10px] text-zinc-400 font-bold block mt-0.5">
                {profile.targetCalories} kcal • P:{profile.macros.protein}g C:{profile.macros.carbs}g
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
                                /* Se estiver editando: Botão de Excluir do plano padrão */
                                <button
                                  onClick={() => handleRemoveFood(mealIdx, itemIdx)}
                                  className="p-1 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-all cursor-pointer"
                                  title="Remover do plano padrão"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

          {/* Seletor de Refeição ativa para Adicionar Alimento no Diário */}
          {selectedMealForAdd && (
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4" />
                  {lang === 'pt' ? `Adicionar ao ${selectedMealForAdd}` : `Add to ${selectedMealForAdd}`}
                </span>
                <button 
                  onClick={() => { setSelectedMealForAdd(null); setSelectedDiaryFood(null); setSearchTerm(''); }}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>

              <form onSubmit={handleAddDiaryFood} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2 space-y-1.5 relative">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Buscar Alimento</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder={lang === 'pt' ? "Digite batata, frango..." : "Search food..."}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute z-20 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg mt-1 w-full max-w-[400px] overflow-hidden">
                      {searchResults.map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          onClick={() => { setSelectedDiaryFood(food); setSearchTerm(food.name); setSearchResults([]); }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-900 last:border-0 block"
                        >
                          <span className="font-bold">{food.name}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{food.calories} kcal / 100g</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Quantidade (g)</label>
                    <input
                      type="number"
                      value={foodQuantity}
                      onChange={(e) => setFoodQuantity(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-sm h-[38px] cursor-pointer">
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Substituição Inteligente por Equivalência Calórica */}
          {substitutingItem && (
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {lang === 'pt' ? `Substituir ${substitutingItem.food_name}` : `Swap ${substitutingItem.food_name}`}
                </span>
                <button 
                  onClick={() => { setSubstitutingItem(null); setSelectedSubstituteFood(null); setSubstituteSearchTerm(''); }}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  {lang === 'pt' ? 'Cancelar' : 'Cancel'}
                </button>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' 
                  ? `Selecione um novo alimento para substituir as ${Math.round(substitutingItem.calories)} kcal de ${substitutingItem.quantity}g de ${substitutingItem.food_name}.`
                  : `Select substitute for ${Math.round(substitutingItem.calories)} kcal.`}
              </p>

              <form onSubmit={handleReplaceFoodWithEquivalent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="md:col-span-2 space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Buscar Alimento Equivalente</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3.5 w-4 h-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Arroz integral, aveia, batata doce..."
                        value={substituteSearchTerm}
                        onChange={(e) => setSubstituteSearchTerm(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </div>

                    {substituteSearchResults.length > 0 && (
                      <div className="absolute z-20 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg mt-1 w-full max-w-[400px] overflow-hidden">
                        {substituteSearchResults.map((food) => (
                          <button
                            key={food.id}
                            type="button"
                            onClick={() => { setSelectedSubstituteFood(food); setSubstituteSearchTerm(food.name); setSubstituteSearchResults([]); }}
                            className="w-full text-left px-4 py-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-900 last:border-0 block"
                          >
                            <span className="font-bold">{food.name}</span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">{food.calories} kcal / 100g</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedSubstituteFood}
                    className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm h-[42px] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    Confirmar Troca
                  </button>
                </div>

                {selectedSubstituteFood && (() => {
                  const origCal = substitutingItem.calories;
                  const targetCal = selectedSubstituteFood.calories;
                  const equivQty = Math.round((origCal * 100) / targetCal);
                  const r = equivQty / 100;
                  return (
                    <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs text-zinc-300">
                        <span>
                          {lang === 'pt' ? 'Equivalente calculado:' : 'Swap calculated:'}{' '}
                          <strong className="text-indigo-400 font-extrabold">{equivQty}g de {selectedSubstituteFood.name}</strong>
                        </span>
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-bold">
                          {Math.round(origCal)} kcal
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-zinc-800/80 pt-2 text-zinc-400 font-mono">
                        <div>
                          <span>PROTEÍNAS:</span>
                          <span className="block font-bold text-zinc-200">
                            {Math.round(substitutingItem.protein)}g → <span className="text-rose-500">{Math.round(selectedSubstituteFood.protein * r)}g</span>
                          </span>
                        </div>
                        <div>
                          <span>CARBOS:</span>
                          <span className="block font-bold text-zinc-200">
                            {Math.round(substitutingItem.carbs)}g → <span className="text-blue-500">{Math.round(selectedSubstituteFood.carbs * r)}g</span>
                          </span>
                        </div>
                        <div>
                          <span>GORDURAS:</span>
                          <span className="block font-bold text-zinc-200">
                            {Math.round(substitutingItem.fat)}g → <span className="text-amber-500">{Math.round(selectedSubstituteFood.fat * r)}g</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </form>
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
                  {initialFoodDatabase
                    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 10)
                    .map(food => (
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

    </div>
  );
}
