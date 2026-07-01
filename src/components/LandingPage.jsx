import React from 'react';
import { 
  Sparkles, 
  Dumbbell, 
  Apple, 
  ArrowRight, 
  Activity, 
  Flame, 
  Scale, 
  TrendingUp, 
  Check, 
  Clock, 
  Heart,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function LandingPage({ onStartWizard }) {
  // Exemplos rápidos para exibição
  const workoutExamples = [
    {
      title: 'Full Body (3x na semana)',
      level: 'Iniciante / Intermediário',
      desc: 'Treina o corpo todo na mesma sessão. Foco em movimentos multiarticulares compostos.',
      exercises: ['Agachamento Livre', 'Supino Reto', 'Puxada no Pulley', 'Rosca Direta']
    },
    {
      title: 'Upper / Lower (4x na semana)',
      level: 'Intermediário',
      desc: 'Divisão inteligente entre membros superiores (Upper) e inferiores (Lower). Excelente balanço de descanso.',
      exercises: ['Supino Inclinado', 'Remada Curvada', 'Leg Press 45', 'Stiff com Halter']
    },
    {
      title: 'Push / Pull / Legs (6x na semana)',
      level: 'Avançado',
      desc: 'Divisão de alta frequência separada em empurrar, puxar e pernas. Ideal para ganho máximo de volume.',
      exercises: ['Desenvolvimento', 'Crucifixo Invertido', 'Cadeira Flexora', 'Panturrilha']
    }
  ];

  const dietExamples = [
    {
      title: 'Definição / Déficit Calórico',
      target: 'Emagrecimento Saudável',
      desc: 'Déficit calórico de ~20% mantendo ingestão proteica alta (2.2g/kg) para preservar músculos.',
      meals: ['Café da Manhã: Ovos + Pão Integral', 'Almoço: Frango + Arroz Integral + Feijão', 'Jantar: Tilápia + Batata Doce']
    },
    {
      title: 'Bulking / Superávit Calórico',
      target: 'Ganho de Massa Muscular',
      desc: 'Aumento calórico controlado (+300 a +500 kcal) com carboidratos elevados para energia nos treinos.',
      meals: ['Café da Manhã: Ovos + Tapioca + Banana', 'Lanche: Whey Protein + Aveia + Pasta de Amendoim', 'Jantar: Carne Patinho + Arroz + Azeite']
    }
  ];

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-8 md:py-16 space-y-20 animate-fade-in">
      
      {/* 1. HERO SECTION */}
      <section className="text-center space-y-6 max-w-4xl mx-auto py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" /> Plataforma Científica e Inteligente
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.1] md:leading-[1.05]">
          A forma inteligente de organizar seu <span className="text-blue-600 dark:text-blue-500 bg-clip-text">Treino</span> e sua <span className="text-rose-500 bg-clip-text">Dieta</span>
        </h1>
        
        <p className="text-md md:text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
          Calcule seu gasto energético com precisão, monte seu planejamento alimentar estruturado e execute seus treinos com um timer interativo integrado. Tudo em um só lugar.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onStartWizard}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-extrabold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-zinc-500/10 text-base"
          >
            Configurar Meu Planejamento <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* 2. COMO FUNCIONA (BENEFÍCIOS) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Cálculos Baseados em Ciência</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Utilizamos a fórmula de Mifflin-St Jeor para calcular seu metabolismo basal e gasto diário de acordo com seu nível de atividade física.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Apple className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Dieta sob Medida (Macros)</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Nada de cardápios inacessíveis. Distribuímos seus macronutrientes (proteínas, carboidratos e gorduras) para bater a sua meta exata de calorias.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Dumbbell className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Execução Interativa</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Acompanhe seu treino marcando as séries feitas. A plataforma conta com um timer de descanso inteligente que ajuda na sua recuperação.
          </p>
        </div>
      </section>

      {/* 3. EXEMPLOS DE TREINOS */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex justify-center items-center gap-2">
            <Dumbbell className="w-6 h-6 text-blue-500" /> Metodologia de Treino
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Abaixo estão exemplos das divisões recomendadas pelo nosso assistente de acordo com sua frequência semanal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {workoutExamples.map((workout, idx) => (
            <div key={idx} className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-black tracking-wider text-blue-500 bg-blue-500/5 px-2.5 py-1 rounded-md">
                    {workout.level}
                  </span>
                </div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-md">{workout.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{workout.desc}</p>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-4 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Principais Exercícios:</span>
                <div className="grid grid-cols-2 gap-2">
                  {workout.exercises.map((ex, exIdx) => (
                    <div key={exIdx} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      <span className="truncate">{ex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. EXEMPLOS DE DIETAS E CARDÁPIOS */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 flex justify-center items-center gap-2">
            <Apple className="w-6 h-6 text-rose-500" /> Abordagem Nutricional
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Garantimos que sua ingestão calórica diária esteja perfeitamente alinhada com o seu objetivo físico.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {dietExamples.map((diet, idx) => (
            <div key={idx} className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-md">{diet.title}</h4>
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide mt-0.5 block">{diet.target}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{diet.desc}</p>
              
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide block">Modelo de Refeições:</span>
                <div className="space-y-1.5">
                  {diet.meals.map((meal, mIdx) => (
                    <div key={mIdx} className="flex gap-2 items-start text-xs text-zinc-700 dark:text-zinc-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{meal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CALL TO ACTION (RODAPÉ) */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl shadow-blue-500/10">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Pronto para dar o primeiro passo?</h2>
        <p className="text-xs md:text-sm text-blue-100 leading-relaxed max-w-md mx-auto">
          Tire suas dúvidas e configure seu plano personalizado de treinos e dieta com base nas suas metas. Demora menos de 2 minutos.
        </p>
        <button
          onClick={onStartWizard}
          className="bg-white text-blue-700 font-extrabold px-8 py-3.5 rounded-2xl hover:bg-zinc-50 transition-all shadow-md text-sm inline-flex items-center gap-2"
        >
          Configurar Perfil <ArrowRight className="w-4 h-4" />
        </button>
      </section>

    </div>
  );
}
