import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  FileText,
  Download,
  TableIcon,
  Upload
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
  const [searchLoading, setSearchLoading] = useState(false);

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Estados para Importação de Dieta
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreviewData, setImportPreviewData] = useState(null);
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [recalculateForm, setRecalculateForm] = useState({
    gender: profile?.gender || 'masculino',
    age: profile?.age || 30,
    weight: profile?.weight || 80,
    height: profile?.height || 170,
    activityLevel: profile?.activityLevel || 'moderado',
    goal: profile?.goal || 'emagrecimento',
    workoutDays: profile?.workoutDays || 4,
    regenerateDiet: true,
    regenerateWorkout: false,
    useWhey: profile?.useWhey !== undefined ? profile.useWhey : true,
    mealsPerDay: profile?.mealsPerDay || 4
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
  
  // Edição direta de quantidade do log (custom modal)
  const [editingLogItem, setEditingLogItem] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingBasePlanMealId, setEditingBasePlanMealId] = useState(null);

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
        workoutDays: profile.workoutDays || 4,
        useWhey: profile.useWhey !== undefined ? profile.useWhey : true,
        mealsPerDay: profile.mealsPerDay || 4
      }));
    }
  }, [profile]);

  // Helper de normalização de acentos para busca local
  const normalizeStr = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Buscar alimentos para o Diário Alimentar (com debounce de 300ms)
  useEffect(() => {
    let active = true;
    if (searchTerm.trim() === '') { setSearchResults([]); return; }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get('/api/foods', { params: { q: searchTerm } });
        if (active) setSearchResults(res.data.slice(0, 15));
      } catch (err) {
        console.error('Erro ao buscar alimentos da API no diário:', err);
        const q = normalizeStr(searchTerm);
        const filtered = initialFoodDatabase
          .filter(food => normalizeStr(food.name).includes(q))
          .slice(0, 15);
        if (active) setSearchResults(filtered);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [searchTerm]);

  // Buscar alimentos para Substituição (com debounce de 300ms)
  useEffect(() => {
    let active = true;
    if (substituteSearchTerm.trim() === '') { setSubstituteSearchResults([]); return; }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get('/api/foods', { params: { q: substituteSearchTerm } });
        if (active) setSubstituteSearchResults(res.data.slice(0, 15));
      } catch (err) {
        console.error('Erro ao buscar alimentos da API para substituição:', err);
        const q = normalizeStr(substituteSearchTerm);
        const filtered = initialFoodDatabase
          .filter(food => normalizeStr(food.name).includes(q))
          .slice(0, 15);
        if (active) setSubstituteSearchResults(filtered);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [substituteSearchTerm]);

  // Buscar alimentos para o Modal do Plano Base (com debounce de 300ms)
  useEffect(() => {
    let active = true;
    setSearchLoading(true);

    if (searchQuery.trim() === '') {
      setSearchQueryResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get('/api/foods', { params: { q: searchQuery } });
        if (active) {
          setSearchQueryResults(res.data.slice(0, 15));
          setSearchLoading(false);
        }
      } catch (err) {
        console.error('Erro ao buscar alimentos da API no plano base:', err);
        // Fallback local com normalização de acentos
        const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const q = normalize(searchQuery);
        const filtered = initialFoodDatabase.filter(food =>
          normalize(food.name).includes(q)
        ).slice(0, 15);
        if (active) {
          setSearchQueryResults(filtered);
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => { active = false; clearTimeout(timer); };
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

  const handleEditLogQuantityDirectly = (logItem) => {
    setEditingLogItem(logItem);
    setEditingQuantity(Math.round(logItem.quantity).toString());
    setEditingBasePlanMealId(null);
  };

  const handleEditBasePlanItemQuantityDirectly = (mealId, item) => {
    setEditingLogItem({
      id: item.id,
      food_name: item.name,
      quantity: item.quantity
    });
    setEditingQuantity(Math.round(item.quantity).toString());
    setEditingBasePlanMealId(mealId);
  };

  const handleAdjustBasePlanItemQuantity = async (mealId, item, direction) => {
    const factor = direction === 'increment' ? 1.25 : 0.75;
    const newQty = Math.max(10, Math.round(item.quantity * factor));
    try {
      await axios.put(`/api/diet/meal/${mealId}/item/${item.id}`, {
        quantity: newQty
      });
      
      // Sincronizar plano base localmente na hora
      const updatedDiet = { ...diet };
      const mealIdx = updatedDiet.meals.findIndex(m => m.id === mealId);
      if (mealIdx !== -1) {
        const itemIdx = updatedDiet.meals[mealIdx].items.findIndex(i => i.id === item.id);
        if (itemIdx !== -1) {
          updatedDiet.meals[mealIdx].items[itemIdx].quantity = newQty;
        }
      }
      setDiet(updatedDiet);
    } catch (err) {
      console.error('Erro ao ajustar quantidade do plano padrão:', err);
    }
  };

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
    
    try {
      if (editingBasePlanMealId) {
        // Atualizar no Plano Base
        await axios.put(`/api/diet/meal/${editingBasePlanMealId}/item/${editingLogItem.id}`, {
          quantity: newQty
        });

        // Sincronizar plano base localmente
        const updatedDiet = { ...diet };
        const mealIdx = updatedDiet.meals.findIndex(m => m.id === editingBasePlanMealId);
        if (mealIdx !== -1) {
          const itemIdx = updatedDiet.meals[mealIdx].items.findIndex(i => i.id === editingLogItem.id);
          if (itemIdx !== -1) {
            updatedDiet.meals[mealIdx].items[itemIdx].quantity = newQty;
          }
        }
        setDiet(updatedDiet);
        setEditingBasePlanMealId(null);
      } else {
        // Atualizar no Diário Alimentar
        const ratio = newQty / editingLogItem.quantity;
        await axios.put(`/api/tracker/diet/${editingLogItem.id}`, {
          food_name: editingLogItem.food_name,
          quantity: newQty,
          protein: editingLogItem.protein * ratio,
          carbs: editingLogItem.carbs * ratio,
          fat: editingLogItem.fat * ratio,
          calories: editingLogItem.calories * ratio
        });
        onRefreshData();
      }
      setEditingLogItem(null);
    } catch (err) {
      console.error('Erro ao salvar quantidade do alimento:', err);
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
         },
         useWhey: recalculateForm.useWhey,
         mealsPerDay: Number(recalculateForm.mealsPerDay)
       });
 
       // Atualizar perfil global no frontend
       setProfile(profileRes.data.profile);
 
       // 2. Re-gerar Dieta
       if (recalculateForm.regenerateDiet) {
         const dietRes = await axios.post('/api/diet/preset', { 
           presetKey: goalVal,
           useWhey: recalculateForm.useWhey,
           mealsPerDay: Number(recalculateForm.mealsPerDay)
         });
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
  // FUNÇÕES DE EXPORTAÇÃO
  // ==========================================
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Plano Recomendado
    const planRows = [['Refeição', 'Alimento', 'Quantidade (g)', 'Kcal', 'Proteínas (g)', 'Carboidratos (g)', 'Gorduras (g)']];
    if (diet?.meals) {
      diet.meals.forEach(meal => {
        meal.items?.forEach(item => {
          planRows.push([
            meal.name,
            item.name,
            item.quantity,
            Math.round((item.calories * item.quantity) / 100),
            Number(((item.protein * item.quantity) / 100).toFixed(1)),
            Number(((item.carbs * item.quantity) / 100).toFixed(1)),
            Number(((item.fat * item.quantity) / 100).toFixed(1))
          ]);
        });
      });
    }
    const wsPlano = XLSX.utils.aoa_to_sheet(planRows);
    wsPlano['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsPlano, 'Plano Recomendado');

    // Aba 2: Diário do Dia
    const logRows = [['Data', 'Refeição', 'Alimento', 'Quantidade (g)', 'Kcal', 'Proteínas (g)', 'Carboidratos (g)', 'Gorduras (g)']];
    if (dietLogs?.length > 0) {
      dietLogs.forEach(log => {
        logRows.push([
          activeDate,
          log.meal_name,
          log.food_name,
          Number(log.quantity),
          Math.round(Number(log.calories)),
          Number(Number(log.protein).toFixed(1)),
          Number(Number(log.carbs).toFixed(1)),
          Number(Number(log.fat).toFixed(1))
        ]);
      });
    }
    const wsDiario = XLSX.utils.aoa_to_sheet(logRows);
    wsDiario['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDiario, `Diário ${activeDate}`);

    XLSX.writeFile(wb, `dieta_${activeDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const primaryColor = [99, 102, 241];
    const grayColor = [80, 80, 80];

    // Cabeçalho
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Dieta', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${activeDate}  |  Meta: ${profile?.targetCalories || '--'} kcal`, 14, 22);

    let yPos = 36;

    // Seção: Plano Recomendado
    if (diet?.meals && diet.meals.length > 0) {
      doc.setTextColor(...primaryColor);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('📋 Plano Recomendado', 14, yPos);
      yPos += 6;

      const planBody = [];
      diet.meals.forEach(meal => {
        meal.items?.forEach((item, idx) => {
          planBody.push([
            idx === 0 ? meal.name : '',
            item.name,
            `${item.quantity}g`,
            `${Math.round((item.calories * item.quantity) / 100)} kcal`,
            `P: ${((item.protein * item.quantity) / 100).toFixed(1)}g  C: ${((item.carbs * item.quantity) / 100).toFixed(1)}g  G: ${((item.fat * item.quantity) / 100).toFixed(1)}g`
          ]);
        });
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Refeição', 'Alimento', 'Qtd', 'Kcal', 'Macros']],
        body: planBody,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: primaryColor }, 4: { cellWidth: 55 } },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    // Seção: Diário do Dia
    if (dietLogs?.length > 0) {
      if (yPos > 230) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(...primaryColor);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`🍽️ Diário Alimentar — ${activeDate}`, 14, yPos);
      yPos += 6;

      const logBody = dietLogs.map(log => [
        log.meal_name,
        log.food_name,
        `${Number(log.quantity).toFixed(0)}g`,
        `${Math.round(Number(log.calories))} kcal`,
        `P: ${Number(log.protein).toFixed(1)}g  C: ${Number(log.carbs).toFixed(1)}g  G: ${Number(log.fat).toFixed(1)}g`
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Refeição', 'Alimento', 'Qtd', 'Kcal', 'Macros']],
        body: logBody,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 255, 248] },
        columnStyles: { 0: { fontStyle: 'bold', textColor: [16, 185, 129] }, 4: { cellWidth: 55 } },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Totais
      const totCal = dietLogs.reduce((s, l) => s + Math.round(Number(l.calories)), 0);
      const totProt = dietLogs.reduce((s, l) => s + Number(l.protein), 0);
      const totCarbs = dietLogs.reduce((s, l) => s + Number(l.carbs), 0);
      const totFat = dietLogs.reduce((s, l) => s + Number(l.fat), 0);

      doc.setFillColor(240, 255, 248);
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(14, yPos, 182, 14, 3, 3, 'FD');
      doc.setTextColor(...grayColor);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL DO DIA:  ${totCal} kcal  |  P: ${totProt.toFixed(1)}g  |  C: ${totCarbs.toFixed(1)}g  |  G: ${totFat.toFixed(1)}g`, 20, yPos + 9);
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(`FitLife · Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 292);
      doc.text(`Página ${i} de ${pageCount}`, 196, 292, { align: 'right' });
    }

    doc.save(`dieta_${activeDate}.pdf`);
  };

  // ==========================================
  // FUNÇÕES DE IMPORTAÇÃO DE PLANO EXCEL
  // ==========================================
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportError('');
    setImportPreviewData(null);
    setImportLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/diet/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data && res.data.ok) {
        setImportPreviewData(res.data);
      } else {
        setImportError(res.data.error || 'Erro ao processar arquivo.');
      }
    } catch (err) {
      console.error(err);
      setImportError(err.response?.data?.error || 'Erro de rede ao analisar o Excel.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreviewData || !importPreviewData.meals) return;
    setImportLoading(true);
    setImportError('');

    try {
      const res = await axios.post('/api/diet/import/confirm', {
        meals: importPreviewData.meals
      });
      if (res.data && res.data.ok) {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreviewData(null);
        if (onRefreshData) {
          onRefreshData();
        }
        alert(lang === 'pt' ? 'Plano de dieta importado com sucesso!' : 'Diet plan imported successfully!');
      } else {
        setImportError(res.data.error || 'Erro ao salvar o plano.');
      }
    } catch (err) {
      console.error(err);
      setImportError(err.response?.data?.error || 'Erro de rede ao salvar plano.');
    } finally {
      setImportLoading(false);
    }
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

  // Agrupamento do diário dinâmico baseado no perfil do usuário
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
  mealsStructure.forEach(m => groupedDietLogs[m] = dietLogs.filter(l => l.meal_name === m));
  dietLogs.forEach(l => {
    if (!mealsStructure.includes(l.meal_name)) {
      if (!groupedDietLogs[l.meal_name]) groupedDietLogs[l.meal_name] = [];
      groupedDietLogs[l.meal_name].push(l);
    }
  });

  // Cálculo das calorias e macros reais planejados no plano recomendado base
  let plannedCal = 0;
  let plannedProtein = 0;
  let plannedCarbs = 0;
  let plannedFat = 0;

  if (diet?.meals) {
    diet.meals.forEach(meal => {
      meal.items?.forEach(item => {
        const itemCal = Math.round((Number(item.calories || 0) * Number(item.quantity || 0)) / 100);
        const itemProt = (Number(item.protein || 0) * Number(item.quantity || 0)) / 100;
        const itemCarbs = (Number(item.carbs || 0) * Number(item.quantity || 0)) / 100;
        const itemFat = (Number(item.fat || 0) * Number(item.quantity || 0)) / 100;

        plannedCal += itemCal;
        plannedProtein += itemProt;
        plannedCarbs += itemCarbs;
        plannedFat += itemFat;
      });
    });
  }

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

        <div className="flex items-center gap-2">
          {/* Botão de Exportação */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(v => !v)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {lang === 'pt' ? 'Exportar' : 'Export'}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { handleExportExcel(); setShowExportMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="text-lg">📊</span>
                    {lang === 'pt' ? 'Exportar Excel (.xlsx)' : 'Export Excel (.xlsx)'}
                  </button>
                  <button
                    onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
                    className="w-full px-3 py-2.5 text-left text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400 rounded-lg transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <span className="text-lg">📄</span>
                    {lang === 'pt' ? 'Exportar PDF' : 'Export PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botão de Importação */}
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            {lang === 'pt' ? 'Importar' : 'Import'}
          </button>

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
                  {plannedCal > 0 ? plannedCal : profile.targetCalories} kcal • P:{plannedCal > 0 ? Math.round(plannedProtein) : profile.macros.protein}g C:{plannedCal > 0 ? Math.round(plannedCarbs) : profile.macros.carbs}g G:{plannedCal > 0 ? Math.round(plannedFat) : profile.macros.fat}g
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
                                {!isEditingBasePlan && `${item.quantity}g${item.name?.toLowerCase().includes('ovo') ? ` (~${(Number(item.quantity) / 50).toFixed(1).replace('.0', '')} unid)` : ''} • `}
                                {isEditingBasePlan && item.name?.toLowerCase().includes('ovo') && (
                                  <span className="text-blue-500 dark:text-blue-400 font-bold mr-1">
                                    ~{(Number(item.quantity) / 50).toFixed(1).replace('.0', '')} unid •
                                  </span>
                                )}
                                {Math.round((item.calories * item.quantity) / 100)} kcal
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
                                <div className="flex items-center gap-1.5">
                                  {/* Controle interativo de quantidade no plano base */}
                                  <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 mr-1 shadow-sm">
                                    <button 
                                      onClick={() => handleAdjustBasePlanItemQuantity(meal.id, item, 'decrement')} 
                                      className="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[10px] font-extrabold cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => handleEditBasePlanItemQuantityDirectly(meal.id, item)}
                                      className="px-2 py-0.5 text-[9px] font-bold text-zinc-700 dark:text-zinc-300 border-x border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-500 transition-colors cursor-pointer"
                                      title={lang === 'pt' ? 'Clique para alterar a quantidade' : 'Click to edit quantity'}
                                    >
                                      {Number(item.quantity).toFixed(0)}g
                                    </button>
                                    <button 
                                      onClick={() => handleAdjustBasePlanItemQuantity(meal.id, item, 'increment')} 
                                      className="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[10px] font-extrabold cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>

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
                        placeholder={lang === 'pt' ? "Ex: iogurte, ovo, frango, arroz..." : "Search food..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>

                    {searchTerm.trim() !== '' && searchResults.length === 0 && (
                      <p className="text-xs text-zinc-400 text-center py-1">
                        🔍 Nenhum resultado para "<strong>{searchTerm}</strong>"
                      </p>
                    )}

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
                                    <span>
                                      {item.quantity}g
                                      {item.food_name?.toLowerCase().includes('ovo') && ` (~${(Number(item.quantity) / 50).toFixed(1).replace('.0', '')} unid)`}
                                    </span>
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
                                    <button onClick={() => handleAdjustLogQuantity(item, 'decrement')} className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer">-</button>
                                    <button
                                      onClick={() => handleEditLogQuantityDirectly(item)}
                                      className="px-2.5 py-1 text-[9px] font-bold text-zinc-700 dark:text-zinc-300 border-x border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-500 transition-colors cursor-pointer"
                                      title={lang === 'pt' ? 'Clique para alterar a quantidade' : 'Click to edit quantity'}
                                    >
                                      {Number(item.quantity).toFixed(0)}g
                                    </button>
                                    <button onClick={() => handleAdjustLogQuantity(item, 'increment')} className="px-2.5 py-1 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-extrabold cursor-pointer">+</button>
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
                });
              })()
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
                    placeholder="Ex: ovo, frango, aveia, whey..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  {searchLoading && searchQuery.trim() !== '' && (
                    <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[220px] overflow-y-auto">
                  {searchLoading && searchQuery.trim() !== '' ? (
                    <div className="p-4 text-center text-xs text-zinc-400">Buscando...</div>
                  ) : searchQuery.trim() !== '' && searchQueryResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      <span className="block text-lg mb-1">🔍</span>
                      Nenhum alimento encontrado para "<strong>{searchQuery}</strong>"
                    </div>
                  ) : (
                    searchQueryResults.map(food => (
                      <button
                        key={food.id}
                        onClick={() => setSelectedFood(food)}
                        className={`w-full text-left p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900 flex justify-between items-center transition-colors ${
                          selectedFood?.id === food.id ? 'bg-blue-500/10 font-bold text-blue-600' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span>{food.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">{food.calories} kcal/100g</span>
                      </button>
                    ))
                  )}
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

              {/* Preferências Alimentares (Refeições e Whey) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Refeições por dia' : 'Meals per day'}</label>
                  <select
                    value={recalculateForm.mealsPerDay}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, mealsPerDay: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value={3}>{lang === 'pt' ? '3 refeições' : '3 meals'}</option>
                    <option value={4}>{lang === 'pt' ? '4 refeições' : '4 meals'}</option>
                    <option value={5}>{lang === 'pt' ? '5 refeições' : '5 meals'}</option>
                    <option value={6}>{lang === 'pt' ? '6 refeições' : '6 meals'}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{lang === 'pt' ? 'Incluir Whey Protein?' : 'Include Whey?'}</label>
                  <select
                    value={recalculateForm.useWhey ? 'yes' : 'no'}
                    onChange={(e) => setRecalculateForm({ ...recalculateForm, useWhey: e.target.value === 'yes' })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-zinc-800 dark:text-zinc-200 focus:outline-none"
                  >
                    <option value="yes">{lang === 'pt' ? 'Sim, utilizar' : 'Yes, use'}</option>
                    <option value="no">{lang === 'pt' ? 'Não utilizar' : 'No, do not use'}</option>
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

      {/* Modal de Importação de Dieta (Excel) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-extrabold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-500" />
                {lang === 'pt' ? 'Importar Plano de Dieta' : 'Import Diet Plan'}
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreviewData(null);
                  setImportError('');
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs font-bold"
              >
                {lang === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lang === 'pt'
                ? 'Selecione uma planilha de dieta exportada (.xlsx) para importar e aplicar como seu novo Plano Recomendado.'
                : 'Upload a diet spreadsheet (.xlsx) to import as your new Recommended Plan.'}
            </p>

            {/* Input de Arquivo */}
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-6 transition-all bg-zinc-50 dark:bg-zinc-900/30 relative">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Upload className="w-8 h-8 text-zinc-400 mb-2 animate-bounce" />
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {importFile ? importFile.name : (lang === 'pt' ? 'Clique ou arraste a planilha aqui' : 'Click or drag spreadsheet here')}
              </span>
              <span className="text-[10px] text-zinc-400 mt-1">Apenas arquivos (.xlsx)</span>
            </div>

            {/* Loading */}
            {importLoading && (
              <div className="flex justify-center items-center py-6">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2 font-bold">
                  {lang === 'pt' ? 'Processando dados...' : 'Processing data...'}
                </span>
              </div>
            )}

            {/* Mensagem de Erro */}
            {importError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold text-center">
                ⚠️ {importError}
              </div>
            )}

            {/* Preview da Importação */}
            {importPreviewData && (
              <div className="space-y-4 pt-2">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl space-y-3">
                  <h4 className="text-xs font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-center">
                    {lang === 'pt' ? 'Resumo dos Macronutrientes a Importar' : 'Macros Summary to Import'}
                  </h4>
                  
                  {/* Totais de Macros Importados */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase">Kcal</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                        {importPreviewData.totals.calories}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase">Prot (g)</span>
                      <span className="text-sm font-black text-rose-500">
                        {importPreviewData.totals.protein}g
                      </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase">Carb (g)</span>
                      <span className="text-sm font-black text-blue-500">
                        {importPreviewData.totals.carbs}g
                      </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <span className="block text-[10px] font-bold text-zinc-400 uppercase">Gord (g)</span>
                      <span className="text-sm font-black text-amber-500">
                        {importPreviewData.totals.fat}g
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista Simplificada das Refeições do Preview */}
                <div className="space-y-2 max-h-48 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
                  <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {lang === 'pt' ? 'Estrutura das Refeições' : 'Meals Structure'}
                  </h5>
                  {importPreviewData.meals.map((meal, mIdx) => (
                    <div key={mIdx} className="text-xs border-b border-zinc-100 dark:border-zinc-800 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                      <div className="flex justify-between items-center font-bold text-zinc-850 dark:text-zinc-200">
                        <span>🍴 {meal.name}</span>
                        <span className="text-[10px] text-zinc-400 font-normal">
                          {meal.items?.length || 0} {meal.items?.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                        {meal.items?.map(i => `${i.name} (${i.quantity}g)`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botões do Rodapé */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportFile(null);
                      setImportPreviewData(null);
                      setImportError('');
                    }}
                    className="flex-1 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                  >
                    {lang === 'pt' ? 'Limpar' : 'Clear'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {lang === 'pt' ? 'Confirmar Importação' : 'Confirm Import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
