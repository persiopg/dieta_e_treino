import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, 
  Droplet, 
  Calendar, 
  Sparkles,
  ChevronRight,
  TrendingDown,
  Info,
  Check,
  Dumbbell
} from 'lucide-react';

export default function HistoryTracker({ profile }) {
  const [weightHistory, setWeightHistory] = useState([]);
  const [waterHistory, setWaterHistory] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null); // Para tooltip do gráfico de peso

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const [weightRes, waterRes, workoutRes] = await Promise.all([
        axios.get('/api/tracker/weight/history'),
        axios.get('/api/tracker/water/history'),
        axios.get('/api/tracker/workout/history')
      ]);

      setWeightHistory(weightRes.data);
      setWaterHistory(waterRes.data);
      setWorkoutHistory(workoutRes.data);
    } catch (err) {
      console.error('Erro ao buscar dados históricos no banco.', err);
    } finally {
      setLoading(false);
    }
  };

  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ==========================================
  // PROCESSAMENTO DE DADOS DO GRÁFICO DE PESO
  // ==========================================
  const sortedWeight = [...weightHistory]
    .map(w => ({ ...w, weight: Number(w.weight), date: new Date(w.logged_date) }))
    .sort((a, b) => a.date - b.date);

  const getWeightSVGPoints = (width, height) => {
    if (sortedWeight.length < 2) return { linePath: '', areaPath: '', points: [] };

    const weights = sortedWeight.map(d => d.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const rangeW = maxW - minW || 1;

    const points = sortedWeight.map((d, index) => {
      const x = (index / (sortedWeight.length - 1)) * (width - 40) + 20;
      const y = height - ((d.weight - minW) / rangeW) * (height - 40) - 20;
      return { x, y, data: d };
    });

    const linePath = points.reduce((path, p, index) => {
      return index === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
    }, '');

    // Fechar a área para preenchimento de gradiente
    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaPath = `${linePath} L ${lastP.x} ${height - 10} L ${firstP.x} ${height - 10} Z`;

    return { linePath, areaPath, points };
  };

  const weightSVGWidth = 600;
  const weightSVGHeight = 220;
  const { linePath, areaPath, points: weightPoints } = getWeightSVGPoints(weightSVGWidth, weightSVGHeight);

  // ==========================================
  // PROCESSAMENTO DE DADOS DA HIDRATAÇÃO (Semana Atual)
  // ==========================================
  const getWaterCurrentWeek = () => {
    const days = [];
    const today = new Date();
    const currentDay = today.getDay();
    // Segunda-feira como início da semana (0 = Dom, 1 = Seg, 2 = Ter, etc.)
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date();
    monday.setDate(today.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);

    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateString = getLocalDateString(d);
      
      const found = waterHistory.find(w => {
        const wDate = new Date(w.logged_date);
        return getLocalDateString(wDate) === dateString;
      });
      days.push({
        dateLabel: weekdays[i],
        dateRaw: dateString,
        isToday: dateString === getLocalDateString(today),
        isFuture: d > today,
        amount: found ? Number(found.amount_ml) : 0
      });
    }
    return days;
  };

  const waterCurrentWeek = getWaterCurrentWeek();
  const waterTarget = profile?.weight ? Math.round(profile.weight * 35) : 2500;
  const maxWaterAmount = Math.max(...waterCurrentWeek.map(d => d.amount), waterTarget);

  const getWaterSubtitle = () => {
    if (waterCurrentWeek.length === 0) return 'A linha tracejada indica sua meta de hidratação ideal.';
    const firstDay = waterCurrentWeek[0].dateRaw;
    const lastDay = waterCurrentWeek[waterCurrentWeek.length - 1].dateRaw;
    
    const formatStr = (raw) => {
      const parts = raw.split('-');
      return `${parts[2]}/${parts[1]}`;
    };
    return `Consumo de água da semana atual (de Segunda-feira ${formatStr(firstDay)} a Domingo ${formatStr(lastDay)}).`;
  };

  // ==========================================
  // PROCESSAMENTO DE TREINOS (Semana Atual & Histórico)
  // ==========================================
  const getWorkoutCurrentWeek = () => {
    const days = [];
    const today = new Date();
    const currentDay = today.getDay();
    const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
    
    const monday = new Date();
    monday.setDate(today.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);

    const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateString = getLocalDateString(d);
      
      const found = workoutHistory.find(w => {
        const wDate = new Date(w.logged_date);
        return getLocalDateString(wDate) === dateString;
      });
      days.push({
        dateLabel: weekdays[i],
        dateRaw: dateString,
        isToday: dateString === getLocalDateString(today),
        isFuture: d > today,
        completed: !!found,
        workoutName: found ? found.workout_day_name : null
      });
    }
    return days;
  };

  const getWorkoutHistoryTimeline = () => {
    return [...workoutHistory]
      .map(w => ({ ...w, dateParsed: new Date(w.logged_date) }))
      .sort((a, b) => b.dateParsed - a.dateParsed);
  };

  const workoutCurrentWeek = getWorkoutCurrentWeek();
  const workoutHistoryTimeline = getWorkoutHistoryTimeline();

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-zinc-400 font-bold">Carregando históricos do MySQL...</p>
      </div>
    );
  }

  // Estatísticas rápidas de peso
  const initialWeight = sortedWeight[0]?.weight || profile?.weight || 0;
  const currentWeight = sortedWeight[sortedWeight.length - 1]?.weight || profile?.weight || 0;
  const weightChange = Number((currentWeight - initialWeight).toFixed(1));

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-indigo-500" />
          Evolução & Histórico
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Acompanhe seus dados de peso, consumo de água e consistência de treinos salvos.
        </p>
      </div>

      {/* KPI Cards de Histórico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card: Peso Inicial vs Atual */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Peso Corporal</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-zinc-950 dark:text-zinc-50">{currentWeight} kg</span>
              <span className="text-xs text-zinc-400">atual</span>
            </div>
            <span className="text-xs text-zinc-500 block mt-1.5">
              Começou com: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{initialWeight} kg</strong>
            </span>
          </div>
          
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
            weightChange < 0 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
              : weightChange > 0 
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500'
          }`}>
            {weightChange < 0 ? (
              <div className="text-center">
                <TrendingDown className="w-5 h-5 mx-auto" />
                <span className="text-[9px] font-mono font-bold block">{weightChange}kg</span>
              </div>
            ) : weightChange > 0 ? (
              <div className="text-center">
                <TrendingUp className="w-5 h-5 mx-auto" />
                <span className="text-[9px] font-mono font-bold block">+{weightChange}kg</span>
              </div>
            ) : (
              <span className="text-[10px] font-bold">Estável</span>
            )}
          </div>
        </div>

        {/* Card: Hidratação Média */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Água na Semana</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-zinc-950 dark:text-zinc-50">
                {Math.round(waterCurrentWeek.reduce((acc, curr) => acc + curr.amount, 0) / 7)} ml
              </span>
              <span className="text-xs text-zinc-400">média diária</span>
            </div>
            <span className="text-xs text-zinc-500 block mt-1.5">
              Meta diária: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{waterTarget} ml</strong>
            </span>
          </div>
          
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-xl flex items-center justify-center shadow-sm">
            <Droplet className="w-5 h-5" />
          </div>
        </div>

        {/* Card: Consistência de Treinos */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Frequência Mensal</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-mono text-zinc-950 dark:text-zinc-50">
                {workoutHistory.filter(w => {
                  const limit = new Date();
                  limit.setDate(limit.getDate() - 30);
                  return new Date(w.logged_date) >= limit;
                }).length} treinos
              </span>
              <span className="text-xs text-zinc-400">últimos 30 dias</span>
            </div>
            <span className="text-xs text-zinc-500 block mt-1.5">
              Histórico geral: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{workoutHistory.length} sessões</strong>
            </span>
          </div>
          
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Seção Central de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Peso */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Evolução de Peso Corporal (Últimos Registros)
            </h3>
            <p className="text-[11px] text-zinc-400">A linha exibe as flutuações e tendências do peso.</p>
          </div>

          <div className="relative pt-4">
            {sortedWeight.length >= 2 ? (
              <div className="w-full overflow-x-auto">
                <svg 
                  viewBox={`0 0 ${weightSVGWidth} ${weightSVGHeight}`} 
                  className="w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="weight-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Preenchimento de Área */}
                  <path d={areaPath} fill="url(#weight-gradient)" />

                  {/* Linha Principal */}
                  <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

                  {/* Pontos de Dados */}
                  {weightPoints.map((p, idx) => (
                    <circle
                      key={idx}
                      cx={p.x}
                      cy={p.y}
                      r={hoveredPoint?.idx === idx ? 6 : 4}
                      fill={hoveredPoint?.idx === idx ? '#3b82f6' : '#60a5fa'}
                      stroke={hoveredPoint?.idx === idx ? '#ffffff' : 'none'}
                      strokeWidth={2}
                      className="cursor-pointer transition-all duration-150"
                      onMouseEnter={() => setHoveredPoint({ idx, x: p.x, y: p.y, ...p.data })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                {/* Tooltip customizada flutuante */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-zinc-950/95 text-white text-[10px] font-bold rounded-lg px-2.5 py-1.5 border border-zinc-800 shadow-xl z-20 pointer-events-none transition-all duration-100 font-mono"
                    style={{ 
                      left: `${(hoveredPoint.x / weightSVGWidth) * 100}%`, 
                      top: `${(hoveredPoint.y / weightSVGHeight) * 100 - 15}%`,
                      transform: 'translate(-50%, -100%)' 
                    }}
                  >
                    {hoveredPoint.weight} kg
                    <span className="block text-[8px] font-medium text-zinc-400 font-sans mt-0.5">
                      {new Date(hoveredPoint.logged_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
                ⚠️ Registre o seu peso no Dashboard em pelo menos dois dias diferentes para desenhar a linha do gráfico.
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Barras de Água */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-blue-500" />
              Ingestão de Água (Semana Atual)
            </h3>
            <p className="text-[11px] text-zinc-400">{getWaterSubtitle()}</p>
          </div>

          <div className="h-[220px] flex items-end justify-between gap-2.5 pt-4 px-2 relative">
            
            {/* Linha tracejada de Meta */}
            <div 
              className="absolute left-0 right-0 border-t border-dashed border-blue-500/50 z-10 flex justify-end"
              style={{ bottom: `${(waterTarget / maxWaterAmount) * 150 + 28}px` }}
            >
              <span className="bg-white dark:bg-[#0c0c0f] text-[8px] font-bold text-blue-500 dark:text-blue-400 px-1 -mt-2">Meta</span>
            </div>

            {waterCurrentWeek.map((d, idx) => {
              const heightPercent = Math.min((d.amount / maxWaterAmount) * 100, 100);
              const targetMet = d.amount >= waterTarget;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer z-20">
                  {/* Tooltip do hover do gráfico */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md -mb-1 absolute bottom-[180px] z-30">
                    {d.amount} ml
                  </span>

                  {/* Barra */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-t-lg overflow-hidden h-[150px] flex items-end">
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        targetMet 
                          ? 'bg-blue-600 dark:bg-blue-500 shadow-md shadow-blue-500/10' 
                          : 'bg-blue-400/60 dark:bg-blue-500/35'
                      }`}
                      style={{ height: `${heightPercent || 2}%` }}
                    ></div>
                  </div>

                  {/* Nome do Dia */}
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${
                    d.isToday ? 'text-blue-500 dark:text-blue-400 font-extrabold' : 'text-zinc-400'
                  }`}>
                    {d.dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Seção de Treinos Realizados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Atividade da Semana Atual */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-6 lg:col-span-1">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Consistência da Semana Atual
            </h3>
            <p className="text-[11px] text-zinc-400">Status dos treinos planejados para esta semana.</p>
          </div>

          <div className="grid grid-cols-7 gap-2 pt-2">
            {workoutCurrentWeek.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    day.completed
                      ? 'bg-emerald-500 border-emerald-600 dark:bg-emerald-600 dark:border-emerald-700 text-white shadow-md shadow-emerald-500/20'
                      : day.isToday
                        ? 'border-blue-500 dark:border-blue-400 text-blue-500 animate-pulse'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-650 bg-zinc-50/50 dark:bg-zinc-900/10'
                  }`}
                  title={day.completed ? `Concluído: ${day.workoutName}` : 'Descanso / Não registrado'}
                >
                  {day.completed ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <span className="text-[10px] font-bold">{day.dateLabel[0]}</span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${
                  day.isToday 
                    ? 'text-blue-500 dark:text-blue-400 font-extrabold' 
                    : 'text-zinc-400 dark:text-zinc-500'
                }`}>
                  {day.dateLabel}
                </span>
              </div>
            ))}
          </div>

          {/* Resumo da semana */}
          <div className="bg-zinc-50 dark:bg-zinc-900/20 rounded-xl p-3.5 border border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-500 space-y-1">
            <div className="flex justify-between font-semibold">
              <span>Treinos Concluídos:</span>
              <span className="text-emerald-500 font-mono font-bold">
                {workoutCurrentWeek.filter(d => d.completed).length} de {workoutCurrentWeek.filter(d => !d.isFuture).length} possíveis
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">Mantenha a regularidade para atingir os resultados planejados no Wizard!</p>
          </div>
        </div>

        {/* Histórico Recente de Treinos (Linha do Tempo) */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-indigo-500" />
              Histórico Geral de Sessões Realizadas
            </h3>
            <p className="text-[11px] text-zinc-400">Histórico cronológico de todos os seus treinos concluídos salvos no MySQL.</p>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {workoutHistoryTimeline.length > 0 ? (
              <div className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3.5 pl-5 space-y-4 py-2">
                {workoutHistoryTimeline.map((log, idx) => {
                  const logDate = new Date(log.logged_date);
                  const isToday = getLocalDateString(logDate) === getLocalDateString(new Date());
                  
                  // Verificar se foi ontem
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const isYesterday = getLocalDateString(logDate) === getLocalDateString(yesterday);

                  const dateLabel = isToday 
                    ? 'Hoje' 
                    : isYesterday 
                      ? 'Ontem' 
                      : logDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });

                  return (
                    <div key={idx} className="relative group">
                      {/* Indicador na linha */}
                      <span className="absolute -left-[27px] top-1.5 bg-emerald-500 border-4 border-white dark:border-[#0c0c0f] w-3.5 h-3.5 rounded-full shadow-sm z-10"></span>

                      <div className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all flex items-center justify-between shadow-sm">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-bold uppercase font-sans tracking-wide block">
                            {dateLabel}
                          </span>
                          <h4 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 capitalize">
                            {log.workout_day_name || 'Treino Concluído'}
                          </h4>
                        </div>

                        <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30 text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Concluído
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
                🏋️ Nenhum treino registrado no histórico ainda. Comece marcando no seu Dashboard!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
