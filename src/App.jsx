import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocalStorage } from './hooks/useLocalStorage';
import Dashboard from './components/Dashboard';
import WorkoutPlanner from './components/WorkoutPlanner';
import DietPlanner from './components/DietPlanner';
import RecommendationWizard from './components/RecommendationWizard';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import HistoryTracker from './components/HistoryTracker';
import { translations } from './utils/translations';
import { 
  Sparkles, 
  Dumbbell, 
  Apple, 
  LayoutDashboard, 
  Moon, 
  Sun,
  LogOut,
  LogIn,
  BookOpen,
  UserPlus,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import './App.css';

export default function App() {
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Estados de Autenticação e Token (persiste no LocalStorage)
  const [token, setToken] = useLocalStorage('fitlife_token', null);
  const [userEmail, setUserEmail] = useState(null);
  
  // Estados de Planejamento e Rastreadores
  const [profile, setProfile] = useState(null);
  const [diet, setDiet] = useState(null);
  const [workout, setWorkout] = useState(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false);
  
  // Estados Globais de Interface
  const [darkMode, setDarkMode] = useLocalStorage('fitlife_dark_mode', true);
  const [activeTab, setActiveTab] = useState('home');
  const [authView, setAuthView] = useState(null); // 'login', 'register' ou null (se logado ou apenas navegando)
  const [lang, setLang] = useLocalStorage('fitlife_lang', 'pt');

  // Configurar cabeçalho padrão do Axios com o Token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserData();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setProfile(null);
      setDiet(null);
      setWorkout(null);
      setWaterIntake(0);
      setWorkoutDoneToday(false);
    }
  }, [token]);

  // Efeito do modo escuro na tag HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Buscar os dados do usuário a partir da API
  const fetchUserData = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUserEmail(res.data.email);
      
      if (res.data.profile) {
        setProfile(res.data.profile);
        // Buscar dieta, treinos e logs se houver perfil ativo
        fetchPlannerAndLogs();
      } else {
        setProfile(null);
        setActiveTab('wizard'); // Direcionar direto para o assistente
      }
    } catch (err) {
      console.error('Erro ao buscar dados do usuário. Token expirado ou inválido.');
      handleLogout();
    }
  };

  const fetchPlannerAndLogs = async () => {
    try {
      const today = getLocalDateString();
      
      const [dietRes, workoutRes, waterRes, workoutDoneRes] = await Promise.all([
        axios.get('/api/diet'),
        axios.get('/api/workout'),
        axios.get(`/api/tracker/water?date=${today}`),
        axios.get(`/api/tracker/workout-done?date=${today}`)
      ]);

      setDiet(dietRes.data);
      setWorkout(workoutRes.data);
      setWaterIntake(waterRes.data.amount_ml);
      setWorkoutDoneToday(workoutDoneRes.data.isDone);
      
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Erro ao sincronizar planejadores do BD.', err);
    }
  };

  const handleLoginSuccess = (newToken, user) => {
    setToken(newToken);
    setAuthView(null);
    if (user.profile) {
      setProfile(user.profile);
      fetchPlannerAndLogs();
    } else {
      setProfile(null);
      setActiveTab('wizard');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail(null);
    setProfile(null);
    setDiet(null);
    setWorkout(null);
    setWaterIntake(0);
    setWorkoutDoneToday(false);
    setAuthView(null);
    setActiveTab('home');
  };

  const handleResetProfile = async () => {
    if (window.confirm('Deseja realmente resetar todos os seus dados? Isso apagará seu histórico de peso, água, dietas e treinos no banco de dados.')) {
      try {
        await axios.put('/api/auth/profile', {
          gender: null,
          age: null,
          weight: null,
          height: null,
          activityLevel: null,
          goal: null,
          workoutDays: null,
          bmr: null,
          tdee: null,
          targetCalories: null,
          macros: null
        });
        setProfile(null);
        setDiet(null);
        setWorkout(null);
        setWaterIntake(0);
        setWorkoutDoneToday(false);
        setActiveTab('wizard');
      } catch (err) {
        console.error('Erro ao resetar perfil no banco.', err);
      }
    }
  };

  // Salvar novo plano criado pelo Wizard no banco de dados MySQL
  const handleApplyPlan = async ({ profile: newProfile, diet: newDiet, workout: newWorkout }) => {
    try {
      // 1. Atualizar perfil no banco
      const profileRes = await axios.put('/api/auth/profile', newProfile);
      setProfile(profileRes.data.profile);

      // 2. Aplicar os presets de dieta e treino no banco
      await Promise.all([
        axios.post('/api/diet/preset', { presetKey: newProfile.goal }),
        axios.post('/api/workout/preset', { presetKey: newProfile.workoutDays <= 3 ? 'fullbody3x' : newProfile.workoutDays >= 5 ? 'ppl6x' : 'upperlower4x' })
      ]);

      // 3. Recarregar todos os dados limpos
      await fetchPlannerAndLogs();
    } catch (err) {
      console.error('Erro ao salvar planejamento no MySQL.', err);
      alert('Erro ao salvar o planejamento. Verifique sua conexão com o backend.');
    }
  };

  // Rastrear água reativamente (atualizar no banco)
  const handleWaterChange = async (newWater) => {
    setWaterIntake(newWater);
    if (token) {
      try {
        const today = getLocalDateString();
        await axios.post('/api/tracker/water', { amount_ml: newWater, date: today });
      } catch (err) {
        console.error('Erro ao atualizar água no banco.', err);
      }
    }
  };

  // Rastrear treino concluído reativamente (atualizar no banco)
  const handleWorkoutDoneChange = async (isDone) => {
    setWorkoutDoneToday(isDone);
    if (token) {
      try {
        const today = getLocalDateString();
        const dayName = workout?.days?.[0]?.name || 'Treino Concluído';
        await axios.post('/api/tracker/workout-done', { workout_day_name: dayName, date: today, isDone });
      } catch (err) {
        console.error('Erro ao atualizar status do treino no banco.', err);
      }
    }
  };

  // Rastrear alteração do peso no Dashboard
  const handleUpdateProfileWeight = async (updatedProfile) => {
    setProfile(updatedProfile);
    if (token) {
      try {
        const today = getLocalDateString();
        await Promise.all([
          axios.put('/api/auth/profile', updatedProfile),
          axios.post('/api/tracker/weight', { weight: updatedProfile.weight, date: today })
        ]);
      } catch (err) {
        console.error('Erro ao salvar novo peso no MySQL.', err);
      }
    }
  };

  // Rastrear alterações na dieta feitas no DietPlanner
  const handleUpdateDiet = async (updatedDiet) => {
    // Sincronizar o estado local
    setDiet(updatedDiet);
    
    // Como a tela de DietPlanner faz chamadas de rotas específicas (adicionar/remover/editar),
    // o estado local é atualizado instantaneamente por meio das respostas das chamadas da API de lá.
    // Esta função serve como fallback de sincronização se necessário.
  };

  // Rastrear alterações no treino feitas no WorkoutPlanner
  const handleUpdateWorkout = async (updatedWorkout) => {
    setWorkout(updatedWorkout);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors flex flex-col">
      
      {/* Header Principal */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0c0c0f]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab(profile ? 'dashboard' : 'home')}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black tracking-tight text-md text-zinc-950 dark:text-zinc-50 block">FitLife</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block -mt-0.5">Treino & Dieta</span>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
            {profile && token ? (
              <>
                <button
                  onClick={() => { setActiveTab('dashboard'); setAuthView(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" /> {translations[lang].dashboard}
                </button>
                <button
                  onClick={() => { setActiveTab('diet'); setAuthView(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'diet'
                      ? 'bg-white dark:bg-zinc-800 text-rose-500 dark:text-rose-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" /> {translations[lang].diet}
                </button>
                <button
                  onClick={() => { setActiveTab('workout'); setAuthView(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'workout'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" /> {translations[lang].workout}
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setAuthView(null); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'history'
                      ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> {translations[lang].history}
                </button>
              </>
            ) : null}

            <button
              onClick={() => { setActiveTab('home'); setAuthView(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'home' && authView === null
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> {translations[lang].institutional}
            </button>

            {token && (
              <button
                onClick={() => { setActiveTab('wizard'); setAuthView(null); }}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'wizard'
                    ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> {profile ? translations[lang].recalculate : 'Assistente'}
              </button>
            )}
          </nav>

          {/* Botões de Ações de Header */}
          <div className="flex items-center gap-3">
            {/* Seletor de Idioma */}
            <button
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all shadow-sm flex items-center gap-1.5"
              title={lang === 'pt' ? "Switch to English" : "Mudar para Português"}
            >
              <span>🌐</span>
              <span className="hidden sm:inline">{lang === 'pt' ? 'PT' : 'EN'}</span>
            </button>

            {/* Toggle Escuro/Claro */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0f] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all shadow-sm"
              aria-label="Alternar modo escuro"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Login / Logout */}
            {token ? (
              <button
                onClick={handleResetProfile}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-xl transition-all shadow-sm bg-white dark:bg-[#0c0c0f]"
                title="Resetar Dados"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{translations[lang].reset}</span>
              </button>
            ) : null}

            {token ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all shadow-sm bg-white dark:bg-[#0c0c0f]"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">{translations[lang].logout}</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthView('login')}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{lang === 'pt' ? 'Entrar' : 'Login'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto py-6">
        
        {/* Telas de Autenticação */}
        {authView === 'login' && !token && (
          <Login 
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setAuthView('register')}
          />
        )}

        {authView === 'register' && !token && (
          <Register 
            onRegisterSuccess={handleLoginSuccess}
            onNavigateToLogin={() => setAuthView('login')}
          />
        )}

        {/* Telas da Plataforma */}
        {authView === null && (
          <>
            {activeTab === 'home' && (
              <LandingPage onStartWizard={() => {
                if (token) {
                  setActiveTab('wizard');
                } else {
                  setAuthView('login');
                }
              }} />
            )}

            {activeTab === 'wizard' && token && (
              <RecommendationWizard 
                profile={profile} 
                onApplyPlan={handleApplyPlan} 
              />
            )}

            {activeTab === 'dashboard' && profile && token && (
              <Dashboard 
                profile={profile}
                setProfile={handleUpdateProfileWeight}
                diet={diet}
                workout={workout}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                waterIntake={waterIntake}
                setWaterIntake={handleWaterChange}
                workoutDoneToday={workoutDoneToday}
                setWorkoutDoneToday={handleWorkoutDoneChange}
                lang={lang}
              />
            )}

            {activeTab === 'diet' && profile && token && (
              <DietPlanner 
                diet={diet}
                setDiet={handleUpdateDiet}
                profile={profile}
                lang={lang}
              />
            )}

            {activeTab === 'workout' && profile && token && (
              <WorkoutPlanner 
                workout={workout}
                setWorkout={handleUpdateWorkout}
                workoutDoneToday={workoutDoneToday}
                setWorkoutDoneToday={handleWorkoutDoneChange}
                lang={lang}
              />
            )}

            {activeTab === 'history' && profile && token && (
              <HistoryTracker 
                profile={profile}
                lang={lang}
              />
            )}
          </>
        )}

      </main>

      {/* Navegação Inferior para Dispositivos Móveis */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0c0c0f] border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 z-45 flex items-center justify-around shadow-lg">
        {profile && token ? (
          <>
            <button
              onClick={() => { setActiveTab('dashboard'); setAuthView(null); }}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-zinc-400 font-medium'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-[9px]">{translations[lang].dashboard}</span>
            </button>
            
            <button
              onClick={() => { setActiveTab('diet'); setAuthView(null); }}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'diet'
                  ? 'text-rose-500 dark:text-rose-400 font-bold'
                  : 'text-zinc-400 font-medium'
              }`}
            >
              <Apple className="w-5 h-5" />
              <span className="text-[9px]">{translations[lang].diet}</span>
            </button>

            <button
              onClick={() => { setActiveTab('workout'); setAuthView(null); }}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'workout'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-zinc-400 font-medium'
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              <span className="text-[9px]">{translations[lang].workout}</span>
            </button>

            <button
              onClick={() => { setActiveTab('history'); setAuthView(null); }}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                activeTab === 'history'
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-zinc-400 font-medium'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[9px]">{translations[lang].history}</span>
            </button>
          </>
        ) : null}

        <button
          onClick={() => { setActiveTab('home'); setAuthView(null); }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'home' && authView === null
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-zinc-400 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px]">{translations[lang].institutional}</span>
        </button>

        <button
          onClick={() => {
            if (token) {
              setActiveTab('wizard');
              setAuthView(null);
            } else {
              setAuthView('login');
            }
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'wizard' || authView !== null
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-zinc-400 font-medium'
          }`}
        >
          {token ? <Sparkles className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          <span className="text-[9px]">{token ? (profile ? 'Assistente' : 'Calcular') : 'Entrar'}</span>
        </button>
      </div>

      {/* Espaçador para navegação mobile no rodapé */}
      <div className="h-16 md:hidden"></div>
      
    </div>
  );
}
