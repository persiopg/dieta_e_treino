export const exercisesDatabase = [
  // Peito
  { name: 'Supino Reto com Barra', category: 'Peito', defaultSets: 4, defaultReps: '8-12', defaultRest: 90 },
  { name: 'Supino Inclinado com Halteres', category: 'Peito', defaultSets: 4, defaultReps: '8-12', defaultRest: 90 },
  { name: 'Crucifixo Reto com Halteres', category: 'Peito', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Crossover na Polia', category: 'Peito', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },

  // Costas
  { name: 'Puxada Aberta no Pulley', category: 'Costas', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Remada Curvada com Barra', category: 'Costas', defaultSets: 4, defaultReps: '8-10', defaultRest: 90 },
  { name: 'Remada Baixa Sentada', category: 'Costas', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Pull-down na Polia', category: 'Costas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },

  // Pernas (Quadríceps, Posteriores, Panturrilhas, Glúteos)
  { name: 'Agachamento Livre com Barra', category: 'Pernas', defaultSets: 4, defaultReps: '8-10', defaultRest: 120 },
  { name: 'Leg Press 45', category: 'Pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Cadeira Extensora', category: 'Pernas', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Cadeira Flexora', category: 'Pernas', defaultSets: 4, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Stiff com Halteres', category: 'Pernas', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Elevação Pélvica', category: 'Pernas', defaultSets: 3, defaultReps: '10-12', defaultRest: 90 },
  { name: 'Gêmeos Sentado (Panturrilha)', category: 'Pernas', defaultSets: 4, defaultReps: '15-20', defaultRest: 60 },
  { name: 'Gêmeos em Pé', category: 'Pernas', defaultSets: 4, defaultReps: '12-15', defaultRest: 60 },

  // Ombros
  { name: 'Desenvolvimento com Halteres', category: 'Ombros', defaultSets: 4, defaultReps: '8-12', defaultRest: 90 },
  { name: 'Elevação Lateral com Halteres', category: 'Ombros', defaultSets: 4, defaultReps: '12-15', defaultRest: 60 },
  { name: 'Elevação Frontal na Polia', category: 'Ombros', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Crucifixo Invertido (Posterior)', category: 'Ombros', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 },

  // Tríceps
  { name: 'Tríceps Pulley (Corda ou Barra)', category: 'Tríceps', defaultSets: 4, defaultReps: '10-12', defaultRest: 60 },
  { name: 'Tríceps Testa com Halteres', category: 'Tríceps', defaultSets: 3, defaultReps: '10-12', defaultRest: 75 },
  { name: 'Tríceps Francês na Polia', category: 'Tríceps', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },

  // Bíceps
  { name: 'Rosca Direta com Barra W', category: 'Bíceps', defaultSets: 4, defaultReps: '8-12', defaultRest: 75 },
  { name: 'Rosca Alternada com Halteres', category: 'Bíceps', defaultSets: 3, defaultReps: '10-12', defaultRest: 65 },
  { name: 'Rosca Martelo com Halteres', category: 'Bíceps', defaultSets: 3, defaultReps: '10-12', defaultRest: 60 },

  // Abdômen / Lombar
  { name: 'Abdominal Supra na Prancha', category: 'Core', defaultSets: 3, defaultReps: '15-20', defaultRest: 45 },
  { name: 'Abdominal Infra na Paralela', category: 'Core', defaultSets: 3, defaultReps: '12-15', defaultRest: 45 },
  { name: 'Prancha Isométrica', category: 'Core', defaultSets: 3, defaultReps: '45s', defaultRest: 45 },
  { name: 'Extensão Lombar (Banco Romano)', category: 'Core', defaultSets: 3, defaultReps: '12-15', defaultRest: 60 }
];

export const workoutPresets = {
  // 3 dias por semana (Full Body)
  fullbody3x: {
    name: 'Full Body 3x (Corpo Inteiro)',
    description: 'Excelente para iniciantes ou pessoas com tempo reduzido. Foco em movimentos compostos 3 vezes por semana.',
    days: [
      {
        name: 'Treino A (Segunda/Quarta/Sexta)',
        exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', rest: 120, weight: 0 },
          { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', rest: 90, weight: 0 },
          { name: 'Puxada Aberta no Pulley', sets: 4, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '10-12', rest: 90, weight: 0 },
          { name: 'Rosca Direta com Barra W', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Tríceps Pulley (Corda ou Barra)', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Prancha Isométrica', sets: 3, reps: '45s', rest: 45, weight: 0 }
        ]
      }
    ]
  },
  // 4 dias por semana (Upper / Lower)
  upperlower4x: {
    name: 'Upper / Lower 4x (Superior / Inferior)',
    description: 'Frequência ideal de 4 dias semanais divididos entre treinos para a parte superior e parte inferior do corpo.',
    days: [
      {
        name: 'Treino A: Superior (Segunda/Quinta)',
        exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', rest: 90, weight: 0 },
          { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', rest: 90, weight: 0 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Puxada Aberta no Pulley', sets: 3, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Elevação Lateral com Halteres', sets: 4, reps: '12-15', rest: 60, weight: 0 },
          { name: 'Tríceps Testa com Halteres', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Rosca Alternada com Halteres', sets: 3, reps: '10-12', rest: 60, weight: 0 }
        ]
      },
      {
        name: 'Treino B: Inferior (Terça/Sexta)',
        exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', rest: 120, weight: 0 },
          { name: 'Leg Press 45', sets: 3, reps: '10-12', rest: 90, weight: 0 },
          { name: 'Stiff com Halteres', sets: 3, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Cadeira Flexora', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Elevação Pélvica', sets: 3, reps: '10-12', rest: 90, weight: 0 },
          { name: 'Gêmeos Sentado (Panturrilha)', sets: 4, reps: '15-20', rest: 60, weight: 0 },
          { name: 'Abdominal Supra na Prancha', sets: 3, reps: '15-20', rest: 45, weight: 0 }
        ]
      }
    ]
  },
  // 5 ou 6 dias por semana (Push / Pull / Legs)
  ppl6x: {
    name: 'Push / Pull / Legs 6x (Empurrar / Puxar / Pernas)',
    description: 'Divisão de treino avançada focada em frequência máxima. Divide os dias em movimentos de empurrar, puxar e pernas.',
    days: [
      {
        name: 'Treino A: Push - Empurrar (Peito, Ombro, Tríceps)',
        exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: '8-10', rest: 90, weight: 0 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: '8-12', rest: 90, weight: 0 },
          { name: 'Elevação Lateral com Halteres', sets: 4, reps: '12-15', rest: 60, weight: 0 },
          { name: 'Tríceps Pulley (Corda ou Barra)', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Tríceps Testa com Halteres', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Abdominal Supra na Prancha', sets: 3, reps: '15-20', rest: 45, weight: 0 }
        ]
      },
      {
        name: 'Treino B: Pull - Puxar (Costas, Posterior Ombro, Bíceps)',
        exercises: [
          { name: 'Puxada Aberta no Pulley', sets: 4, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Remada Curvada com Barra', sets: 4, reps: '8-10', rest: 90, weight: 0 },
          { name: 'Pull-down na Polia', sets: 3, reps: '12-15', rest: 60, weight: 0 },
          { name: 'Crucifixo Invertido (Posterior)', sets: 3, reps: '12-15', rest: 60, weight: 0 },
          { name: 'Rosca Direta com Barra W', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Rosca Martelo com Halteres', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Abdominal Infra na Paralela', sets: 3, reps: '12-15', rest: 45, weight: 0 }
        ]
      },
      {
        name: 'Treino C: Legs - Pernas (Quadríceps, Posterior, Glúteo, Panturrilha)',
        exercises: [
          { name: 'Agachamento Livre com Barra', sets: 4, reps: '8-10', rest: 120, weight: 0 },
          { name: 'Leg Press 45', sets: 3, reps: '10-12', rest: 90, weight: 0 },
          { name: 'Stiff com Halteres', sets: 3, reps: '10-12', rest: 75, weight: 0 },
          { name: 'Cadeira Extensora', sets: 3, reps: '12-15', rest: 60, weight: 0 },
          { name: 'Cadeira Flexora', sets: 3, reps: '10-12', rest: 60, weight: 0 },
          { name: 'Gêmeos Sentado (Panturrilha)', sets: 4, reps: '15-20', rest: 60, weight: 0 }
        ]
      }
    ]
  }
};
