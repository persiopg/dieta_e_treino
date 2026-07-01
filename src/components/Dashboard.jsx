import React, { useState } from 'react';
import { 
  Droplet, 
  Flame, 
  Dumbbell, 
  Calendar, 
  Plus, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  Apple,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Scale
} from 'lucide-react';

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
  setWorkoutDoneToday 
}) {
  const [weightInput, setWeightInput] = useState(profile?.weight || '');
  const [weightSuccess, setWeightSuccess] = useState(false);

  // Fallback se o perfil não estiver configurado
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

  // Cálculos de Água
  const waterTarget = profile.weight ? profile.weight * 35 : 2500; // 35ml por kg de peso
  const waterPercentage = Math.min(Math.round((waterIntake / waterTarget) * 100), 100);

  // Cálculos de Nutrição a partir da dieta atual
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;
  let consumedCalories = 0;

  if (diet && diet.meals) {
    diet.meals.forEach(meal => {
      if (meal.items) {
        meal.items.forEach(item => {
          consumedProtein += Math.round((item.protein * item.quantity) / 100);
          consumedCarbs += Math.round((item.carbs * item.quantity) / 100);
          consumedFat += Math.round((item.fat * item.quantity) / 100);
          consumedCalories += Math.round((item.calories * item.quantity) / 100);
        });
      }
    });
  }

  const caloriePercentage = Math.min(Math.round((consumedCalories / profile.targetCalories) * 100), 100);
  const proteinPercentage = Math.min(Math.round((consumedProtein / profile.macros.protein) * 100), 100);
  const carbsPercentage = Math.min(Math.round((consumedCarbs / profile.macros.carbs) * 100), 100);
  const fatPercentage = Math.min(Math.round((consumedFat / profile.macros.fat) * 100), 100);

  const remainingCalories = profile.targetCalories - consumedCalories;

  // Frase de conselho dinâmico da IA
  const getAiMessage = () => {
    if (waterPercentage < 50) {
      return {
        text: 'Lembre-se de beber água! A hidratação adequada ajuda na síntese proteica e na queima de gordura.',
        variant: 'warning'
      };
    }
    if (!workoutDoneToday) {
      return {
        text: `Que tal realizar seu treino de hoje? O preset atual é o "${workout?.name || 'Treino'}".`,
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
  };

  const aiMessage = getAiMessage();

  const handleQuickWaterAdd = (amount) => {
    setWaterIntake(waterIntake + amount);
  };

  const handleWaterReset = () => {
    setWaterIntake(0);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
      
      {/* Cabeçalho de Boas-Vindas */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Olá, Campeão! 🚀
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Aqui está o resumo do seu desempenho físico e nutricional para hoje.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>Hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* Caixa de Mensagem Inteligente (AI Insight) */}
      <div className={`p-4 rounded-xl border flex gap-3 items-start transition-all ${
        aiMessage.variant === 'warning' ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300' :
        aiMessage.variant === 'danger' ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300' :
        aiMessage.variant === 'info' ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30 text-blue-800 dark:text-blue-300' :
        'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
      }`}>
        <div className="p-1 rounded bg-white dark:bg-zinc-900 border shadow-sm">
          <Sparkles className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider block mb-0.5">Insight do seu Assistente</span>
          <p className="text-sm leading-relaxed font-medium">{aiMessage.text}</p>
        </div>
      </div>

      {/* Grid de KPIs principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI: Calorias */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">Calorias Ingeridas</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">{consumedCalories}</span>
            <span className="text-xs text-zinc-400 font-medium">/ {profile.targetCalories} kcal</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${caloriePercentage}%` }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{caloriePercentage}% da meta</span>
            <span className={remainingCalories >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {remainingCalories >= 0 ? `${remainingCalories} kcal restantes` : `${Math.abs(remainingCalories)} kcal acima`}
            </span>
          </div>
        </div>

        {/* KPI: Água */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">Hidratação diária</span>
            <Droplet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">{waterIntake}</span>
            <span className="text-xs text-zinc-400 font-medium">/ {Math.round(waterTarget)} ml</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${waterPercentage}%` }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{waterPercentage}% da meta</span>
            <span>Meta: {(waterTarget / 1000).toFixed(1)} Litros</span>
          </div>
        </div>

        {/* KPI: Treino */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">Treino do Dia</span>
            <Dumbbell className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 py-1">
            {workoutDoneToday ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <CheckCircle className="w-5 h-5" />
                <span>Treino Feito!</span>
              </div>
            ) : (
              <div className="text-zinc-800 dark:text-zinc-200 font-bold text-md truncate max-w-full">
                {workout ? workout.name.split(' (')[0] : 'Nenhum Ativo'}
              </div>
            )}
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${workoutDoneToday ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} style={{ width: workoutDoneToday ? '100%' : '30%' }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>{workoutDoneToday ? 'Concluído hoje' : 'Aguardando execução'}</span>
            <button 
              onClick={() => setActiveTab('workout')} 
              className="text-blue-500 hover:underline font-bold text-[11px]"
            >
              Acessar treinos
            </button>
          </div>
        </div>

        {/* KPI: Peso Atual */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-xs font-bold uppercase tracking-wide">Peso Atual</span>
            <Scale className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between w-full">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-zinc-900 dark:text-zinc-50">{profile.weight}</span>
              <span className="text-xs text-zinc-400 font-medium">kg</span>
            </div>
            <button 
              onClick={() => {
                const newW = window.prompt("Digite o seu peso atual (em kg):", profile.weight);
                if (newW && Number(newW) > 0) {
                  setProfile({
                    ...profile,
                    weight: Number(newW)
                  });
                }
              }}
              className="text-xs text-indigo-500 hover:underline font-bold"
            >
              Atualizar
            </button>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 flex justify-between">
            <span>Objetivo: {profile.goal === 'emagrecimento' ? 'Reduzir' : profile.goal === 'hipertrofia' ? 'Aumentar' : 'Manter'}</span>
            <span className="capitalize font-bold text-indigo-500">{profile.goal}</span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal Dividido: Dieta Macros & Rastreadores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Seção 1 & 2: Nutrição e Macros */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Apple className="w-5 h-5 text-rose-500" />
              Consumo de Macronutrientes
            </h3>
            <button 
              onClick={() => setActiveTab('diet')}
              className="text-xs font-bold text-blue-500 hover:underline"
            >
              Ir para Dieta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Proteínas */}
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500">Proteínas (P)</span>
                <span className="text-xs font-semibold text-rose-500 font-mono">{consumedProtein}g / {profile.macros.protein}g</span>
              </div>
              <div className="relative h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${proteinPercentage}%` }}></div>
              </div>
              <span className="text-[10px] text-zinc-400 block font-semibold">{proteinPercentage}% da meta diária</span>
            </div>

            {/* Carboidratos */}
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500">Carboidratos (C)</span>
                <span className="text-xs font-semibold text-blue-500 font-mono">{consumedCarbs}g / {profile.macros.carbs}g</span>
              </div>
              <div className="relative h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${carbsPercentage}%` }}></div>
              </div>
              <span className="text-[10px] text-zinc-400 block font-semibold">{carbsPercentage}% da meta diária</span>
            </div>

            {/* Gorduras */}
            <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-500">Gorduras (G)</span>
                <span className="text-xs font-semibold text-amber-500 font-mono">{consumedFat}g / {profile.macros.fat}g</span>
              </div>
              <div className="relative h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${fatPercentage}%` }}></div>
              </div>
              <span className="text-[10px] text-zinc-400 block font-semibold">{fatPercentage}% da meta diária</span>
            </div>
          </div>

          {/* Gráfico Visual de Linha Simples (Status do plano) */}
          <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/20 dark:bg-zinc-900/5">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide block mb-3">Refeições de hoje</span>
            {diet && diet.meals && diet.meals.length > 0 ? (
              <div className="space-y-3">
                {diet.meals.map((meal, index) => {
                  let mealCal = 0;
                  if (meal.items) {
                    meal.items.forEach(i => mealCal += Math.round((i.calories * i.quantity) / 100));
                  }
                  return (
                    <div key={index} className="flex justify-between items-center text-sm border-b border-zinc-50 dark:border-zinc-900/50 pb-2 last:border-0 last:pb-0">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{meal.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-500 dark:text-zinc-400 text-xs">{meal.items?.length || 0} alimentos</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{mealCal} kcal</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-zinc-400">Nenhuma refeição configurada na dieta atual.</div>
            )}
          </div>
        </div>

        {/* Seção Lateral: Registro Rápido & Ajustes */}
        <div className="space-y-6">
          {/* Rastreador de Água Rápido */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Droplet className="w-5 h-5 text-blue-500" />
              Controle de Hidratação
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Consumir água melhora a oxigenação muscular e ajuda no bom funcionamento do organismo durante exercícios intensos.
            </p>

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
                className="flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> +250ml
              </button>
              <button
                onClick={() => handleQuickWaterAdd(500)}
                className="flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> +500ml
              </button>
            </div>
            <button
              onClick={handleWaterReset}
              className="w-full flex items-center justify-center gap-1.5 border border-transparent text-[11px] font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg py-1 transition-all"
            >
              <RotateCcw className="w-3 h-3" /> Reiniciar Contador
            </button>
          </div>

          {/* Card: Registrar Novo Peso */}
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-500" />
              Atualizar Peso
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  placeholder="Ex: 75.4"
                  value={weightInput}
                  onChange={(e) => {
                    setWeightInput(e.target.value);
                    setWeightSuccess(false);
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
                <span className="absolute right-3 top-2.5 text-xs text-zinc-400">kg</span>
              </div>
              <button
                onClick={() => {
                  if (weightInput > 0) {
                    setProfile({
                      ...profile,
                      weight: Number(weightInput)
                    });
                    setWeightSuccess(true);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 rounded-xl shadow-sm transition-all"
              >
                Salvar
              </button>
            </div>

            {weightSuccess && (
              <span className="text-[11px] text-emerald-600 font-bold block">Peso atualizado com sucesso! Os cálculos do planejamento serão ajustados no próximo wizard.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
