import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl
} from 'react-native';
import api from '@/constants/api';
import { useAuth } from '@/hooks/useAuth';
import { translations } from '../utils/translations';
import { Ionicons } from '@expo/vector-icons';
import { exercisesDatabase } from '../data/workoutPresets';

export default function WorkoutScreen() {
  const { lang } = useAuth();
  
  // Abas internas de treino no celular
  const [activeTab, setActiveTab] = useState<'diary' | 'recommended'>('diary');
  
  // Estados de Dados
  const [routine, setRoutine] = useState<any>(null); // Plano recomendado base
  const [loggedWorkoutName, setLoggedWorkoutName] = useState<string | null>(null); // Check-in do dia ativo
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingExerciseId, setSavingExerciseId] = useState<number | null>(null);

  // Controle de Data do Diário
  const [activeDate, setActiveDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Estado para Ficha Selecionada na aba de Recomendados
  const [selectedRecommendedDayIdx, setSelectedRecommendedDayIdx] = useState(0);
  const [isEditingBasePlan, setIsEditingBasePlan] = useState(false);

  // Carga de peso local por exercício no diário/fichas
  const [charges, setCharges] = useState<{[key: number]: string}>({});

  // Timer de descanso
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);

  // Estados para Adicionar Exercício
  const [addExerciseModalVisible, setAddExerciseModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [newExerciseForm, setNewExerciseForm] = useState({
    sets: '3',
    reps: '10',
    rest: '60',
    weight: '0'
  });

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Carregar dados de treinos e check-in
  const fetchWorkoutData = async (isRefreshing = false, targetDate = activeDate) => {
    if (!isRefreshing) setLoading(true);
    try {
      const [workoutRes, workoutDoneRes] = await Promise.all([
        api.get('/api/workout').catch(() => ({ data: null })),
        api.get(`/api/tracker/workout-done?date=${targetDate}`).catch(() => ({ data: { isDone: false, workout_day_name: null } }))
      ]);
      setRoutine(workoutRes.data);
      setLoggedWorkoutName(workoutDoneRes.data.isDone ? workoutDoneRes.data.workout_day_name : null);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar os dados de treinos.');
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutData(false, activeDate);
  }, [activeDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWorkoutData(true, activeDate);
    setRefreshing(false);
  };

  // Preencher estados locais com as cargas atuais ao mudar a rotina ou carregar
  useEffect(() => {
    if (routine?.days) {
      const activeDay = routine.days[selectedRecommendedDayIdx];
      if (activeDay?.exercises) {
        const newCharges: {[key: number]: string} = {};
        activeDay.exercises.forEach((ex: any) => {
          newCharges[ex.id] = ex.weight ? ex.weight.toString() : '';
        });
        setCharges(newCharges);
      }
    }
  }, [selectedRecommendedDayIdx, routine]);

  // Efeito do Timer de Descanso
  useEffect(() => {
    if (timerActive && timerSecondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerSecondsLeft(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            clearInterval(timerRef.current);
            Alert.alert('Timer', 'Seu tempo de descanso acabou! Bora pra próxima série! 💪');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive, timerSecondsLeft]);

  // Filtragem local de exercícios na biblioteca
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = exercisesDatabase.filter((ex: any) => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // ==========================================
  // NAVEGAÇÃO DE DATAS
  // ==========================================
  const handlePrevDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(activeDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    const todayStr = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    if (dateStr === todayStr) return lang === 'pt' ? 'Hoje' : 'Today';
    if (dateStr === yesterdayStr) return lang === 'pt' ? 'Ontem' : 'Yesterday';
    const [year, month, day] = dateStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  // ==========================================
  // AÇÕES DO DIÁRIO DE TREINO (REAL)
  // ==========================================

  // Check-in de treino flexível
  const handleWorkoutCheckIn = async (workoutName: string | null) => {
    const isDone = workoutName !== 'Descanso' && workoutName !== null;
    setLoggedWorkoutName(workoutName);
    try {
      await api.post('/api/tracker/workout-done', {
        workout_day_name: workoutName || 'Descanso',
        date: activeDate,
        isDone: workoutName !== null
      });
      fetchWorkoutData(true, activeDate);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível salvar o status do treino.');
    }
  };

  // Salvar carga de peso de exercício no diário/ficha
  const handleSaveWeight = async (dayId: number, exerciseId: number) => {
    const weightVal = charges[exerciseId];
    const weightNum = Number(weightVal);
    
    if (isNaN(weightNum) || weightNum < 0) {
      Alert.alert('Erro', 'Digite um peso válido.');
      return;
    }

    setSavingExerciseId(exerciseId);
    try {
      await api.put(`/api/workout/day/${dayId}/exercise/${exerciseId}`, { weight: weightNum });
      fetchWorkoutData(true, activeDate);
      Alert.alert('Sucesso', 'Carga atualizada!');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível atualizar a carga.');
    } finally {
      setSavingExerciseId(null);
    }
  };

  // Iniciar timer de descanso
  const startRestTimer = (seconds: number) => {
    setTimerDuration(seconds);
    setTimerSecondsLeft(seconds);
    setTimerActive(true);
  };
  const [timerDuration, setTimerDuration] = useState(0);

  // ==========================================
  // AÇÕES DO PLANO RECOMENDADO (BASE)
  // ==========================================

  // Adicionar nova ficha base
  const handleCreateNewDay = async () => {
    const defaultName = `Ficha ${String.fromCharCode(65 + (routine?.days?.length || 0))}`;
    Alert.prompt(
      'Nova Ficha de Treino',
      'Digite o nome da nova ficha de treinos:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Criar', 
          onPress: async (name) => {
            if (!name) return;
            try {
              await api.post('/api/workout/day', { name, description: '' });
              fetchWorkoutData(true, activeDate);
            } catch (err) {
              console.error(err);
            }
          }
        }
      ],
      'plain-text',
      defaultName
    );
  };

  // Deletar Ficha Base
  const handleDeleteDay = async (dayId: number) => {
    Alert.alert(
      'Excluir Ficha',
      'Tem certeza que deseja excluir esta ficha de treino base?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/workout/day/${dayId}`);
              setSelectedRecommendedDayIdx(0);
              fetchWorkoutData(true, activeDate);
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  // Adicionar Exercício da Biblioteca
  const handleAddExerciseFromLibrary = async (exercise: any) => {
    const day = routine.days[selectedRecommendedDayIdx];
    try {
      await api.post(`/api/workout/day/${day.id}/exercise`, {
        name: exercise.name,
        sets: Number(newExerciseForm.sets),
        reps: newExerciseForm.reps,
        rest: Number(newExerciseForm.rest),
        weight: Number(newExerciseForm.weight)
      });
      setAddExerciseModalVisible(false);
      setSearchQuery('');
      fetchWorkoutData(true, activeDate);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível adicionar o exercício.');
    }
  };

  // Excluir exercício base
  const handleDeleteExerciseBase = async (dayId: number, exerciseId: number) => {
    Alert.alert(
      'Remover Exercício',
      'Deseja realmente remover este exercício da sua rotina padrão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/workout/day/${dayId}/exercise/${exerciseId}`);
              fetchWorkoutData(true, activeDate);
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const loggedFicha = routine?.days?.find((d: any) => d.name === loggedWorkoutName);

  return (
    <View style={styles.container}>
      
      {/* Abas Superiores de Controle de Tela */}
      <View style={styles.tabsHeader as any}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'diary' && styles.tabBtnActive] as any}
          onPress={() => setActiveTab('diary')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'diary' && styles.tabBtnTextActive] as any}>
            {lang === 'pt' ? 'Diário de Treino' : 'Workout Diary'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'recommended' && styles.tabBtnActive] as any}
          onPress={() => setActiveTab('recommended')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'recommended' && styles.tabBtnTextActive] as any}>
            {lang === 'pt' ? 'Minhas Fichas' : 'Planned Cards'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />
        }
      >
        
        {/* ABA 1: DIÁRIO DE TREINOS REAL */}
        {activeTab === 'diary' && (
          <View style={styles.tabContent}>
            
            {/* Navegador de Datas */}
            <View style={styles.dateBar as any}>
              <TouchableOpacity style={styles.dateNavBtn} onPress={handlePrevDay}>
                <Ionicons name="chevron-back-outline" size={18} color="#a1a1aa" />
              </TouchableOpacity>
              <View style={styles.dateCenter as any}>
                <Ionicons name="calendar-outline" size={14} color="#4f46e5" style={{ marginRight: 6 }} />
                <Text style={styles.dateBarTitle}>{formatDateDisplay(activeDate)}</Text>
              </View>
              <TouchableOpacity style={styles.dateNavBtn} onPress={handleNextDay}>
                <Ionicons name="chevron-forward-outline" size={18} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Timer Ativo (Flutuante na aba do Diário se ativado) */}
            {timerActive && (
              <View style={styles.timerCard as any}>
                <Ionicons name="timer-outline" size={20} color="#6366f1" style={{ marginRight: 8 }} />
                <Text style={styles.timerCardText}>
                  Descansando: <Text style={{ color: '#fff', fontWeight: '900' }}>{timerSecondsLeft}s</Text>
                </Text>
                <TouchableOpacity onPress={() => setTimerActive(false)} style={styles.timerCancelBtn}>
                  <Text style={styles.timerCancelBtnText}>Pular</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Caso 1: Sem Check-in de treino na data ativa */}
            {!loggedWorkoutName ? (
              <View style={styles.emptyDiaryContainer as any}>
                <Ionicons name="fitness-outline" size={36} color="#71717a" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyDiaryTitle}>{lang === 'pt' ? 'O que treinou hoje?' : 'Workout Done?'}</Text>
                <Text style={styles.emptyDiarySub}>Escolha uma de suas fichas, cardio ou dia de descanso.</Text>
                
                <View style={styles.quickCheckInGrid as any}>
                  {routine?.days?.map((day: any) => (
                    <TouchableOpacity 
                      key={day.id}
                      style={styles.checkInChoiceBtn}
                      onPress={() => handleWorkoutCheckIn(day.name)}
                    >
                      <Text style={styles.checkInChoiceText}>💪 {day.name}</Text>
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity 
                    style={styles.checkInChoiceBtn}
                    onPress={() => handleWorkoutCheckIn('Cardio')}
                  >
                    <Text style={styles.checkInChoiceText}>🏃 Cardio Livre</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.checkInChoiceBtn}
                    onPress={() => handleWorkoutCheckIn('Descanso')}
                  >
                    <Text style={styles.checkInChoiceText}>🛌 Descanso</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Caso 2: Com Check-in de treino realizado */
              <View style={styles.activeCheckInContainer}>
                
                {/* Header de Status */}
                <View style={styles.activeCheckInHeader as any}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activeCheckInTitle}>
                      {loggedWorkoutName === 'Descanso' 
                        ? 'Dia de Descanso 🛌' 
                        : loggedWorkoutName === 'Cardio' 
                        ? 'Cardio Concluído 🏃' 
                        : `Treino Realizado: ${loggedWorkoutName}`}
                    </Text>
                    <Text style={styles.activeCheckInSub}>Meta concluída com sucesso!</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.unCheckBtn} 
                    onPress={() => handleWorkoutCheckIn(null)}
                  >
                    <Text style={styles.unCheckBtnText}>Mudar</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Exercícios se for uma Ficha de treino padrão */}
                {loggedFicha ? (
                  <View style={styles.exercisesList}>
                    {loggedFicha.exercises?.map((ex: any) => (
                      <View key={ex.id} style={styles.exerciseCard as any}>
                        <View style={styles.exerciseHeader as any}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.exerciseName}>{ex.name}</Text>
                            <Text style={styles.exerciseDetails}>
                              {ex.sets} séries x {ex.reps} reps
                            </Text>
                          </View>
                          
                          <TouchableOpacity 
                            style={styles.restTimerBtn}
                            onPress={() => startRestTimer(ex.rest)}
                          >
                            <Ionicons name="timer-outline" size={14} color="#6366f1" />
                            <Text style={styles.restTimerBtnText}>{ex.rest}s</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Alteração Carga Diário */}
                        <View style={styles.chargeRow as any}>
                          <Text style={styles.chargeLabel}>Carga Atual:</Text>
                          <View style={styles.inputContainer as any}>
                            <TextInput
                              style={styles.chargeInput as any}
                              keyboardType="numeric"
                              placeholder="--"
                              placeholderTextColor="#71717a"
                              value={charges[ex.id] !== undefined ? charges[ex.id] : (ex.weight ? ex.weight.toString() : '')}
                              onChangeText={(val) => setCharges({ ...charges, [ex.id]: val })}
                            />
                            <Text style={styles.kgLabel}>kg</Text>
                          </View>
                          <TouchableOpacity 
                            style={[styles.saveBtn, savingExerciseId === ex.id && { opacity: 0.5 }] as any}
                            onPress={() => handleSaveWeight(loggedFicha.id, ex.id)}
                            disabled={savingExerciseId === ex.id}
                          >
                            <Text style={styles.saveBtnText}>Salvar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.recuperacaoCard as any}>
                    <Ionicons 
                      name={loggedWorkoutName === 'Descanso' ? "bed-outline" : "heart-outline"} 
                      size={28} 
                      color="#f59e0b" 
                      style={{ marginBottom: 8 }}
                    />
                    <Text style={styles.recuperacaoText}>
                      {loggedWorkoutName === 'Descanso' 
                        ? 'Foque em descansar, se alimentar e se hidratar bem hoje! Amanhã você volta com tudo!'
                        : 'Sessão cardiovascular livre concluída com excelência. Excelente para o coração!'}
                    </Text>
                  </View>
                )}

              </View>
            )}

          </View>
        )}

        {/* ABA 2: FICHAS PLANEJADAS (PLANO RECOMENDADO BASE) */}
        {activeTab === 'recommended' && (
          <View style={styles.tabContent}>
            
            <View style={styles.recommendedHeaderRow as any}>
              <Text style={styles.recommendedTitle}>{lang === 'pt' ? 'Minhas Rotinas Base' : 'Base Routines'}</Text>
              
              <TouchableOpacity 
                style={[styles.editBaseBtn, isEditingBasePlan && { backgroundColor: '#10b981' }] as any}
                onPress={() => setIsEditingBasePlan(!isEditingBasePlan)}
              >
                <Ionicons name={isEditingBasePlan ? "checkmark-outline" : "create-outline"} size={14} color="#fff" />
                <Text style={styles.editBaseBtnText}>{isEditingBasePlan ? 'Concluído' : 'Editar Fichas'}</Text>
              </TouchableOpacity>
            </View>

            {/* Rotinas salvas */}
            {routine?.days && routine.days.length > 0 ? (
              <View style={styles.basePlanContainer}>
                
                {/* Abas horizontais para escolher qual Ficha visualizar */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.baseTabsRow as any}>
                  {routine.days.map((day: any, idx: number) => (
                    <TouchableOpacity
                      key={day.id}
                      style={[styles.baseTabBtn, selectedRecommendedDayIdx === idx && styles.baseTabBtnActive] as any}
                      onPress={() => setSelectedRecommendedDayIdx(idx)}
                    >
                      <Text style={[styles.baseTabBtnText, selectedRecommendedDayIdx === idx && styles.baseTabBtnTextActive] as any}>
                        {day.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Exibição da ficha selecionada */}
                {(() => {
                  const day = routine.days[selectedRecommendedDayIdx];
                  if (!day) return null;
                  return (
                    <View style={styles.baseFichaSection}>
                      <View style={styles.baseFichaHeader as any}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.baseFichaName}>{day.name}</Text>
                          <Text style={styles.baseFichaDesc}>{day.exercises?.length || 0} exercícios recomendados</Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {!isEditingBasePlan ? (
                            <TouchableOpacity 
                              style={styles.trainChoiceBtn as any}
                              onPress={() => handleWorkoutCheckIn(day.name)}
                            >
                              <Ionicons name="checkmark-done" size={12} color="#fff" />
                              <Text style={styles.trainChoiceText}>Fiz Hoje</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity 
                              style={styles.deleteFichaBtn as any}
                              onPress={() => handleDeleteDay(day.id)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>

                      {/* Lista de Exercícios recomendados */}
                      <View style={styles.baseExercisesContainer}>
                        {day.exercises && day.exercises.length > 0 ? (
                          day.exercises.map((ex: any, exIdx: number) => (
                            <View key={ex.id} style={styles.baseExerciseRow as any}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.baseExerciseName}>{ex.name}</Text>
                                <Text style={styles.baseExerciseSub}>
                                  {ex.sets} séries x {ex.reps} reps • Carga: {ex.weight} kg
                                </Text>
                              </View>
                              
                              {isEditingBasePlan && (
                                <TouchableOpacity 
                                  style={styles.deleteExBtn as any}
                                  onPress={() => handleDeleteExerciseBase(day.id, ex.id)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyText}>Sem exercícios nesta ficha base.</Text>
                        )}

                        {isEditingBasePlan && (
                          <TouchableOpacity 
                            style={styles.addExBtn as any}
                            onPress={() => {
                              setAddExerciseModalVisible(true);
                            }}
                          >
                            <Ionicons name="add-circle-outline" size={16} color="#4f46e5" />
                            <Text style={styles.addExBtnText}>Adicionar Exercício</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })()}

              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhuma ficha de treino configurada.</Text>
            )}

            {isEditingBasePlan && (
              <TouchableOpacity style={styles.newFichaBtn as any} onPress={handleCreateNewDay}>
                <Text style={styles.newFichaBtnText}>+ Nova Ficha de Treino</Text>
              </TouchableOpacity>
            )}

          </View>
        )}

      </ScrollView>

      {/* ==========================================
          MODAL DE ADICIONAR EXERCÍCIO (PLAN BASE)
          ========================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addExerciseModalVisible}
        onRequestClose={() => setAddExerciseModalVisible(false)}
      >
        <View style={styles.modalBg as any}>
          <View style={styles.modalContent as any}>
            <Text style={styles.modalTitle}>Adicionar Exercício</Text>

            <TextInput
              style={styles.modalInput as any}
              placeholder="Supino, Agachamento, Tríceps..."
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResultsContainer as any} nestedScrollEnabled={true}>
                {searchResults.map((ex: any) => (
                  <TouchableOpacity
                    key={ex.name}
                    style={styles.searchResultItem as any}
                    onPress={() => handleAddExerciseFromLibrary(ex)}
                  >
                    <Text style={styles.searchResultItemText as any}>{ex.name}</Text>
                    <Text style={styles.searchResultItemSub as any}>{ex.category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Configurações padrões de séries e repetições */}
            <View style={styles.quickFormRow as any}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickFormLabel}>Séries:</Text>
                <TextInput
                  style={styles.quickFormInput as any}
                  keyboardType="numeric"
                  value={newExerciseForm.sets}
                  onChangeText={(val) => setNewExerciseForm({ ...newExerciseForm, sets: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickFormLabel}>Repetições:</Text>
                <TextInput
                  style={styles.quickFormInput as any}
                  value={newExerciseForm.reps}
                  onChangeText={(val) => setNewExerciseForm({ ...newExerciseForm, reps: val })}
                />
              </View>
            </View>

            <View style={styles.quickFormRow as any}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickFormLabel}>Descanso (s):</Text>
                <TextInput
                  style={styles.quickFormInput as any}
                  keyboardType="numeric"
                  value={newExerciseForm.rest}
                  onChangeText={(val) => setNewExerciseForm({ ...newExerciseForm, rest: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickFormLabel}>Peso (kg):</Text>
                <TextInput
                  style={styles.quickFormInput as any}
                  keyboardType="numeric"
                  value={newExerciseForm.weight}
                  onChangeText={(val) => setNewExerciseForm({ ...newExerciseForm, weight: val })}
                />
              </View>
            </View>

            <View style={styles.modalButtons as any}>
              <TouchableOpacity 
                style={styles.modalCancelBtn as any} 
                onPress={() => {
                  setAddExerciseModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.modalBtnText as any}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  tabsHeader: {
    flexDirection: 'row',
    backgroundColor: '#0c0c0f',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#18181b',
  },
  tabBtnText: {
    color: '#71717a',
    fontWeight: '700',
    fontSize: 12,
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flex: 1,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 8,
    marginBottom: 14,
  },
  dateNavBtn: {
    padding: 6,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBarTitle: {
    color: '#f4f4f5',
    fontWeight: '800',
    fontSize: 13,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#312e8140',
    borderWidth: 1,
    borderColor: '#4338ca',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  timerCardText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  timerCancelBtn: {
    backgroundColor: '#3730a3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerCancelBtnText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  emptyDiaryContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    borderRadius: 16,
    padding: 16,
  },
  emptyDiaryTitle: {
    color: '#fafafa',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyDiarySub: {
    color: '#71717a',
    fontSize: 11,
    marginBottom: 16,
    textAlign: 'center',
  },
  quickCheckInGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  checkInChoiceBtn: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  checkInChoiceText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '700',
  },
  activeCheckInContainer: {
    flex: 1,
  },
  activeCheckInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  activeCheckInTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  activeCheckInSub: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  unCheckBtn: {
    backgroundColor: '#f43f5e15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unCheckBtnText: {
    color: '#f43f5e',
    fontSize: 10,
    fontWeight: '800',
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 8,
    marginBottom: 8,
  },
  exerciseName: {
    color: '#fafafa',
    fontWeight: '900',
    fontSize: 13,
  },
  exerciseDetails: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  restTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  restTimerBtnText: {
    color: '#6366f1',
    fontSize: 10,
    fontWeight: '850',
  },
  chargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  chargeLabel: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 80,
    height: 30,
  },
  chargeInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  kgLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  recuperacaoCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    alignItems: 'center',
  },
  recuperacaoText: {
    color: '#a1a1aa',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
  },
  recommendedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recommendedTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  editBaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editBaseBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  basePlanContainer: {
    flex: 1,
  },
  baseTabsRow: {
    marginBottom: 12,
  },
  baseTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    marginRight: 6,
  },
  baseTabBtnActive: {
    backgroundColor: '#18181b',
    borderColor: '#4f46e5',
  },
  baseTabBtnText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
  },
  baseTabBtnTextActive: {
    color: '#ffffff',
  },
  baseFichaSection: {
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
  },
  baseFichaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 8,
    marginBottom: 10,
  },
  baseFichaName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  baseFichaDesc: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2,
  },
  trainChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  trainChoiceText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  deleteFichaBtn: {
    padding: 4,
  },
  baseExercisesContainer: {
    gap: 8,
  },
  baseExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 10,
  },
  baseExerciseName: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
  },
  baseExerciseSub: {
    color: '#71717a',
    fontSize: 9,
    marginTop: 2,
  },
  deleteExBtn: {
    padding: 4,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    borderRadius: 10,
    padding: 8,
    marginTop: 4,
    gap: 6,
  },
  addExBtnText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '700',
  },
  newFichaBtn: {
    backgroundColor: '#1e1b4b40',
    borderWidth: 1,
    borderColor: '#312e81',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  newFichaBtnText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '900',
  },
  emptyText: {
    color: '#71717a',
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '100%',
    maxWidth: 300,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
  },
  searchResultsContainer: {
    maxHeight: 120,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    marginBottom: 14,
  },
  searchResultItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  searchResultItemText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  searchResultItemSub: {
    color: '#71717a',
    fontSize: 9,
    marginTop: 2,
  },
  quickFormRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickFormLabel: {
    color: '#a1a1aa',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickFormInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 6,
    color: '#ffffff',
    fontSize: 11,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#27272a',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '750',
  },
});
