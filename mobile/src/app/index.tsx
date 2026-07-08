import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import api from '@/constants/api';
import { translations } from '../utils/translations';
import { Ionicons } from '@expo/vector-icons';
import { initialFoodDatabase } from '../data/foodDatabase';
import { useSQLiteContext } from 'expo-sqlite';
import { SyncManager } from '../db/sync';

export default function DashboardScreen() {
  const { logout, lang } = useAuth();
  const db = useSQLiteContext();
  const syncManager = React.useMemo(() => new SyncManager(db), [db]);

  // Estados de Conectividade / Fila Offline
  const [isOffline, setIsOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  
  // Estados Principais
  const [profile, setProfile] = useState<any>(null);
  const [diet, setDiet] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false);
  
  // Novos Estados para Diário de Alimentação e Flexibilidade de Treino
  const [activeDate, setActiveDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [dietLogs, setDietLogs] = useState<any[]>([]);
  const [compareData, setCompareData] = useState<any>(null);
  const [loggedWorkoutName, setLoggedWorkoutName] = useState<string | null>(null);
  const [copyingPlan, setCopyingPlan] = useState(false);

  // Estados para Substituição por Equivalência
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const [substitutingItem, setSubstitutingItem] = useState<any>(null);
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [selectedSubstituteFood, setSelectedSubstituteFood] = useState<any>(null);
  const [substituteSearchResults, setSubstituteSearchResults] = useState<any[]>([]);

  // Estados de Interface
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  
  // Estados para Modal de edição de quantidade
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [editingLogItem, setEditingLogItem] = useState<any>(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Buscar dados sincronizados do Dashboard com suporte a datas e SQLite Offline
  const fetchDashboardData = async (isRefreshing = false, targetDate = activeDate) => {
    if (!isRefreshing) setLoading(true);
    try {
      const synced = await syncManager.syncFromServer(targetDate);
      
      setProfile(synced.profile);
      setDiet(synced.diet);
      setWorkout(synced.workout);
      setWaterIntake(synced.waterIntake);
      setWorkoutDoneToday(synced.workoutDoneToday);
      setLoggedWorkoutName(synced.loggedWorkoutName);
      setDietLogs(synced.dietLogs || []);
      setCompareData(synced.compareData);
      setIsOffline(synced.isOffline);
      
      const count = await syncManager.getPendingCount();
      setPendingSyncCount(count);
    } catch (err) {
      console.error('Erro ao buscar dados no SyncManager:', err);
      setIsOffline(true);
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true, activeDate);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData(false, activeDate);
  }, [activeDate]);

  // Navegação de Datas
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
    
    if (dateStr === todayStr) {
      return lang === 'pt' ? 'Hoje' : 'Today';
    } else if (dateStr === yesterdayStr) {
      return lang === 'pt' ? 'Ontem' : 'Yesterday';
    } else {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short', weekday: 'short' });
    }
  };

  // Ações de Hidratação
  const handleQuickWaterAdd = async (amount: number) => {
    const newVal = waterIntake + amount;
    setWaterIntake(newVal);
    
    await syncManager.logWater(amount, activeDate);
    const count = await syncManager.getPendingCount();
    setPendingSyncCount(count);
  };

  const handleWaterReset = async () => {
    setWaterIntake(0);
    
    await syncManager.resetWater(activeDate);
    const count = await syncManager.getPendingCount();
    setPendingSyncCount(count);
  };

  // Copiar planejamento de refeições para o diário real
  const handleCopyPlan = async () => {
    setCopyingPlan(true);
    try {
      if (isOffline) {
        if (diet && diet.meals) {
          await syncManager.copyBasePlan(activeDate, diet.meals);
          const localData = await syncManager.getLocalDashboardData(activeDate);
          setDietLogs(localData.dietLogs || []);
          setCompareData(localData.compareData);
          setPendingSyncCount(await syncManager.getPendingCount());
        } else {
          Alert.alert('Erro', 'Plano base indisponível em modo offline.');
        }
      } else {
        await syncManager.copyBasePlan(activeDate, diet?.meals || []);
        await fetchDashboardData(true, activeDate);
      }
    } catch (err) {
      console.error('Erro ao importar plano de refeições:', err);
      Alert.alert('Erro', 'Não foi possível copiar o plano de refeições base.');
    } finally {
      setCopyingPlan(false);
    }
  };

  // Ajustar quantidade do alimento no diário (+/-)
  const handleAdjustLogQuantity = async (item: any, direction: 'increment' | 'decrement') => {
    const factor = direction === 'increment' ? 1.25 : 0.75;
    const newQty = Math.max(10, Math.round(item.quantity * factor));
    const ratio = newQty / item.quantity;

    try {
      await syncManager.adjustFoodLogQuantity(item, newQty, ratio);
      
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
      setCompareData(localData.compareData);
      setPendingSyncCount(await syncManager.getPendingCount());
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível ajustar a quantidade.');
    }
  };

  // Deletar alimento do diário
  const handleDeleteLogItem = async (id: any) => {
    try {
      await syncManager.deleteFoodLog(id.toString());
      
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
      setCompareData(localData.compareData);
      setPendingSyncCount(await syncManager.getPendingCount());
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível remover o alimento do diário.');
    }
  };

  // Selecionar Treino Concluído (Fichas + Cardio/Descanso/Off)
  const handleWorkoutCheckInPress = () => {
    const workouts = workout?.days?.map((d: any) => d.name) || ['Treino A', 'Treino B'];
    
    const options = workouts.map((name: string) => ({
      text: name,
      onPress: () => handleWorkoutCheckIn(name)
    }));
    
    options.push({
      text: lang === 'pt' ? 'Cardio / Aeróbico 🏃‍♂️' : 'Cardio 🏃‍♂️',
      onPress: () => handleWorkoutCheckIn('Cardio')
    });

    options.push({
      text: lang === 'pt' ? 'Descanso / Off 🛌' : 'Rest / Off 🛌',
      onPress: () => handleWorkoutCheckIn('Descanso')
    });
    
    options.push({
      text: lang === 'pt' ? 'Desmarcar Treino ❌' : 'Clear Workout ❌',
      onPress: () => handleWorkoutCheckIn(null),
      style: 'destructive' as const
    });

    options.push({
      text: lang === 'pt' ? 'Cancelar' : 'Cancel',
      onPress: () => {},
      style: 'cancel' as const
    });

    Alert.alert(
      lang === 'pt' ? 'Check-in de Treino' : 'Workout Check-in',
      lang === 'pt' ? 'Qual rotina você completou hoje?' : 'Which routine did you complete today?',
      options
    );
  };

  const handleWorkoutCheckIn = async (workoutName: string | null) => {
    const isDone = workoutName !== 'Descanso' && workoutName !== null;
    setLoggedWorkoutName(workoutName);
    setWorkoutDoneToday(isDone);
    try {
      if (workoutName === null) {
        await syncManager.deleteWorkoutCheckIn(activeDate);
      } else {
        await syncManager.checkInWorkout(workoutName, activeDate);
      }
      setPendingSyncCount(await syncManager.getPendingCount());
    } catch (err) {
      console.error(err);
      setLoggedWorkoutName(null);
      setWorkoutDoneToday(false);
      Alert.alert('Erro', 'Não foi possível salvar o status do treino.');
    }
  };

  // Atualizar peso corporal
  const handleWeightUpdate = async () => {
    const weightNum = Number(newWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Erro', 'Por favor, digite um peso válido.');
      return;
    }

    try {
      const updatedProfile = { ...profile, weight: weightNum };
      setProfile(updatedProfile);
      setWeightModalVisible(false);
      setNewWeight('');

      await syncManager.updateWeight(weightNum, activeDate);
      setPendingSyncCount(await syncManager.getPendingCount());
      
      Alert.alert('Sucesso', 'Peso corporal atualizado.');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível atualizar o peso.');
    }
  };

  // Abrir modal de alteração de quantidade do alimento
  const handleEditQuantityPress = (item: any) => {
    setEditingLogItem(item);
    setEditingQuantity(Math.round(item.quantity).toString());
    setQuantityModalVisible(true);
  };

  // Atualizar quantidade do alimento digitada no Modal
  const handleQuantityUpdate = async () => {
    const qtyNum = Number(editingQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0 || !editingLogItem) {
      Alert.alert('Erro', 'Por favor, digite uma quantidade válida.');
      return;
    }

    const ratio = qtyNum / editingLogItem.quantity;

    try {
      await syncManager.adjustFoodLogQuantity(editingLogItem, qtyNum, ratio);
      
      setQuantityModalVisible(false);
      setEditingLogItem(null);
      setEditingQuantity('');
      
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
      setCompareData(localData.compareData);
      setPendingSyncCount(await syncManager.getPendingCount());
      
      Alert.alert('Sucesso', 'Quantidade atualizada.');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível atualizar a quantidade.');
    }
  };

  // Buscar alimentos para substituição no app móvel
  useEffect(() => {
    if (substituteSearchTerm.trim() === '') {
      setSubstituteSearchResults([]);
      return;
    }
    const filtered = initialFoodDatabase.filter(food => 
      food.name.toLowerCase().includes(substituteSearchTerm.toLowerCase())
    ).slice(0, 5);
    setSubstituteSearchResults(filtered);
  }, [substituteSearchTerm]);

  // Executar a substituição equivalente no app móvel
  const handleReplaceFoodWithEquivalent = async () => {
    if (!substitutingItem || !selectedSubstituteFood) return;

    const originalCalories = substitutingItem.calories;
    const newFoodCal100g = selectedSubstituteFood.calories;

    if (newFoodCal100g <= 0) {
      Alert.alert('Erro', 'Alimento equivalente inválido.');
      return;
    }

    const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
    const ratio = equivalentQuantity / 100;

    try {
      await syncManager.deleteFoodLog(substitutingItem.id.toString());
      await syncManager.addFoodLog(
        substitutingItem.meal_name || 'Almoço',
        selectedSubstituteFood.name,
        originalCalories,
        equivalentQuantity,
        {
          protein: selectedSubstituteFood.protein * ratio,
          carbs: selectedSubstituteFood.carbs * ratio,
          fat: selectedSubstituteFood.fat * ratio
        },
        activeDate
      );

      setSubstituteModalVisible(false);
      setSubstitutingItem(null);
      setSubstituteSearchTerm('');
      setSelectedSubstituteFood(null);

      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
      setCompareData(localData.compareData);
      setPendingSyncCount(await syncManager.getPendingCount());
    } catch (err) {
      console.error('Erro ao substituir alimento no app:', err);
      Alert.alert('Erro', 'Não foi possível substituir o alimento.');
    }
  };

  const handleLogoutPress = async () => {
    await syncManager.clearAllLocalTables();
    await logout();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Sincronizando dados...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.warningTitle}>Bem-vindo ao FitLife! 👋</Text>
        <Text style={styles.warningText}>
          Você precisa preencher seu planejamento no assistente pelo site para sincronizar os dados no celular.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress}>
          <Text style={styles.logoutBtnText}>Fazer Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cálculos de Nutrição Reais baseados no dietLogs
  let consumedCal = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (dietLogs && dietLogs.length > 0) {
    dietLogs.forEach((item: any) => {
      consumedCal += Math.round(Number(item.calories || 0));
      consumedProtein += Math.round(Number(item.protein || 0));
      consumedCarbs += Math.round(Number(item.carbs || 0));
      consumedFat += Math.round(Number(item.fat || 0));
    });
  }

  const calorieTarget = profile.targetCalories || 2000;
  const calPercent = Math.min((consumedCal / calorieTarget) * 100, 100);
  const waterTarget = Math.round(profile.weight * 35);
  const waterPercent = Math.min((waterIntake / waterTarget) * 100, 100);

  // Agrupamento por Refeição no mobile dinâmico
  const mealsPerDay = profile?.mealsPerDay || 4;
  let mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar'];
  if (mealsPerDay === 3) {
    mealsStructure = ['Café da Manhã', 'Almoço', 'Jantar'];
  } else if (mealsPerDay === 5) {
    mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'];
  } else if (mealsPerDay === 6) {
    mealsStructure = ['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'];
  }
  const groupedDietLogs: { [key: string]: any[] } = {};
  mealsStructure.forEach(meal => {
    groupedDietLogs[meal] = dietLogs.filter((log: any) => log.meal_name === meal);
  });

  // Outras refeições
  dietLogs.forEach((log: any) => {
    if (!mealsStructure.includes(log.meal_name)) {
      if (!groupedDietLogs[log.meal_name]) {
        groupedDietLogs[log.meal_name] = [];
      }
      groupedDietLogs[log.meal_name].push(log);
    }
  });

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#4f46e5']}
          tintColor="#4f46e5"
        />
      }
    >
      {/* Banner de Sincronização / Status Offline */}
      {(isOffline || pendingSyncCount > 0) && (
        <View style={[
          styles.syncBanner, 
          isOffline ? styles.syncBannerOffline : styles.syncBannerPending
        ]}>
          <Text style={styles.syncBannerText}>
            {isOffline 
              ? `📶 Operando Offline${pendingSyncCount > 0 ? ` (${pendingSyncCount} pendentes)` : ''}`
              : `🔄 Sincronizando ${pendingSyncCount} alteração(ões)...`}
          </Text>
        </View>
      )}

      {/* Header com Navegação de Data */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            {translations[lang].welcome} {profile.gender === 'female' || profile.gender === 'feminino' ? translations[lang].campea : translations[lang].campeao}
          </Text>
          <Text style={styles.dateText}>{lang === 'pt' ? 'Mantenha o foco em seus objetivos' : 'Keep track of your health goals'}</Text>
        </View>
      </View>

      {/* Navegador de Data */}
      <View style={styles.dateBar}>
        <TouchableOpacity style={styles.dateNavBtn} onPress={handlePrevDay}>
          <Ionicons name="chevron-back-outline" size={20} color="#a1a1aa" />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Ionicons name="calendar-outline" size={16} color="#4f46e5" style={{ marginRight: 6 }} />
          <Text style={styles.dateBarTitle}>{formatDateDisplay(activeDate)}</Text>
        </View>
        <TouchableOpacity style={styles.dateNavBtn} onPress={handleNextDay}>
          <Ionicons name="chevron-forward-outline" size={20} color="#a1a1aa" />
        </TouchableOpacity>
      </View>

      {/* Calorias Totais do Diário */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{lang === 'pt' ? 'Consumo Calórico Real' : 'Real Calorie Intake'}</Text>
        <View style={styles.calRow}>
          <Text style={styles.calText}>{consumedCal} kcal / {calorieTarget} kcal</Text>
          <Text style={styles.calPercentText}>{Math.round(calPercent)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${calPercent}%`, backgroundColor: '#e11d48' }]} />
        </View>
      </View>

      {/* Macros Consumidos no Diário */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].macrosSub}</Text>
        
        {/* Proteína */}
        <View style={styles.macroGroup}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>{translations[lang].protein}</Text>
            <Text style={styles.macroValue}>{consumedProtein}g / {profile.macros?.protein}g</Text>
          </View>
          <View style={styles.progressBarBgMini}>
            <View style={[styles.progressBarFillMini, { width: `${Math.min((consumedProtein / (profile.macros?.protein || 1)) * 100, 100)}%`, backgroundColor: '#fb7185' }]} />
          </View>
        </View>

        {/* Carboidrato */}
        <View style={styles.macroGroup}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>{translations[lang].carbs}</Text>
            <Text style={styles.macroValue}>{consumedCarbs}g / {profile.macros?.carbs}g</Text>
          </View>
          <View style={styles.progressBarBgMini}>
            <View style={[styles.progressBarFillMini, { width: `${Math.min((consumedCarbs / (profile.macros?.carbs || 1)) * 100, 100)}%`, backgroundColor: '#60a5fa' }]} />
          </View>
        </View>

        {/* Gordura */}
        <View style={styles.macroGroup}>
          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>{translations[lang].fat}</Text>
            <Text style={styles.macroValue}>{consumedFat}g / {profile.macros?.fat}g</Text>
          </View>
          <View style={styles.progressBarBgMini}>
            <View style={[styles.progressBarFillMini, { width: `${Math.min((consumedFat / (profile.macros?.fat || 1)) * 100, 100)}%`, backgroundColor: '#fbbf24' }]} />
          </View>
        </View>
      </View>

      {/* DIÁRIO ALIMENTAR DO DIA */}
      <View style={styles.card}>
        <View style={styles.diaryHeaderRow}>
          <Text style={styles.cardHeader}>{lang === 'pt' ? 'Alimentos Consumidos' : 'Foods Logged'}</Text>
          {dietLogs.length === 0 && (
            <TouchableOpacity 
              onPress={handleCopyPlan}
              disabled={copyingPlan}
              style={styles.diaryImportBtn}
            >
              <Text style={styles.diaryImportBtnText}>{copyingPlan ? 'Aguarde...' : 'Copiar Plano Base'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {dietLogs.length === 0 ? (
          <View style={styles.emptyDiaryContainer}>
            <Text style={styles.emptyDiaryText}>Seu diário para esta data está vazio.</Text>
            <TouchableOpacity style={styles.emptyDiaryImportBtn} onPress={handleCopyPlan}>
              <Text style={styles.emptyDiaryImportBtnText}>Registrar Refeições Recomendadas</Text>
            </TouchableOpacity>
          </View>
        ) : (
          Object.keys(groupedDietLogs).map((mealName) => {
            const logs = groupedDietLogs[mealName];
            if (logs.length === 0) return null;
            return (
              <View key={mealName} style={styles.mealSection}>
                <Text style={styles.mealSectionTitle}>{mealName}</Text>
                {logs.map((item: any) => (
                  <View key={item.id} style={styles.mealItemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.mealItemName} numberOfLines={1} ellipsizeMode="tail">{item.food_name}</Text>
                      <Text style={styles.mealItemSub}>
                        {item.food_name?.toLowerCase().includes('ovo') && `(~${(item.quantity / 50).toFixed(1)} unid) • `}
                        P: {Math.round(item.protein)}g • C: {Math.round(item.carbs)}g • G: {Math.round(item.fat)}g
                      </Text>
                    </View>
                    <View style={styles.mealItemActions}>
                      <Text style={styles.mealItemCal}>{Math.round(item.calories)} kcal</Text>
                      
                      {/* Ajuste +/- rápido */}
                      <View style={styles.qtyControl}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustLogQuantity(item, 'decrement')}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.qtyBtn, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#3f3f46', paddingHorizontal: 6 }]} 
                          onPress={() => handleEditQuantityPress(item)}
                        >
                          <Text style={[styles.qtyBtnText, { color: '#ffffff', fontSize: 10 }]}>
                            {Math.round(item.quantity)}g
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustLogQuantity(item, 'increment')}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity 
                        style={[styles.deleteBtn, { marginRight: 4 }] as any} 
                        onPress={() => {
                          setSubstitutingItem(item);
                          setSubstituteSearchTerm('');
                          setSelectedSubstituteFood(null);
                          setSubstituteModalVisible(true);
                        }}
                      >
                        <Ionicons name="sync-outline" size={16} color="#6366f1" />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.deleteBtn as any} onPress={() => handleDeleteLogItem(item.id)}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </View>

      {/* Hidratação Rápida */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].waterTitle}</Text>
        <View style={styles.waterGaugeRow}>
          <View style={styles.waterGaugeCircle}>
            <Text style={styles.waterGaugePercent}>{Math.round(waterPercent)}%</Text>
            <Text style={styles.waterGaugeSub}>{waterIntake}ml</Text>
          </View>
          <View style={styles.waterGaugeInfo}>
            <Text style={styles.waterTargetText}>{translations[lang].waterGoal}: {waterTarget} ml</Text>
            <View style={styles.waterActionButtons}>
              <TouchableOpacity style={styles.waterAddBtn} onPress={() => handleQuickWaterAdd(250)}>
                <Text style={styles.waterAddBtnText}>+250ml</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.waterAddBtn} onPress={() => handleQuickWaterAdd(500)}>
                <Text style={styles.waterAddBtnText}>+500ml</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.waterResetBtn} onPress={handleWaterReset}>
              <Text style={styles.waterResetBtnText}>{translations[lang].reset}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* INTELIGÊNCIA COMPARATIVA (Hoje x Ontem) */}
      {compareData && (
        <View style={[styles.card, { backgroundColor: '#09090b', borderColor: '#3f3f46' }]}>
          <View style={styles.compareTitleRow}>
            <Text style={[styles.cardHeader, { color: '#6366f1', marginBottom: 4 }]}>💡 Inteligência de Nutrição</Text>
            <Text style={styles.compareTitle}>Comparativo Hoje x Ontem</Text>
          </View>

          <View style={styles.compareColumns}>
            <View style={styles.compareCol}>
              <Text style={styles.compareColLabel}>Ontem</Text>
              <Text style={styles.compareColVal}>{compareData.yesterday.calories} kcal</Text>
              <Text style={styles.compareColSub}>P: {compareData.yesterday.protein}g</Text>
            </View>
            
            <View style={styles.compareCol}>
              <Text style={[styles.compareColLabel, { color: '#6366f1' }]}>Hoje</Text>
              <Text style={[styles.compareColVal, { color: '#6366f1' }]}>{compareData.today.calories} kcal</Text>
              <Text style={styles.compareColSub}>P: {compareData.today.protein}g</Text>
            </View>
          </View>

          <View style={styles.compareFeedback}>
            <Text style={styles.compareFeedbackText}>
              {compareData.today.calories === 0 ? (
                'Você ainda não comeu hoje. Registre no diário!'
              ) : compareData.today.calories < compareData.yesterday.calories ? (
                `Você consumiu ${compareData.yesterday.calories - compareData.today.calories} kcal a menos em relação a ontem. Mantendo o déficit!`
              ) : (
                `Você consumiu ${compareData.today.calories - compareData.yesterday.calories} kcal a mais hoje em relação a ontem.`
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Ações Rápidas (Treino e Peso) */}
      <View style={styles.actionsGrid}>
        
        {/* Card Peso */}
        <TouchableOpacity style={styles.actionCard} onPress={() => setWeightModalVisible(true)}>
          <Text style={styles.actionCardIcon}>⚖️</Text>
          <Text style={styles.actionCardTitle}>{translations[lang].weightTitle}</Text>
          <Text style={styles.actionCardValue}>{profile.weight} kg</Text>
          <Text style={styles.actionCardSub}>{lang === 'pt' ? 'Toque para atualizar' : 'Tap to update'}</Text>
        </TouchableOpacity>

        {/* Card Treino Diário (Check-in Flexível) */}
        <TouchableOpacity 
          style={[styles.actionCard, !!loggedWorkoutName && styles.actionCardChecked]} 
          onPress={handleWorkoutCheckInPress}
        >
          <Text style={styles.actionCardIcon}>{loggedWorkoutName ? '✅' : '💪'}</Text>
          <Text style={[styles.actionCardTitle, !!loggedWorkoutName && styles.actionCardTextChecked]}>Check-in de Treino</Text>
          <Text style={[styles.actionCardValue, !!loggedWorkoutName && styles.actionCardTextChecked]}>
            {loggedWorkoutName ? loggedWorkoutName : translations[lang].workoutPending}
          </Text>
          <Text style={[styles.actionCardSub, !!loggedWorkoutName && styles.actionCardTextChecked]}>
            {lang === 'pt' ? 'Toque para alterar' : 'Tap to change'}
          </Text>
        </TouchableOpacity>

      </View>

      {/* Modal para atualizar o peso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={weightModalVisible}
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{translations[lang].weightText}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ex: 78.4"
              placeholderTextColor="#71717a"
              value={newWeight}
              onChangeText={setNewWeight}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setWeightModalVisible(false)}>
                <Text style={styles.modalBtnText}>{lang === 'pt' ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleWeightUpdate}>
                <Text style={styles.modalBtnText}>{translations[lang].save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para atualizar a quantidade de um alimento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quantityModalVisible}
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Alterar Quantidade</Text>
            {editingLogItem && (
              <Text style={styles.modalSubTitle}>
                Digite a nova quantidade para "{editingLogItem.food_name}" (em gramas):
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              placeholder="Ex: 160"
              placeholderTextColor="#71717a"
              value={editingQuantity}
              onChangeText={setEditingQuantity}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setQuantityModalVisible(false)}>
                <Text style={styles.modalBtnText}>{lang === 'pt' ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleQuantityUpdate}>
                <Text style={styles.modalBtnText}>{translations[lang].save}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Substituição Equivalente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={substituteModalVisible}
        onRequestClose={() => {
          setSubstituteModalVisible(false);
          setSubstitutingItem(null);
        }}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {lang === 'pt' ? 'Substituição Equivalente' : 'Swap Food'}
            </Text>
            
            {substitutingItem && (
              <Text style={styles.modalSubTitle}>
                {lang === 'pt' 
                  ? `Trocar ${substitutingItem.food_name} (${Math.round(substitutingItem.calories)} kcal)` 
                  : `Swap ${substitutingItem.food_name} (${Math.round(substitutingItem.calories)} kcal)`}
              </Text>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder={lang === 'pt' ? "Digite o substituto..." : "Search substitute..."}
              placeholderTextColor="#71717a"
              value={substituteSearchTerm}
              onChangeText={setSubstituteSearchTerm}
            />

            {/* Resultados da busca */}
            {substituteSearchResults.length > 0 && (
              <ScrollView style={styles.searchResultsContainer} nestedScrollEnabled={true}>
                {substituteSearchResults.map((food: any) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setSelectedSubstituteFood(food);
                      setSubstituteSearchTerm(food.name);
                      setSubstituteSearchResults([]);
                    }}
                  >
                    <Text style={styles.searchResultItemText}>{food.name}</Text>
                    <Text style={styles.searchResultItemSub}>{food.calories} kcal / 100g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Cálculo pré-visualização */}
            {selectedSubstituteFood && substitutingItem && (() => {
              const originalCalories = substitutingItem.calories;
              const newFoodCal100g = selectedSubstituteFood.calories;
              const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
              const ratio = equivalentQuantity / 100;
              return (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewText}>
                    {lang === 'pt' ? 'Você comerá:' : 'You will eat:'}
                  </Text>
                  <Text style={styles.previewResult}>
                    {equivalentQuantity}g de {selectedSubstituteFood.name}
                  </Text>
                  <Text style={styles.previewMacros}>
                    P: {Math.round(selectedSubstituteFood.protein * ratio)}g • C: {Math.round(selectedSubstituteFood.carbs * ratio)}g • G: {Math.round(selectedSubstituteFood.fat * ratio)}g
                  </Text>
                </View>
              );
            })()}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => {
                  setSubstituteModalVisible(false);
                  setSubstitutingItem(null);
                }}
              >
                <Text style={styles.modalBtnText}>{lang === 'pt' ? 'Cancelar' : 'Cancel'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSaveBtn, !selectedSubstituteFood && { opacity: 0.5 }]} 
                onPress={handleReplaceFoodWithEquivalent}
                disabled={!selectedSubstituteFood}
              >
                <Text style={styles.modalBtnText}>{lang === 'pt' ? 'Confirmar' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles: any = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
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
    padding: 30,
  },
  loadingText: {
    color: '#a1a1aa',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fafafa',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  logoutBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  header: {
    marginBottom: 16,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fafafa',
  },
  dateText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
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
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#fafafa',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  calText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  calPercentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d48',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroGroup: {
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
  },
  macroValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBgMini: {
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFillMini: {
    height: '100%',
    borderRadius: 2,
  },
  waterGaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterGaugeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  waterGaugePercent: {
    color: '#3b82f6',
    fontWeight: '900',
    fontSize: 18,
  },
  waterGaugeSub: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
  },
  waterGaugeInfo: {
    flex: 1,
  },
  waterTargetText: {
    color: '#fafafa',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  waterActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  waterAddBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  waterAddBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  waterResetBtn: {
    paddingVertical: 4,
  },
  waterResetBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  diaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  diaryImportBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diaryImportBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyDiaryContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    borderRadius: 12,
    padding: 16,
  },
  emptyDiaryText: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDiaryImportBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyDiaryImportBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  mealSection: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 10,
  },
  mealSectionTitle: {
    color: '#f4f4f5',
    fontWeight: '900',
    fontSize: 13,
    marginBottom: 8,
  },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  mealItemName: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
  },
  mealItemSub: {
    color: '#71717a',
    fontSize: 9,
    marginTop: 2,
  },
  mealItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealItemCal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  qtyControl: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 6,
    overflow: 'hidden',
  },
  qtyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtnText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '900',
  },
  deleteBtn: {
    padding: 4,
  },
  compareTitleRow: {
    marginBottom: 12,
  },
  compareTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  compareColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  compareCol: {
    flex: 1,
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  compareColLabel: {
    color: '#71717a',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  compareColVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  compareColSub: {
    color: '#a1a1aa',
    fontSize: 9,
    marginTop: 2,
  },
  compareFeedback: {
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 10,
  },
  compareFeedbackText: {
    color: '#a1a1aa',
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    alignItems: 'center',
  },
  actionCardChecked: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b20',
  },
  actionCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fafafa',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionCardTextChecked: {
    color: '#34d399',
  },
  actionCardValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionCardSub: {
    fontSize: 9,
    color: '#71717a',
    textAlign: 'center',
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
    maxWidth: 320,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#27272a',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubTitle: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchResultsContainer: {
    maxHeight: 180,
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    marginBottom: 16,
  },
  searchResultItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  searchResultItemText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultItemSub: {
    color: '#71717a',
    fontSize: 10,
    marginTop: 2,
  },
  previewContainer: {
    backgroundColor: '#09090b',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4f46e550',
    marginBottom: 16,
    alignItems: 'center',
  },
  previewText: {
    color: '#a1a1aa',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewResult: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewMacros: {
    color: '#d4d4d8',
    fontSize: 10,
    fontWeight: '700',
  },
  syncBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  syncBannerOffline: {
    backgroundColor: '#b91c1c20',
    borderWidth: 1,
    borderColor: '#ef444450',
  },
  syncBannerPending: {
    backgroundColor: '#1e3a8a20',
    borderWidth: 1,
    borderColor: '#3b82f650',
  },
  syncBannerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
