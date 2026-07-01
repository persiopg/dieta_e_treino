import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import api from '@/constants/api';
import { useAuth } from '@/hooks/useAuth';
import { translations } from '../utils/translations';

export default function WorkoutScreen() {
  const { lang } = useAuth();
  const [routine, setRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeDayId, setActiveDayId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [charges, setCharges] = useState<{[key: number]: string}>({});

  const fetchWorkout = async () => {
    try {
      const res = await api.get('/api/workout');
      setRoutine(res.data);
      if (res.data.days && res.data.days.length > 0 && !activeDayId) {
        setActiveDayId(res.data.days[0].id);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar sua rotina de treinos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, []);

  // Preencher estados locais com as cargas atuais do BD ao mudar de treino ativo
  useEffect(() => {
    if (routine?.days) {
      const activeDay = routine.days.find((d: any) => d.id === activeDayId);
      if (activeDay?.exercises) {
        const newCharges: {[key: number]: string} = {};
        activeDay.exercises.forEach((ex: any) => {
          newCharges[ex.id] = ex.weight ? ex.weight.toString() : '';
        });
        setCharges(newCharges);
      }
    }
  }, [activeDayId, routine]);

  const handleSaveWeight = async (exerciseId: number) => {
    const weightVal = charges[exerciseId];
    const weightNum = Number(weightVal);
    
    if (isNaN(weightNum) || weightNum < 0) {
      Alert.alert('Erro', 'Digite um peso válido (use números maiores ou iguais a 0).');
      return;
    }

    setSavingId(exerciseId);
    try {
      await api.put(`/api/workout/day/${activeDayId}/exercise/${exerciseId}`, {
        weight: weightNum
      });
      
      // Atualizar no estado local da rotina para persistência síncrona
      const updatedDays = routine.days.map((day: any) => {
        if (day.id === activeDayId) {
          return {
            ...day,
            exercises: day.exercises.map((ex: any) => {
              if (ex.id === exerciseId) {
                return { ...ex, weight: weightNum };
              }
              return ex;
            })
          };
        }
        return day;
      });
      setRoutine({ ...routine, days: updatedDays });
      
      Alert.alert('Sucesso', 'Carga atualizada no banco de dados!');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível atualizar a carga.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const activeDay = routine?.days?.find((d: any) => d.id === activeDayId);

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>{translations[lang].workoutTitle}</Text>
        <Text style={styles.subtitle}>{routine?.name || (lang === 'pt' ? 'Rotina Personalizada' : 'Custom Routine')}</Text>
      </View>

      {/* Tabs horizontais dos dias de treino */}
      {routine?.days && routine.days.length > 0 ? (
        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {routine.days.map((day: any) => {
              const isActive = day.id === activeDayId;
              return (
                <TouchableOpacity
                  key={day.id}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveDayId(day.id)}
                >
                  <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                    {day.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {activeDay ? (
          <View style={styles.exercisesSection}>
            <Text style={styles.dayDescription}>{activeDay.description || (lang === 'pt' ? 'Executar os exercícios abaixo.' : 'Perform the exercises below.')}</Text>
            
            {activeDay.exercises && activeDay.exercises.length > 0 ? (
              activeDay.exercises.map((exercise: any) => (
                <View key={exercise.id} style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseRest}>🕒 {translations[lang].rest}: {exercise.rest}s</Text>
                  </View>

                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} {translations[lang].sets} x {exercise.reps} {translations[lang].reps}
                  </Text>

                  {/* Controle de Cargas */}
                  <View style={styles.chargeRow}>
                    <Text style={styles.chargeLabel}>{translations[lang].todayCharge}</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.chargeInput}
                        keyboardType="numeric"
                        placeholder="--"
                        placeholderTextColor="#71717a"
                        value={charges[exercise.id] || ''}
                        onChangeText={(val) => setCharges({ ...charges, [exercise.id]: val })}
                      />
                      <Text style={styles.kgLabel}>kg</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.saveBtn, savingId === exercise.id && styles.saveBtnDisabled]}
                      onPress={() => handleSaveWeight(exercise.id)}
                      disabled={savingId === exercise.id}
                    >
                      {savingId === exercise.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.saveBtnText}>{translations[lang].save}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>{translations[lang].noExercises}</Text>
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>{lang === 'pt' ? 'Nenhum treino selecionado.' : 'No workout selected.'}</Text>
        )}
      </ScrollView>
    </View>
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
    paddingHorizontal: 16,
    marginBottom: 12,
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
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#0c0c0f',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  tabButtonText: {
    color: '#a1a1aa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  exercisesSection: {
    marginTop: 10,
  },
  dayDescription: {
    fontSize: 13,
    color: '#71717a',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  exerciseCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fafafa',
    flex: 1,
  },
  exerciseRest: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '700',
  },
  exerciseDetails: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '600',
    marginBottom: 16,
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a50',
    paddingTop: 12,
  },
  chargeLabel: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '700',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 8,
    marginRight: 10,
    width: 90,
  },
  chargeInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 14,
    color: '#fafafa',
    fontWeight: '800',
    textAlign: 'center',
  },
  kgLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#065f46',
    opacity: 0.7,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginVertical: 20,
  },
});
