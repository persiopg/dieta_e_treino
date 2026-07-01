import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  User, 
  Scale, 
  Activity, 
  Flame, 
  Dumbbell, 
  TrendingUp, 
  Check, 
  RotateCcw,
  Sparkles,
  Calculator,
  RefreshCw,
  Target
} from 'lucide-react';
import { initialDietPresets } from '../data/foodDatabase';
import { workoutPresets } from '../data/workoutPresets';

export default function Settings({ profile, onUpdateProfile, lang }) {
  const [formData, setFormData] = useState({
    gender: profile?.gender || 'male',
    age: profile?.age || 25,
    weight: profile?.weight || 70,
    height: profile?.height || 170,
    activityLevel: profile?.activityLevel || 1.375,
    goal: profile?.goal || 'emagrecimento',
    workoutDays: profile?.workoutDays || 4,
  });

  const [previewResult, setPreviewResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activityOptions = [
    { value: 1.2, label: lang === 'pt' ? 'Sedentário' : 'Sedentary', desc: lang === 'pt' ? 'Trabalho de escritório, pouco ou nenhum exercício.' : 'Desk job, little to no exercise.' },
    { value: 1.375, label: lang === 'pt' ? 'Levemente Ativo' : 'Lightly Active', desc: lang === 'pt' ? 'Exercício leve/esportes 1-3 dias por semana.' : 'Light exercise/sports 1-3 days per week.' },
    { value: 1.55, label: lang === 'pt' ? 'Moderadamente Ativo' : 'Moderately Active', desc: lang === 'pt' ? 'Exercício moderado/esportes 3-5 dias por semana.' : 'Moderate exercise/sports 3-5 days per week.' },
    { value: 1.725, label: lang === 'pt' ? 'Altamente Ativo' : 'Very Active', desc: lang === 'pt' ? 'Exercício intenso/esportes 6-7 dias por semana.' : 'Hard exercise/sports 6-7 days per week.' },
    { value: 1.9, label: lang === 'pt' ? 'Extremamente Ativo' : 'Extremely Active', desc: lang === 'pt' ? 'Trabalho físico diário ou treino de atleta.' : 'Physical labor or athletic training.' },
  ];

  const goalOptions = [
    { value: 'emagrecimento', label: lang === 'pt' ? 'Emagrecimento' : 'Fat Loss', desc: lang === 'pt' ? 'Déficit calórico para queima de gordura mantendo massa magra.' : 'Caloric deficit for fat loss preserving muscle mass.', icon: Flame, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    { value: 'manutencao', label: lang === 'pt' ? 'Manutenção' : 'Maintenance', desc: lang === 'pt' ? 'Manter o peso atual, melhorar performance e saúde geral.' : 'Maintain current weight, improve health and energy.', icon: Scale, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { value: 'hipertrofia', label: lang === 'pt' ? 'Hipertrofia' : 'Muscle Gain', desc: lang === 'pt' ? 'Superávit calórico focado na construção de novos tecidos musculares.' : 'Caloric surplus focused on building new muscle tissue.', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  ];

  // Executa o cálculo toda vez que os dados do formulário mudam (Real-time preview)
  useEffect(() => {
    calculatePreview();
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculatePreview = () => {
    const { gender, age, weight, height, activityLevel, goal } = formData;
    
    // Fórmula de Mifflin-St Jeor para TMB
    let bmr = 0;
    if (gender === 'male' || gender === 'masculino') {
      bmr = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) + 5;
    } else {
      bmr = 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) - 161;
    }

    // Gasto Calórico Diário Total (TDEE)
    const tdee = Math.round(bmr * Number(activityLevel));

    // Ajuste calórico por objetivo
    let targetCalories = tdee;
    if (goal === 'emagrecimento' || goal === 'extreme_cut' || goal === 'cut') {
      targetCalories = Math.round(tdee - 500);
      if (targetCalories < bmr * 0.9) targetCalories = Math.round(bmr * 0.9); // Evita déficit excessivo
    } else if (goal === 'hipertrofia' || goal === 'bulk' || goal === 'lean_bulk') {
      targetCalories = Math.round(tdee + 300);
    }

    // Recomendação de Macros (Proteína, Gordura, Carboidratos)
    let pMultiplier = 2.0; 
    let fMultiplier = 0.9;

    if (goal === 'emagrecimento' || goal === 'extreme_cut' || goal === 'cut') {
      pMultiplier = 2.2;
      fMultiplier = 0.8;
    } else if (goal === 'hipertrofia' || goal === 'bulk' || goal === 'lean_bulk') {
      pMultiplier = 2.0;
      fMultiplier = 1.0;
    } else {
      pMultiplier = 1.8;
      fMultiplier = 0.9;
    }

    const proteinGrams = Math.round(Number(weight) * pMultiplier);
    const fatGrams = Math.round(Number(weight) * fMultiplier);
    
    const proteinCalories = proteinGrams * 4;
    const fatCalories = fatGrams * 9;
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(remainingCalories > 0 ? remainingCalories / 4 : 50);

    setPreviewResult({
      bmr: Math.round(bmr),
      tdee: tdee,
      targetCalories: targetCalories,
      macros: {
        protein: proteinGrams,
        carbs: carbGrams,
        fat: fatGrams
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const updatedProfile = {
        ...formData,
        weight: Number(formData.weight),
        height: Number(formData.height),
        age: Number(formData.age),
        workoutDays: Number(formData.workoutDays),
        bmr: previewResult.bmr,
        tdee: previewResult.tdee,
        targetCalories: previewResult.targetCalories,
        macros: previewResult.macros,
      };

      // 1. Atualizar o perfil no backend
      await axios.put('/api/auth/profile', updatedProfile);
      
      // 2. Registrar o peso no histórico para a data de hoje
      const today = new Date().toISOString().split('T')[0];
      await axios.post('/api/tracker/weight', { weight: updatedProfile.weight, date: today });

      // 3. Notificar app principal
      onUpdateProfile(updatedProfile);
      
      setSuccessMsg(lang === 'pt' ? 'Cadastro e metas de saúde atualizados com sucesso!' : 'Profile and health goals successfully updated!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setErrorMsg(lang === 'pt' ? 'Erro ao salvar as configurações. Tente novamente.' : 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPresets = async () => {
    if (!window.confirm(lang === 'pt' 
      ? 'Aviso: Isso irá redefinir completamente seu plano de Dieta e Ficha de Treino atuais para os presets iniciais recomendados do novo objetivo. Deseja continuar?' 
      : 'Warning: This will completely reset your current Diet meal plans and Workout exercises to the recommended presets for your new goal. Do you want to continue?')) {
      return;
    }
    
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Determinar preset de treino com base nos dias informados
      let selectedWorkoutPresetKey = 'upperlower4x';
      if (formData.workoutDays <= 3) {
        selectedWorkoutPresetKey = 'fullbody3x';
      } else if (formData.workoutDays >= 5) {
        selectedWorkoutPresetKey = 'ppl6x';
      }
      
      const workoutPreset = workoutPresets[selectedWorkoutPresetKey];
      const dietPreset = initialDietPresets[formData.goal === 'emagrecimento' ? 'emagrecimento' : formData.goal === 'hipertrofia' ? 'hipertrofia' : 'manutencao'];

      const updatedProfile = {
        ...formData,
        weight: Number(formData.weight),
        height: Number(formData.height),
        age: Number(formData.age),
        workoutDays: Number(formData.workoutDays),
        bmr: previewResult.bmr,
        tdee: previewResult.tdee,
        targetCalories: previewResult.targetCalories,
        macros: previewResult.macros,
      };

      // Chamar endpoint que reaplica o plano de dieta e treino inteiros
      // Para fazer isso de forma idêntica ao Wizard, enviamos para as rotas adequadas ou recarregamos
      // Vamos simular a mesma chamada que o handleApplyPlan faz no App.jsx:
      // O App.jsx chama axios.put('/api/auth/profile', profile) e depois aplica os presets do diet e workout no banco.
      // Vamos ver como o App.jsx lida com handleApplyPlan.
      // Mas para ser seguro, vamos usar a função `onApplyPlan` do App.jsx caso ele queira redefinir,
      // ou apenas lançamos os saves de redefinição no backend aqui.
      // Para manter integrado, podemos recriar a lógica ou atualizar via API.
      // O app.jsx já tem o método de apply, mas aqui podemos salvar diretamente.
      
      // Salvar perfil
      await axios.put('/api/auth/profile', updatedProfile);
      
      // Salvar peso no histórico de hoje
      const today = new Date().toISOString().split('T')[0];
      await axios.post('/api/tracker/weight', { weight: updatedProfile.weight, date: today });
      
      // Salvar presets de Dieta
      await axios.post('/api/diet/preset', { presetKey: formData.goal });
      
      // Salvar presets de Treino
      await axios.post('/api/workout/preset', { presetKey: selectedWorkoutPresetKey });

      // Forçar refresh no App.jsx chamando o re-fetch dos dados
      // Como o onUpdateProfile só atualiza o perfil, vamos passar um trigger ou fazer a atualização total.
      // Vamos passar uma flag ou atualizar o perfil e recarregar os dados.
      // O melhor é fazer uma chamada global no pai. Vamos expor as opções para o App.jsx.
      
      // Notificar e forçar recarregamento geral no App.jsx
      if (typeof onUpdateProfile === 'function') {
        onUpdateProfile(updatedProfile, true); // Segundo parâmetro indica reload total
      }

      setSuccessMsg(lang === 'pt' ? 'Seu cadastro, plano de dieta e rotina de treino foram resetados para os padrões com sucesso!' : 'Profile, diet plan, and workouts successfully reset to presets!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setErrorMsg(lang === 'pt' ? 'Erro ao redefinir presets no servidor.' : 'Error resetting presets on the server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 pb-12">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2.5">
          <Calculator className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          {lang === 'pt' ? 'Configurações de Cadastro' : 'Profile Settings'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {lang === 'pt' ? 'Atualize seus dados corporais e metas sem precisar passar pelo questionário passo-a-passo.' : 'Update your body metrics and health goals without going through the step-by-step wizard.'}
        </p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-bold flex items-center gap-2">
          <span>⚠️</span>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Painel Esquerdo: Formulário de Configuração */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-sm">
          
          {/* Seção 1: Dados Corporais */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <User className="w-4 h-4" />
              {lang === 'pt' ? 'Dados Corporais' : 'Body Metrics'}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gênero */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {lang === 'pt' ? 'Gênero' : 'Gender'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('gender', 'male')}
                    className={`py-2.5 px-4 text-xs font-bold rounded-xl border transition-all ${
                      formData.gender === 'male' || formData.gender === 'masculino'
                        ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-transparent'
                    }`}
                  >
                    {lang === 'pt' ? 'Masculino' : 'Male'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('gender', 'female')}
                    className={`py-2.5 px-4 text-xs font-bold rounded-xl border transition-all ${
                      formData.gender === 'female' || formData.gender === 'feminino'
                        ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-transparent'
                    }`}
                  >
                    {lang === 'pt' ? 'Feminino' : 'Female'}
                  </button>
                </div>
              </div>

              {/* Idade */}
              <div>
                <label htmlFor="age" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {lang === 'pt' ? 'Idade (anos)' : 'Age (years)'}
                </label>
                <input
                  id="age"
                  type="number"
                  min="12"
                  max="100"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-50 dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Peso */}
              <div>
                <label htmlFor="weight" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {lang === 'pt' ? 'Peso Atual (kg)' : 'Current Weight (kg)'}
                </label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                  className="w-full bg-zinc-50 dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Altura */}
              <div>
                <label htmlFor="height" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                  {lang === 'pt' ? 'Altura (cm)' : 'Height (cm)'}
                </label>
                <input
                  id="height"
                  type="number"
                  min="100"
                  max="250"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-50 dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Seção 2: Nível de Atividade Física */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {lang === 'pt' ? 'Nível de Atividade Física' : 'Physical Activity Level'}
            </h3>
            
            <div className="space-y-2">
              {activityOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleInputChange('activityLevel', opt.value)}
                  className={`w-full text-left p-3.5 rounded-xl border flex flex-col transition-all bg-white dark:bg-[#0c0c0f] ${
                    Number(formData.activityLevel) === opt.value
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{opt.label}</span>
                    {Number(formData.activityLevel) === opt.value && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-[10px]">✓</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Seção 3: Objetivos */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
              <Target className="w-4 h-4" />
              {lang === 'pt' ? 'Objetivo do Planejamento' : 'Fitness Goal'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {goalOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleInputChange('goal', opt.value)}
                    className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all bg-white dark:bg-[#0c0c0f] ${
                      formData.goal === opt.value || 
                      (opt.value === 'emagrecimento' && (formData.goal === 'extreme_cut' || formData.goal === 'cut')) ||
                      (opt.value === 'hipertrofia' && (formData.goal === 'bulk' || formData.goal === 'lean_bulk'))
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg ${opt.color} mb-3`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 mb-1">{opt.label}</span>
                    <span className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Dias de Treino */}
            <div className="pt-2">
              <label htmlFor="workoutDays" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                {lang === 'pt' ? 'Dias de treino por semana' : 'Workout days per week'}
              </label>
              <input
                id="workoutDays"
                type="number"
                min="1"
                max="7"
                value={formData.workoutDays}
                onChange={(e) => handleInputChange('workoutDays', Math.max(1, Math.min(7, Number(e.target.value))))}
                className="w-full sm:w-1/3 bg-zinc-50 dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 py-3 px-6 text-sm font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {lang === 'pt' ? 'Salvar Configurações' : 'Save Settings'}
            </button>
            
            <button
              type="button"
              onClick={handleResetPresets}
              disabled={saving}
              className="w-full sm:w-auto py-3 px-5 text-sm font-bold border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer bg-white dark:bg-transparent"
            >
              <RotateCcw className="w-4 h-4" />
              {lang === 'pt' ? 'Redefinir Dieta & Treino' : 'Reset Plan to Presets'}
            </button>
          </div>

        </form>

        {/* Painel Direito: Preview de Metas Calculadas em tempo real */}
        {previewResult && (
          <div className="space-y-6 lg:sticky lg:top-24">
            
            <div className="bg-zinc-900 dark:bg-[#0c0c0f] text-zinc-100 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  {lang === 'pt' ? 'Previsão de Metas' : 'Goals Live Preview'}
                </h3>
                <h2 className="text-xl font-bold text-zinc-100">
                  {lang === 'pt' ? 'Cálculos de Saúde' : 'Health Calculations'}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  {lang === 'pt' ? 'Os valores abaixo são calculados dinamicamente em tempo real com base no formulário ao lado.' : 'Calculated in real-time using Harris-Benedict formulas from your form inputs.'}
                </p>
              </div>

              {/* Lista de Calorias */}
              <div className="space-y-3.5">
                {/* TMB */}
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-400 block">{lang === 'pt' ? 'Taxa Metabólica Basal (TMB)' : 'Basal Metabolic Rate (BMR)'}</span>
                    <span className="text-[10px] text-zinc-500">{lang === 'pt' ? 'Calorias para sobreviver em repouso' : 'Calories burned at rest'}</span>
                  </div>
                  <span className="font-extrabold text-sm text-zinc-100">{previewResult.bmr} kcal</span>
                </div>

                {/* TDEE */}
                <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-zinc-400 block">{lang === 'pt' ? 'Gasto Diário Total (TDEE)' : 'Daily Energy Expenditure (TDEE)'}</span>
                    <span className="text-[10px] text-zinc-500">{lang === 'pt' ? 'Incluindo o nível de atividade' : 'Active calories burned'}</span>
                  </div>
                  <span className="font-extrabold text-sm text-zinc-100">{previewResult.tdee} kcal</span>
                </div>

                {/* Meta de Calorias */}
                <div className="flex justify-between items-center p-3 bg-zinc-800/40 border border-zinc-800/80 rounded-xl">
                  <div>
                    <span className="text-xs font-extrabold text-blue-400 block">{lang === 'pt' ? 'Meta Calórica Diária' : 'Daily Caloric Target'}</span>
                    <span className="text-[10px] text-zinc-400">{lang === 'pt' ? 'Alvo para seu objetivo' : 'Adjusted target for goal'}</span>
                  </div>
                  <span className="font-black text-lg text-blue-400">{previewResult.targetCalories} kcal</span>
                </div>
              </div>

              {/* Bloco de Macros */}
              <div className="space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 block">
                  {lang === 'pt' ? 'Macronutrientes Sugeridos' : 'Suggested Macronutrients'}
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {/* Proteína */}
                  <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">{lang === 'pt' ? 'Proteína' : 'Protein'}</span>
                    <span className="font-extrabold text-md text-zinc-100 block mt-1">{previewResult.macros.protein}g</span>
                    <span className="text-[9px] text-zinc-500">{previewResult.macros.protein * 4} kcal</span>
                  </div>

                  {/* Carboidratos */}
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">{lang === 'pt' ? 'Carbo' : 'Carbs'}</span>
                    <span className="font-extrabold text-md text-zinc-100 block mt-1">{previewResult.macros.carbs}g</span>
                    <span className="text-[9px] text-zinc-500">{previewResult.macros.carbs * 4} kcal</span>
                  </div>

                  {/* Gorduras */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">{lang === 'pt' ? 'Gordura' : 'Fat'}</span>
                    <span className="font-extrabold text-md text-zinc-100 block mt-1">{previewResult.macros.fat}g</span>
                    <span className="text-[9px] text-zinc-500">{previewResult.macros.fat * 9} kcal</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-800 flex">
                    <div 
                      className="bg-rose-500 h-full" 
                      style={{ width: `${(previewResult.macros.protein * 4 / previewResult.targetCalories) * 100}%` }}
                      title="Proteína"
                    />
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${(previewResult.macros.carbs * 4 / previewResult.targetCalories) * 100}%` }}
                      title="Carboidratos"
                    />
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${(previewResult.macros.fat * 9 / previewResult.targetCalories) * 100}%` }}
                      title="Gorduras"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-1">
                    <span>🔴 {lang === 'pt' ? 'Prot' : 'Pro'}</span>
                    <span>🟡 {lang === 'pt' ? 'Carb' : 'Carb'}</span>
                    <span>🟢 {lang === 'pt' ? 'Gord' : 'Fat'}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Aviso Amigável */}
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <h4 className="text-xs font-bold text-blue-500 flex items-center gap-1.5 mb-1">
                <span>💡</span>
                {lang === 'pt' ? 'Preservar Dieta & Treino' : 'Preserve Diet & Workouts'}
              </h4>
              <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                {lang === 'pt' 
                  ? 'Salvar as configurações recalcula suas necessidades calóricas diárias preservando seus treinos e refeições customizadas atuais. Para redefinir tudo para as recomendações iniciais de treino e dieta, use o botão "Redefinir Dieta & Treino" vermelho.'
                  : 'Saving updates your active caloric targets while keeping your current custom meals and workout list intact. To completely start over, click the red "Reset Plan to Presets" button.'}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
