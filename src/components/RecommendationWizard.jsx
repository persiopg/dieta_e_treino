import React, { useState } from 'react';
import { initialDietPresets } from '../data/foodDatabase';
import { workoutPresets } from '../data/workoutPresets';
import { 
  User, 
  Activity, 
  Target, 
  Dumbbell, 
  TrendingUp, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Flame,
  Scale,
  Sparkles
} from 'lucide-react';

export default function RecommendationWizard({ onApplyPlan, profile }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: profile?.gender || 'male',
    age: profile?.age || 25,
    weight: profile?.weight || 70,
    height: profile?.height || 170,
    activityLevel: profile?.activityLevel || 1.375, // Levemente ativo
    goal: profile?.goal || 'emagrecimento',
    workoutDays: profile?.workoutDays || 4,
  });

  const [calculatedResult, setCalculatedResult] = useState(null);

  const activityOptions = [
    { value: 1.2, label: 'Sedentário', desc: 'Trabalho de escritório, pouco ou nenhum exercício.' },
    { value: 1.375, label: 'Levemente Ativo', desc: 'Exercício leve/esportes 1-3 dias por semana.' },
    { value: 1.55, label: 'Moderadamente Ativo', desc: 'Exercício moderado/esportes 3-5 dias por semana.' },
    { value: 1.725, label: 'Altamente Ativo', desc: 'Exercício intenso/esportes 6-7 dias por semana.' },
    { value: 1.9, label: 'Extremamente Ativo', desc: 'Trabalho físico diário ou treino de atleta.' },
  ];

  const goalOptions = [
    { value: 'emagrecimento', label: 'Emagrecimento & Definição', desc: 'Queimar gordura corporal mantendo o máximo de massa magra.', icon: Flame, color: 'text-rose-500 bg-rose-500/10' },
    { value: 'manutencao', label: 'Manutenção Saudável', desc: 'Manter o peso atual, melhorar performance e saúde geral.', icon: Scale, color: 'text-blue-500 bg-blue-500/10' },
    { value: 'hipertrofia', label: 'Ganho de Massa / Hipertrofia', desc: 'Superávit calórico focado na construção de novos tecidos musculares.', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      calculatePlan();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const calculatePlan = () => {
    const { gender, age, weight, height, activityLevel, goal, workoutDays } = formData;
    
    // Fórmula de Mifflin-St Jeor para TMB
    let bmr = 0;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Gasto Calórico Diário Total (TDEE)
    const tdee = Math.round(bmr * activityLevel);

    // Ajuste calórico por objetivo
    let targetCalories = tdee;
    let calorieFactor = 1.0;
    
    if (goal === 'emagrecimento') {
      calorieFactor = 0.8; // 20% déficit
      targetCalories = Math.round(tdee - 500); // 500 kcal de déficit padrão
      if (targetCalories < bmr * 0.9) targetCalories = Math.round(bmr * 0.9); // Evita déficit excessivo
    } else if (goal === 'hipertrofia') {
      calorieFactor = 1.15; // 15% superávit
      targetCalories = Math.round(tdee + 300); // 300 kcal superávit padrão
    }

    // Recomendação de Macros (Proteína, Gordura, Carboidratos)
    let pMultiplier = 2.0; // g/kg
    let fMultiplier = 0.9; // g/kg

    if (goal === 'emagrecimento') {
      pMultiplier = 2.2; // Mais proteína para saciedade e proteção muscular
      fMultiplier = 0.8;
    } else if (goal === 'hipertrofia') {
      pMultiplier = 2.0;
      fMultiplier = 1.0;
    } else {
      pMultiplier = 1.8;
      fMultiplier = 0.9;
    }

    const proteinGrams = Math.round(weight * pMultiplier);
    const fatGrams = Math.round(weight * fMultiplier);
    
    // Carboidrato preenche o restante
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(remainingCalories > 0 ? remainingCalories / 4 : 50);

    // Seleção de preset de treino com base nos dias informados
    let selectedWorkoutPresetKey = 'upperlower4x';
    if (workoutDays <= 3) {
      selectedWorkoutPresetKey = 'fullbody3x';
    } else if (workoutDays >= 5) {
      selectedWorkoutPresetKey = 'ppl6x';
    }

    const workoutPreset = workoutPresets[selectedWorkoutPresetKey];

    // Ajuste de dieta com base no preset calórico
    const dietPreset = initialDietPresets[goal];

    setCalculatedResult({
      bmr: Math.round(bmr),
      tdee: tdee,
      targetCalories: targetCalories,
      macros: {
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams
      },
      workoutPresetKey: selectedWorkoutPresetKey,
      workoutPreset: workoutPreset,
      dietPreset: dietPreset
    });
    setStep(5);
  };

  const handleApply = () => {
    if (calculatedResult) {
      onApplyPlan({
        profile: {
          ...formData,
          bmr: calculatedResult.bmr,
          tdee: calculatedResult.tdee,
          targetCalories: calculatedResult.targetCalories,
          macros: calculatedResult.macros,
        },
        diet: calculatedResult.dietPreset,
        workout: calculatedResult.workoutPreset
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Progresso do Wizard */}
      {step <= 4 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            <span>Passo {step} de 4</span>
            <span>
              {step === 1 && 'Dados Pessoais'}
              {step === 2 && 'Atividade Física'}
              {step === 3 && 'Objetivo'}
              {step === 4 && 'Rotina de Treinos'}
            </span>
          </div>
          <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Container Principal */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6 md:p-8">
        
        {/* PASSO 1: DADOS PESSOAIS */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-500" />
                Vamos começar com seus dados pessoais
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Estas informações servem para calcularmos a sua Taxa Metabólica Basal com precisão.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gênero */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Gênero Biológico</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('gender', 'male')}
                    className={`py-3 px-4 border rounded-xl font-medium transition-all ${
                      formData.gender === 'male'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('gender', 'female')}
                    className={`py-3 px-4 border rounded-xl font-medium transition-all ${
                      formData.gender === 'female'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Idade */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Idade</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{formData.age} anos</span>
                </label>
                <input
                  type="range"
                  min="15"
                  max="80"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>15 anos</span>
                  <span>80 anos</span>
                </div>
              </div>

              {/* Peso */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Peso</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{formData.weight} kg</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>40 kg</span>
                  <span>180 kg</span>
                </div>
              </div>

              {/* Altura */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Altura</span>
                  <span className="font-mono text-zinc-900 dark:text-zinc-100">{formData.height} cm</span>
                </label>
                <input
                  type="range"
                  min="130"
                  max="220"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>130 cm</span>
                  <span>220 cm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2: NÍVEL DE ATIVIDADE */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-500" />
                Qual o seu nível de atividade física diária?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Seu gasto de calorias diário varia bastante conforme a sua rotina e treinos.
              </p>
            </div>

            <div className="space-y-3">
              {activityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('activityLevel', option.value)}
                  className={`w-full text-left p-4 border rounded-xl flex items-start justify-between transition-all ${
                    formData.activityLevel === option.value
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="pr-4">
                    <span className="font-bold block text-sm">{option.label}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 block">{option.desc}</span>
                  </div>
                  {formData.activityLevel === option.value && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 3: OBJETIVO */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-500" />
                Qual o seu principal objetivo?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Isso definirá se você precisa ingerir menos calorias (déficit) ou mais calorias (superávit).
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {goalOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleInputChange('goal', option.value)}
                    className={`text-left p-5 border rounded-xl flex items-center justify-between transition-all ${
                      formData.goal === option.value
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${option.color}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 block">{option.label}</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 block">{option.desc}</span>
                      </div>
                    </div>
                    {formData.goal === option.value && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASSO 4: ROTINA DE TREINOS */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-blue-500" />
                Quantos dias você planeja treinar por semana?
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Com base nisso, recomendamos a divisão de treino perfeita para otimizar seus resultados e recuperação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 3, label: '3 dias por semana', desc: 'Divisão corpo inteiro (Full Body). Ideal para iniciantes ou agendas ocupadas.' },
                { value: 4, label: '4 dias por semana', desc: 'Divisão Superior/Inferior (Upper/Lower). Ótimo balanço de volume e descanso.' },
                { value: 6, label: '5 a 6 dias por semana', desc: 'Divisão Puxar/Empurrar/Pernas (PPL). Perfeito para focar em volume alto de treino.' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleInputChange('workoutDays', option.value)}
                  className={`text-left p-5 border rounded-xl flex flex-col justify-between transition-all h-full ${
                    formData.workoutDays === option.value
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="space-y-2 mb-4">
                    <span className="font-bold text-sm block">{option.label}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block leading-relaxed">{option.desc}</span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-auto pt-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-500">
                      {option.value === 3 ? 'Full Body' : option.value === 4 ? 'Upper/Lower' : 'PPL'}
                    </span>
                    {formData.workoutDays === option.value && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PASSO 5: RESULTADO DO CÁLCULO & RECOMENDAÇÃO */}
        {step === 5 && calculatedResult && (
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-2 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 mb-2">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
                Seu Planejamento Inteligente está pronto!
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
                Analisamos suas métricas e criamos um plano nutricional e de treinos estruturado sob medida para o seu objetivo.
              </p>
            </div>

            {/* Quadro de Métricas Energéticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Metabolismo Basal (TMB)</span>
                <span className="block font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{calculatedResult.bmr} kcal</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Gasto mínimo para sobreviver</span>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4 text-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Gasto Diário Total (TDEE)</span>
                <span className="block font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{calculatedResult.tdee} kcal</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Calorias gastas com atividade</span>
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-center ring-2 ring-blue-500/20">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Meta Calórica Diária</span>
                <span className="block font-mono text-3xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">{calculatedResult.targetCalories} kcal</span>
                <span className="text-[11px] text-blue-500/80 block mt-1 font-semibold">
                  {formData.goal === 'emagrecimento' ? 'Déficit calórico ativo (-500 kcal)' : formData.goal === 'hipertrofia' ? 'Superávit calórico ativo (+300 kcal)' : 'Manutenção calórica'}
                </span>
              </div>
            </div>

            {/* Distribuição de Macronutrientes sugeridos */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Distribuição Recomendada de Macronutrientes</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Proteínas</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{calculatedResult.macros.protein}g</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: '30%' }}></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">{calculatedResult.macros.protein * 4} kcal do total</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Carboidratos</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{calculatedResult.macros.carbs}g</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: '50%' }}></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">{calculatedResult.macros.carbs * 4} kcal do total</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-zinc-500">
                    <span>Gorduras</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">{calculatedResult.macros.fat}g</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: '20%' }}></div>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">{calculatedResult.macros.fat * 9} kcal do total</span>
                </div>
              </div>
            </div>

            {/* Detalhes dos Planos Recomendados */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 bg-zinc-50/30 dark:bg-[#09090b]/30">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide block">Dieta Sugerida</span>
                <h4 className="text-md font-bold text-zinc-900 dark:text-zinc-100">{calculatedResult.dietPreset.name}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {calculatedResult.dietPreset.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {calculatedResult.dietPreset.meals.map((meal, index) => (
                    <span key={index} className="text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-md">
                      {meal.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3 bg-zinc-50/30 dark:bg-[#09090b]/30">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wide block">Treino Sugerido</span>
                <h4 className="text-md font-bold text-zinc-900 dark:text-zinc-100">{calculatedResult.workoutPreset.name}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {calculatedResult.workoutPreset.description}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {calculatedResult.workoutPreset.days.map((day, index) => (
                    <span key={index} className="text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-md max-w-full truncate">
                      {day.name.split(':')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do Wizard: Botões */}
        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 mt-8 pt-6">
          {step > 1 && step <= 4 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 px-4 py-2"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}

          {step === 5 ? (
            <div className="flex gap-3 w-full justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" /> Alterar Métricas
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all ml-auto"
              >
                Ativar Planejamento <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold px-6 py-3 rounded-xl transition-all shadow-md ml-auto"
            >
              {step === 4 ? 'Calcular Plano' : 'Próximo'} 
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
