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
  TextInput
} from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import api from '@/constants/api';
import { translations } from '../utils/translations';

export default function DashboardScreen() {
  const { logout, lang } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [diet, setDiet] = useState<any>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [workoutDoneToday, setWorkoutDoneToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    const todayStr = getLocalDateString();
    try {
      const [userRes, dietRes, waterRes, workoutDoneRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/diet').catch(() => ({ data: null })),
        api.get(`/api/tracker/water?date=${todayStr}`).catch(() => ({ data: { amount_ml: 0 } })),
        api.get(`/api/tracker/workout-done?date=${todayStr}`).catch(() => ({ data: { completed: false } }))
      ]);

      setProfile(userRes.data.profile);
      setDiet(dietRes.data);
      setWaterIntake(waterRes.data?.amount_ml || 0);
      setWorkoutDoneToday(!!workoutDoneRes.data?.completed);
    } catch (err) {
      console.error('Erro ao buscar dados do dashboard:', err);
      Alert.alert('Erro', 'Não foi possível carregar os dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleQuickWaterAdd = async (amount: number) => {
    const newVal = waterIntake + amount;
    setWaterIntake(newVal);
    try {
      const todayStr = getLocalDateString();
      await api.post('/api/tracker/water', { amount_ml: newVal, date: todayStr });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWaterReset = async () => {
    setWaterIntake(0);
    try {
      const todayStr = getLocalDateString();
      await api.post('/api/tracker/water', { amount_ml: 0, date: todayStr });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleWorkoutDone = async () => {
    const isDone = !workoutDoneToday;
    setWorkoutDoneToday(isDone);
    try {
      const todayStr = getLocalDateString();
      await api.post('/api/tracker/workout-done', { 
        workout_day_name: 'Treino Concluído', 
        date: todayStr, 
        isDone 
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWeightUpdate = async () => {
    const weightNum = Number(newWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Erro', 'Por favor, digite um peso válido.');
      return;
    }

    try {
      const todayStr = getLocalDateString();
      const updatedProfile = { ...profile, weight: weightNum };
      
      await Promise.all([
        api.put('/api/auth/profile', updatedProfile),
        api.post('/api/tracker/weight', { weight: weightNum, date: todayStr })
      ]);

      setProfile(updatedProfile);
      setWeightModalVisible(false);
      setNewWeight('');
      Alert.alert('Sucesso', 'Peso corporal atualizado.');
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível atualizar o peso.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Carregando dados da plataforma...</Text>
      </View>
    );
  }

  // Se o usuário não tem perfil
  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.warningTitle}>Bem-vindo ao FitLife! 👋</Text>
        <Text style={styles.warningText}>
          Você precisa preencher seu planejamento no wizard pelo navegador para carregar seus dados no celular.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Fazer Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cálculos de Macronutrientes
  let consumedCal = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (diet && diet.meals) {
    diet.meals.forEach((meal: any) => {
      if (meal.items) {
        meal.items.forEach((item: any) => {
          consumedCal += Math.round((item.calories * item.quantity) / 100);
          consumedProtein += Math.round((item.protein * item.quantity) / 100);
          consumedCarbs += Math.round((item.carbs * item.quantity) / 100);
          consumedFat += Math.round((item.fat * item.quantity) / 100);
        });
      }
    });
  }

  const calorieTarget = profile.targetCalories || 2000;
  const calPercent = Math.min((consumedCal / calorieTarget) * 100, 100);
  const waterTarget = Math.round(profile.weight * 35);
  const waterPercent = Math.min((waterIntake / waterTarget) * 100, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            {translations[lang].welcome} {profile.gender === 'female' || profile.gender === 'feminino' ? translations[lang].campea : translations[lang].campeao}
          </Text>
          <Text style={styles.dateText}>{lang === 'pt' ? 'Sua rotina diária no bolso' : 'Your daily routine in your pocket'}</Text>
        </View>
      </View>

      {/* Calorias Totais */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{translations[lang].macrosTitle}</Text>
        <View style={styles.calRow}>
          <Text style={styles.calText}>{consumedCal} kcal / {calorieTarget} kcal</Text>
          <Text style={styles.calPercentText}>{Math.round(calPercent)}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${calPercent}%`, backgroundColor: '#e11d48' }]} />
        </View>
      </View>

      {/* Macros Consumidos */}
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
              <Text style={styles.waterResetBtnText}>{translations[lang].resetBtn}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Ações Rápidas (Treino e Peso) */}
      <View style={styles.actionsGrid}>
        
        {/* Card Peso */}
        <TouchableOpacity style={styles.actionCard} onPress={() => setWeightModalVisible(true)}>
          <Text style={styles.actionCardIcon}>⚖️</Text>
          <Text style={styles.actionCardTitle}>{translations[lang].weightTitle}</Text>
          <Text style={styles.actionCardValue}>{profile.weight} kg</Text>
          <Text style={styles.actionCardSub}>{lang === 'pt' ? 'Toque para atualizar' : 'Tap to update'}</Text>
        </TouchableOpacity>

        {/* Card Treino Diário */}
        <TouchableOpacity 
          style={[styles.actionCard, workoutDoneToday && styles.actionCardChecked]} 
          onPress={toggleWorkoutDone}
        >
          <Text style={styles.actionCardIcon}>{workoutDoneToday ? '✅' : '💪'}</Text>
          <Text style={[styles.actionCardTitle, workoutDoneToday && styles.actionCardTextChecked]}>{translations[lang].workoutToday}</Text>
          <Text style={[styles.actionCardValue, workoutDoneToday && styles.actionCardTextChecked]}>
            {workoutDoneToday ? translations[lang].workoutDone : translations[lang].workoutPending}
          </Text>
          <Text style={[styles.actionCardSub, workoutDoneToday && styles.actionCardTextChecked]}>{lang === 'pt' ? 'Toque para alterar' : 'Tap to change'}</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fafafa',
  },
  dateText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  logoutLink: {
    padding: 8,
  },
  logoutLinkText: {
    color: '#f87171',
    fontWeight: '700',
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
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  calPercentText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e11d48',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#27272a',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  macroGroup: {
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 12,
    color: '#fafafa',
    fontWeight: '700',
  },
  progressBarBgMini: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFillMini: {
    height: '100%',
    borderRadius: 3,
  },
  waterGaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  waterGaugeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1d4ed810',
  },
  waterGaugePercent: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3b82f6',
  },
  waterGaugeSub: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
    marginTop: 2,
  },
  waterGaugeInfo: {
    flex: 1,
    gap: 8,
  },
  waterTargetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fafafa',
  },
  waterActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  waterAddBtn: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  waterAddBtnText: {
    color: '#fafafa',
    fontSize: 12,
    fontWeight: '700',
  },
  waterResetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  waterResetBtnText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  actionCardChecked: {
    backgroundColor: '#065f4630',
    borderColor: '#047857',
  },
  actionCardTextChecked: {
    color: '#10b981',
  },
  actionCardIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a1a1aa',
    textTransform: 'uppercase',
  },
  actionCardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  actionCardSub: {
    fontSize: 10,
    color: '#71717a',
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#000000a0',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fafafa',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fafafa',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
