import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import api from '@/constants/api';

export default function HistoryScreen() {
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [waterHistory, setWaterHistory] = useState<any[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const [weightRes, waterRes, workoutRes] = await Promise.all([
        api.get('/api/tracker/weight/history'),
        api.get('/api/tracker/water/history'),
        api.get('/api/tracker/workout/history')
      ]);

      setWeightHistory(weightRes.data);
      setWaterHistory(waterRes.data);
      setWorkoutHistory(workoutRes.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível buscar os dados históricos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  // ==========================================
  // PROCESSAMENTO DE PESO
  // ==========================================
  const sortedWeight = [...weightHistory]
    .map(w => ({ ...w, weight: Number(w.weight), date: new Date(w.logged_date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const getWeightSVGPoints = (width: number, height: number) => {
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

    const firstP = points[0];
    const lastP = points[points.length - 1];
    const areaPath = `${linePath} L ${lastP.x} ${height - 10} L ${firstP.x} ${height - 10} Z`;

    return { linePath, areaPath, points };
  };

  const screenWidth = Dimensions.get('window').width - 64; // Subtraindo margens
  const weightSVGWidth = screenWidth > 0 ? screenWidth : 300;
  const weightSVGHeight = 160;
  const { linePath, areaPath, points: weightPoints } = getWeightSVGPoints(weightSVGWidth, weightSVGHeight);

  // ==========================================
  // PROCESSAMENTO DA ÁGUA (Semana Atual)
  // ==========================================
  const getWaterCurrentWeek = () => {
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
      
      const found = waterHistory.find(w => {
        const wDate = new Date(w.logged_date);
        return getLocalDateString(wDate) === dateString;
      });
      days.push({
        dateLabel: weekdays[i],
        amount: found ? Number(found.amount_ml) : 0,
        isToday: dateString === getLocalDateString(today),
        isFuture: d > today
      });
    }
    return days;
  };

  const waterCurrentWeek = getWaterCurrentWeek();
  const waterTarget = 2500; // Valor padrão simplificado
  const maxWaterAmount = Math.max(...waterCurrentWeek.map(d => d.amount), waterTarget);

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
        completed: !!found,
        isToday: dateString === getLocalDateString(today),
        isFuture: d > today
      });
    }
    return days;
  };

  const workoutCurrentWeek = getWorkoutCurrentWeek();
  const sortedWorkoutHistory = [...workoutHistory]
    .map(w => ({ ...w, dateParsed: new Date(w.logged_date) }))
    .sort((a, b) => b.dateParsed.getTime() - a.dateParsed.getTime());

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // Estatísticas Rápidas
  const currentWeight = sortedWeight[sortedWeight.length - 1]?.weight || 0;
  const initialWeight = sortedWeight[0]?.weight || 0;
  const weightChange = Number((currentWeight - initialWeight).toFixed(1));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>Evolução & Progresso</Text>
        <Text style={styles.subtitle}>Relatórios visuais do seu desempenho</Text>
      </View>

      {/* Estatísticas de Evolução */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Peso Atual</Text>
          <Text style={styles.statValue}>{currentWeight || '--'} kg</Text>
          <Text style={styles.statSub}>
            {weightChange < 0 ? `${weightChange} kg` : weightChange > 0 ? `+${weightChange} kg` : 'Estável'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Treinos Realizados</Text>
          <Text style={styles.statValue}>{workoutHistory.length}</Text>
          <Text style={styles.statSub}>sessões salvas</Text>
        </View>
      </View>

      {/* Gráfico de Peso */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Evolução do Peso Corporal</Text>
        
        {sortedWeight.length >= 2 ? (
          <View style={styles.chartContainer}>
            <Svg width={weightSVGWidth} height={weightSVGHeight}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.2" />
                  <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.0" />
                </LinearGradient>
              </Defs>
              <Path d={areaPath} fill="url(#grad)" />
              <Path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" />
              {weightPoints.map((p, idx) => (
                <Circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="#60a5fa"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              ))}
            </Svg>
            <View style={styles.chartLabelRow}>
              <Text style={styles.chartLabelText}>
                Início: {sortedWeight[0]?.weight}kg ({new Date(sortedWeight[0]?.logged_date).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})})
              </Text>
              <Text style={styles.chartLabelText}>
                Atual: {currentWeight}kg
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Registre seu peso em pelo menos dois dias diferentes para ver a curva do gráfico.</Text>
        )}
      </View>

      {/* Ingestão de Água (Semana Atual) */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Água na Semana Atual</Text>
        <View style={styles.barChartContainer}>
          {waterCurrentWeek.map((d, idx) => {
            const heightPercent = Math.min((d.amount / maxWaterAmount) * 100, 100);
            const targetMet = d.amount >= waterTarget;
            return (
              <View key={idx} style={styles.barColumn}>
                <View style={styles.barBg}>
                  <View 
                    style={[
                      styles.barFill, 
                      { 
                        height: `${heightPercent || 2}%`,
                        backgroundColor: targetMet ? '#2563eb' : '#60a5fa60'
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, d.isToday && styles.barLabelToday]}>
                  {d.dateLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Consistência Semanal de Treino */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Frequência de Treinos da Semana</Text>
        <View style={styles.weeklyConsistencyRow}>
          {workoutCurrentWeek.map((day, idx) => (
            <View key={idx} style={styles.consistencyDay}>
              <View 
                style={[
                  styles.consistencyCircle,
                  day.completed 
                    ? { backgroundColor: '#10b981', borderColor: '#059669' }
                    : day.isToday
                      ? { borderColor: '#3b82f6' }
                      : { backgroundColor: '#18181b', borderColor: '#27272a' }
                ]}
              >
                {day.completed ? (
                  <Text style={styles.checkText}>✓</Text>
                ) : (
                  <Text style={styles.dayLetter}>{day.dateLabel[0]}</Text>
                )}
              </View>
              <Text style={[styles.consistencyLabel, day.isToday && { color: '#3b82f6', fontWeight: '800' }]}>
                {day.dateLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Histórico Geral de Treinos */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Histórico Geral de Sessões</Text>
        {sortedWorkoutHistory.length > 0 ? (
          <View style={styles.timelineContainer}>
            {sortedWorkoutHistory.slice(0, 10).map((log, idx) => {
              const logDate = new Date(log.logged_date);
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineBadge} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineDate}>
                      {logDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </Text>
                    <Text style={styles.timelineTitle}>{log.workout_day_name}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>Nenhum treino concluído registrado no histórico ainda.</Text>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    marginTop: 26,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fafafa',
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fafafa',
  },
  statSub: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fafafa',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272a50',
    paddingTop: 8,
  },
  chartLabelText: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barBg: {
    width: 20,
    height: 100,
    backgroundColor: '#18181b',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
  },
  barLabelToday: {
    color: '#3b82f6',
    fontWeight: '900',
  },
  weeklyConsistencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consistencyDay: {
    alignItems: 'center',
    gap: 6,
  },
  consistencyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  dayLetter: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
  },
  consistencyLabel: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
  },
  timelineContainer: {
    borderLeftWidth: 1.5,
    borderLeftColor: '#27272a',
    marginLeft: 10,
    paddingLeft: 16,
    gap: 16,
    paddingVertical: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineBadge: {
    position: 'absolute',
    left: -22.5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#0c0c0f',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#18181b50',
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '700',
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fafafa',
  },
  emptyText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginVertical: 12,
  },
});
