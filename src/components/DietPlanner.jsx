import React, { useState } from 'react';
import axios from 'axios';
import { initialFoodDatabase } from '../data/foodDatabase';
import { 
  Plus, 
  Trash2, 
  Apple, 
  Search, 
  Info,
  Sparkles,
  PlusCircle,
  FolderHeart
} from 'lucide-react';

export default function DietPlanner({ diet, setDiet, profile }) {
  const [activeMealIndex, setActiveMealIndex] = useState(null); // Para modal de adição (índice da refeição na array diet.meals)
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para cadastro de alimento customizado no modal
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 2,
    quantity: 100
  });

  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(100);

  // Totais Atuais da Dieta
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalCalories = 0;

  if (diet && diet.meals) {
    diet.meals.forEach(meal => {
      if (meal.items) {
        meal.items.forEach(item => {
          totalProtein += (item.protein * item.quantity) / 100;
          totalCarbs += (item.carbs * item.quantity) / 100;
          totalFat += (item.fat * item.quantity) / 100;
          totalCalories += (item.calories * item.quantity) / 100;
        });
      }
    });
  }

  totalProtein = Math.round(totalProtein);
  totalCarbs = Math.round(totalCarbs);
  totalFat = Math.round(totalFat);
  totalCalories = Math.round(totalCalories);

  // Alterar preset de dieta completo no banco de dados
  const handlePresetSelect = async (presetKey) => {
    if (window.confirm('Tem certeza que deseja substituir sua dieta atual por este preset? Todas as modificações anteriores serão perdidas.')) {
      try {
        const res = await axios.post('/api/diet/preset', { presetKey });
        setDiet(res.data);
      } catch (err) {
        console.error('Erro ao aplicar preset de dieta no banco.', err);
        alert('Erro ao aplicar o preset de dieta.');
      }
    }
  };

  // Atualizar a quantidade de um alimento existente no banco
  const handleQuantityChange = async (mealIdx, itemIdx, newQty) => {
    if (newQty < 0 || newQty === '') return;
    
    const meal = diet.meals[mealIdx];
    const item = meal.items[itemIdx];
    
    try {
      // 1. Atualizar no banco de dados
      await axios.put(`/api/diet/meal/${meal.id}/item/${item.id}`, { quantity: Number(newQty) });
      
      // 2. Atualizar estado local
      const updatedDiet = { ...diet };
      updatedDiet.meals[mealIdx].items[itemIdx].quantity = Number(newQty);
      setDiet(updatedDiet);
    } catch (err) {
      console.error('Erro ao atualizar quantidade do alimento no banco.', err);
    }
  };

  // Remover alimento de uma refeição no banco
  const handleRemoveFood = async (mealIdx, itemIdx) => {
    const meal = diet.meals[mealIdx];
    const item = meal.items[itemIdx];

    try {
      // 1. Remover no banco
      await axios.delete(`/api/diet/meal/${meal.id}/item/${item.id}`);
      
      // 2. Atualizar estado local
      const updatedDiet = { ...diet };
      updatedDiet.meals[mealIdx].items.splice(itemIdx, 1);
      setDiet(updatedDiet);
    } catch (err) {
      console.error('Erro ao excluir alimento no banco.', err);
    }
  };

  // Abrir modal de adição para refeição específica
  const openAddFood = (mealIdx) => {
    setActiveMealIndex(mealIdx);
    setShowAddFoodModal(true);
    setSelectedFood(null);
    setSelectedQuantity(100);
    setSearchQuery('');
  };

  // Adicionar alimento selecionado da biblioteca no banco
  const handleAddFoodFromDb = async () => {
    if (!selectedFood || activeMealIndex === null) return;
    const meal = diet.meals[activeMealIndex];

    try {
      // 1. Criar no banco
      const res = await axios.post(`/api/diet/meal/${meal.id}/item`, {
        name: selectedFood.name,
        quantity: Number(selectedQuantity),
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        calories: selectedFood.calories
      });

      // 2. Inserir no estado local
      const updatedDiet = { ...diet };
      updatedDiet.meals[activeMealIndex].items.push(res.data);
      setDiet(updatedDiet);
      setShowAddFoodModal(false);
    } catch (err) {
      console.error('Erro ao adicionar alimento no banco.', err);
    }
  };

  // Adicionar alimento customizado no banco
  const handleAddCustomFood = async () => {
    if (!customFoodForm.name.trim() || activeMealIndex === null) return alert('Insira o nome do alimento');
    const meal = diet.meals[activeMealIndex];

    try {
      // 1. Criar no banco
      const res = await axios.post(`/api/diet/meal/${meal.id}/item`, {
        name: customFoodForm.name,
        quantity: Number(customFoodForm.quantity),
        protein: Number(customFoodForm.protein),
        carbs: Number(customFoodForm.carbs),
        fat: Number(customFoodForm.fat),
        calories: Number(customFoodForm.calories)
      });

      // 2. Inserir no estado local
      const updatedDiet = { ...diet };
      updatedDiet.meals[activeMealIndex].items.push(res.data);
      setDiet(updatedDiet);
      setShowAddFoodModal(false);
      
      // Reset formulário
      setCustomFoodForm({
        name: '',
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 2,
        quantity: 100
      });
    } catch (err) {
      console.error('Erro ao criar alimento customizado no banco.', err);
    }
  };

  // Adicionar Nova Refeição customizada no banco
  const handleAddMeal = async () => {
    const mealNames = ['Lanche da Noite', 'Ceia', 'Lanche da Manhã', 'Lanche Pré-Treino', 'Lanche Pós-Treino'];
    const count = diet?.meals?.length || 0;
    const defaultName = mealNames[count % mealNames.length] || `Nova Refeição ${count + 1}`;
    
    const name = window.prompt('Qual o nome da nova refeição?', defaultName);
    if (!name) return;

    try {
      // 1. Criar no banco
      const res = await axios.post('/api/diet/meal', { name });
      
      // 2. Inserir no estado local
      const updatedDiet = { ...diet };
      if (!updatedDiet.meals) updatedDiet.meals = [];
      updatedDiet.meals.push(res.data);
      setDiet(updatedDiet);
    } catch (err) {
      console.error('Erro ao criar nova refeição no banco.', err);
    }
  };

  // Remover refeição inteira do banco
  const handleRemoveMeal = async (mealIdx) => {
    const meal = diet.meals[mealIdx];
    if (window.confirm(`Deseja excluir toda a refeição "${meal.name}"?`)) {
      try {
        // 1. Excluir no banco
        await axios.delete(`/api/diet/meal/${meal.id}`);
        
        // 2. Remover do estado local
        const updatedDiet = { ...diet };
        updatedDiet.meals.splice(mealIdx, 1);
        setDiet(updatedDiet);
      } catch (err) {
        console.error('Erro ao excluir refeição no banco.', err);
      }
    }
  };

  // Filtragem da busca de alimentos no banco
  const filteredFoods = initialFoodDatabase.filter(food => 
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    food.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
            <Apple className="w-8 h-8 text-rose-500" />
            Dieta & Nutrição
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Plano ativo: <strong className="text-zinc-900 dark:text-zinc-100">{diet?.name || 'Dieta Customizada'}</strong>
          </p>
        </div>

        {/* Escolha de Presets */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePresetSelect('emagrecimento')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Dieta Cutting (Definição)
          </button>
          <button
            onClick={() => handlePresetSelect('manutencao')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Dieta Manutenção
          </button>
          <button
            onClick={() => handlePresetSelect('hipertrofia')}
            className="text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-2 rounded-xl font-semibold transition-all"
          >
            Dieta Bulking (Hipertrofia)
          </button>
        </div>
      </div>

      {/* Painel Nutricional Superior (Barra de Progresso) */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-md font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <FolderHeart className="w-5 h-5 text-rose-500" />
          Acompanhamento Nutricional do Dia
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Calorias */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-zinc-500">
              <span>Energia Diária</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{totalCalories} kcal / {profile?.targetCalories || 2000} kcal</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalCalories / (profile?.targetCalories || 2000)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Proteína */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-zinc-500">
              <span>Proteínas</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{totalProtein}g / {profile?.macros?.protein || 140}g</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalProtein / (profile?.macros?.protein || 140)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Carboidratos */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-zinc-500">
              <span>Carboidratos</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{totalCarbs}g / {profile?.macros?.carbs || 200}g</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalCarbs / (profile?.macros?.carbs || 200)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Gordura */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-zinc-500">
              <span>Gorduras</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{totalFat}g / {profile?.macros?.fat || 60}g</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalFat / (profile?.macros?.fat || 60)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Lista de Refeições & Dicas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco Refeições (2/3 da largura) */}
        <div className="lg:col-span-2 space-y-4">
          {diet && diet.meals && diet.meals.length > 0 ? (
            diet.meals.map((meal, mealIdx) => {
              // Calcular macros por refeição
              let mealCal = 0;
              let mealProt = 0;
              let mealCarbs = 0;
              let mealFat = 0;
              if (meal.items) {
                meal.items.forEach(i => {
                  mealCal += (i.calories * i.quantity) / 100;
                  mealProt += (i.protein * i.quantity) / 100;
                  mealCarbs += (i.carbs * i.quantity) / 100;
                  mealFat += (i.fat * i.quantity) / 100;
                });
              }
              mealCal = Math.round(mealCal);
              mealProt = Math.round(mealProt);
              mealCarbs = Math.round(mealCarbs);
              mealFat = Math.round(mealFat);

              return (
                <div 
                  key={mealIdx}
                  className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  {/* Cabeçalho da refeição */}
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-2">
                    <div>
                      <h3 className="font-bold text-zinc-950 dark:text-zinc-50 text-md">{meal.name}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400 font-semibold mt-0.5 font-mono">
                        <span>P: {mealProt}g</span>
                        <span>C: {mealCarbs}g</span>
                        <span>G: {mealFat}g</span>
                        <span className="text-zinc-500 font-bold">| {mealCal} kcal</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRemoveMeal(mealIdx)}
                        className="text-[10px] font-bold text-zinc-400 hover:text-rose-500 border border-zinc-100 dark:border-zinc-800 px-2 py-1 rounded-lg"
                      >
                        Excluir Refeição
                      </button>
                      <button
                        onClick={() => openAddFood(mealIdx)}
                        className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Alimentos na refeição */}
                  {meal.items && meal.items.length > 0 ? (
                    <div className="space-y-3">
                      {meal.items.map((item, itemIdx) => {
                        const calculatedCal = Math.round((item.calories * item.quantity) / 100);
                        const calculatedProt = Math.round((item.protein * item.quantity) / 100);
                        const calculatedCarbs = Math.round((item.carbs * item.quantity) / 100);
                        const calculatedFat = Math.round((item.fat * item.quantity) / 100);

                        return (
                          <div 
                            key={itemIdx} 
                            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-3 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-100/50 dark:border-zinc-800/50 rounded-xl"
                          >
                            <div className="flex-1">
                              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm block">{item.name}</span>
                              <span className="text-[10px] text-zinc-400 font-semibold font-mono block mt-0.5">
                                P: {calculatedProt}g | C: {calculatedCarbs}g | G: {calculatedFat}g
                              </span>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                              {/* Input de quantidade */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(mealIdx, itemIdx, e.target.value)}
                                  className="w-16 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs text-center font-semibold font-mono"
                                />
                                <span className="text-xs text-zinc-400">g/ml</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">{calculatedCal} kcal</span>
                                <button
                                  onClick={() => handleRemoveFood(mealIdx, itemIdx)}
                                  className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4.5 h-4.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-zinc-400">Nenhum alimento registrado nesta refeição.</div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Apple className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-md font-bold text-zinc-800 dark:text-zinc-200">Dieta Vazia</h3>
              <p className="text-xs text-zinc-500 mt-1">Crie refeições para começar a estruturar sua nutrição.</p>
              <button onClick={handleAddMeal} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
                Criar Nova Refeição
              </button>
            </div>
          )}

          {/* Adicionar Nova Refeição Geral */}
          {diet && diet.meals && (
            <button
              onClick={handleAddMeal}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm font-bold text-zinc-500 rounded-xl py-3.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-blue-500" /> Adicionar Refeição
            </button>
          )}
        </div>

        {/* Dicas e Assistência IA lateral */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-md font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Importância dos Macros
            </h3>
            <div className="space-y-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <p>
                💡 <strong className="text-zinc-700 dark:text-zinc-300">Proteínas:</strong> Essenciais para a reconstrução muscular pós-treino e manutenção do tecido magro durante o emagrecimento.
              </p>
              <p>
                ⚡ <strong className="text-zinc-700 dark:text-zinc-300">Carboidratos:</strong> A principal fonte de energia rápida para o seu corpo treinar com intensidade e força máxima.
              </p>
              <p>
                🥑 <strong className="text-zinc-700 dark:text-zinc-300">Gorduras:</strong> Indispensáveis para a regulação dos hormônios anabólicos e absorção de vitaminas lipossolúveis.
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex gap-2 items-center text-[10px] text-zinc-400 font-semibold uppercase">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>Ajuste a quantidade em gramas livremente!</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PARA BUSCA E ADIÇÃO DE ALIMENTOS */}
      {showAddFoodModal && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl w-full max-w-xl p-6 flex flex-col max-h-[85vh]">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Adicionar Alimento</h3>
              <button 
                onClick={() => setShowAddFoodModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Input de Quantidade para o alimento selecionado */}
            {selectedFood && (
              <div className="mb-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-xs text-blue-900 dark:text-blue-200 block">{selectedFood.name}</span>
                  <span className="text-[10px] text-blue-500 font-semibold block mt-0.5">Calorias/100g: {selectedFood.calories} kcal</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1">
                    <input
                      type="number"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(e.target.value)}
                      className="w-12 bg-transparent text-xs text-center font-bold font-mono focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-400">g</span>
                  </div>
                  <button
                    onClick={handleAddFoodFromDb}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            )}

            {/* Busca */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Pesquisar alimento na biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>

            {/* Lista da Base de Dados */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-2 bg-zinc-50/20 dark:bg-zinc-950/20">
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => {
                      setSelectedFood(food);
                      setSelectedQuantity(100);
                    }}
                    className={`w-full text-left p-3 border rounded-xl flex justify-between items-center bg-white dark:bg-zinc-900 transition-all ${
                      selectedFood?.id === food.id
                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                        : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block">{food.name}</span>
                      <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">
                        P: {food.protein}g | C: {food.carbs}g | G: {food.fat}g | {food.calories} kcal (por {food.servingSize})
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-500 font-bold uppercase">+ Selecionar</span>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-zinc-400 space-y-4 text-left">
                  <p className="text-center">Nenhum alimento encontrado com "{searchQuery}".</p>
                  
                  {/* Formulário para Alimento Customizado */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 space-y-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Cadastrar Alimento Customizado</span>
                    
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Nome do alimento..."
                        value={customFoodForm.name}
                        onChange={(e) => setCustomFoodForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Kcal/100g</label>
                          <input
                            type="number"
                            value={customFoodForm.calories}
                            onChange={(e) => setCustomFoodForm(prev => ({ ...prev, calories: parseFloat(e.target.value) }))}
                            className="w-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Prot/100g</label>
                          <input
                            type="number"
                            value={customFoodForm.protein}
                            onChange={(e) => setCustomFoodForm(prev => ({ ...prev, protein: parseFloat(e.target.value) }))}
                            className="w-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Carb/100g</label>
                          <input
                            type="number"
                            value={customFoodForm.carbs}
                            onChange={(e) => setCustomFoodForm(prev => ({ ...prev, carbs: parseFloat(e.target.value) }))}
                            className="w-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Gord/100g</label>
                          <input
                            type="number"
                            value={customFoodForm.fat}
                            onChange={(e) => setCustomFoodForm(prev => ({ ...prev, fat: parseFloat(e.target.value) }))}
                            className="w-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-400 uppercase">Qtd (g/ml)</label>
                          <input
                            type="number"
                            value={customFoodForm.quantity}
                            onChange={(e) => setCustomFoodForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                            className="w-full mt-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleAddCustomFood}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-xl"
                      >
                        Cadastrar & Adicionar Alimento
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 mt-4 pt-3 flex justify-end">
              <button
                onClick={() => setShowAddFoodModal(false)}
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
