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
import api from '@/constants/api';
import { initialFoodDatabase } from '../data/foodDatabase';
import { useAuth } from '@/hooks/useAuth';
import { translations } from '../utils/translations';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { SyncManager } from '../db/sync';

export default function DietScreen() {
  const { lang } = useAuth();
  const db = useSQLiteContext();
  const syncManager = React.useMemo(() => new SyncManager(db), [db]);
  
  // Abas internas da tela de Dieta no celular
  const [activeTab, setActiveTab] = useState<'diary' | 'recommended'>('diary');
  
  // Estados de Dados
  const [diet, setDiet] = useState<any>(null); // Plano recomendado base
  const [dietLogs, setDietLogs] = useState<any[]>([]); // Diário alimentar real
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copyingPlan, setCopyingPlan] = useState(false);

  // Controle de Data do Diário
  const [activeDate, setActiveDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Estado para Adicionar Alimento (tanto base quanto diário)
  const [addFoodModalVisible, setAddFoodModalVisible] = useState(false);
  const [selectedMealNameOrId, setSelectedMealNameOrId] = useState<any>(null); // Refeição alvo
  const [targetType, setTargetType] = useState<'diary' | 'recommended'>('diary'); // Alvo da inserção
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [foodQuantity, setFoodQuantity] = useState('100');

  // Estado para Substituição por Equivalência Calórica
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const [substitutingItem, setSubstitutingItem] = useState<any>(null);
  const [substituteSearchTerm, setSubstituteSearchTerm] = useState('');
  const [selectedSubstituteFood, setSelectedSubstituteFood] = useState<any>(null);
  const [substituteSearchResults, setSubstituteSearchResults] = useState<any[]>([]);

  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Carregar dados de Dieta e Diário via SyncManager
  const fetchDietData = async (isRefreshing = false, targetDate = activeDate) => {
    if (!isRefreshing) setLoading(true);
    try {
      const synced = await syncManager.syncFromServer(targetDate);
      setDiet(synced.diet);
      setDietLogs(synced.dietLogs || []);
    } catch (err) {
      console.error(err);
      // Fallback para SQLite local
      const localData = await syncManager.getLocalDashboardData(targetDate);
      setDiet(localData.diet);
      setDietLogs(localData.dietLogs || []);
    } finally {
      if (!isRefreshing) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietData(false, activeDate);
  }, [activeDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDietData(true, activeDate);
    setRefreshing(false);
  };

  // Filtragem de buscas locais de alimentos no SQLite (Multi-termo com score)
  useEffect(() => {
    let active = true;
    async function searchFoods() {
      if (searchQuery.trim().length > 1) {
        try {
          const terms = searchQuery.trim().split(/\s+/)
            .map(t => t.toLowerCase().replace(/[,.;()]/g, ''))
            .filter(t => t.length > 2);

          if (terms.length > 0) {
            const whereClauses = terms.map(() => 'name LIKE ?');
            const scoreClauses: string[] = [];
            const finalParams: any[] = [];

            // Pontuação por termo
            terms.forEach(t => {
              scoreClauses.push('(CASE WHEN name LIKE ? THEN 3 ELSE 0 END)');
              finalParams.push(`%${t}%`);
            });

            // Se começar com primeiro termo
            scoreClauses.push('(CASE WHEN name LIKE ? THEN 5 ELSE 0 END)');
            finalParams.push(`${terms[0]}%`);

            // Parâmetros do WHERE
            terms.forEach(t => {
              finalParams.push(`%${t}%`);
            });

            const query = `
              SELECT id, name, calories, protein, carbs, fat, serving_size as servingSize, category,
              (${scoreClauses.join(' + ')}) as score
              FROM foods 
              WHERE ${whereClauses.join(' OR ')}
              ORDER BY score DESC, name ASC LIMIT 15
            `;

            const results = await db.getAllAsync<any>(query, finalParams);
            if (active) {
              setSearchResults(results);
            }
          } else {
            if (active) setSearchResults([]);
          }
        } catch (err) {
          console.error('Erro ao buscar alimentos no SQLite local:', err);
          // Fallback para filtrar em memória
          const filtered = initialFoodDatabase.filter((food: any) => 
            food.name.toLowerCase().includes(searchQuery.toLowerCase())
          ).slice(0, 15);
          if (active) setSearchResults(filtered);
        }
      } else {
        setSearchResults([]);
      }
    }
    searchFoods();
    return () => { active = false; };
  }, [searchQuery, db]);

  useEffect(() => {
    let active = true;
    async function searchSubstituteFoods() {
      if (substituteSearchTerm.trim().length > 1) {
        try {
          const terms = substituteSearchTerm.trim().split(/\s+/)
            .map(t => t.toLowerCase().replace(/[,.;()]/g, ''))
            .filter(t => t.length > 2);

          if (terms.length > 0) {
            const whereClauses = terms.map(() => 'name LIKE ?');
            const scoreClauses: string[] = [];
            const finalParams: any[] = [];

            // Pontuação por termo
            terms.forEach(t => {
              scoreClauses.push('(CASE WHEN name LIKE ? THEN 3 ELSE 0 END)');
              finalParams.push(`%${t}%`);
            });

            // Se começar com primeiro termo
            scoreClauses.push('(CASE WHEN name LIKE ? THEN 5 ELSE 0 END)');
            finalParams.push(`${terms[0]}%`);

            // Parâmetros do WHERE
            terms.forEach(t => {
              finalParams.push(`%${t}%`);
            });

            const query = `
              SELECT id, name, calories, protein, carbs, fat, serving_size as servingSize, category,
              (${scoreClauses.join(' + ')}) as score
              FROM foods 
              WHERE ${whereClauses.join(' OR ')}
              ORDER BY score DESC, name ASC LIMIT 15
            `;

            const results = await db.getAllAsync<any>(query, finalParams);
            if (active) {
              setSubstituteSearchResults(results);
            }
          } else {
            if (active) setSubstituteSearchResults([]);
          }
        } catch (err) {
          console.error('Erro ao buscar alimentos para substituição no SQLite local:', err);
          // Fallback
          const filtered = initialFoodDatabase.filter((food: any) => 
            food.name.toLowerCase().includes(substituteSearchTerm.toLowerCase())
          ).slice(0, 15);
          if (active) setSubstituteSearchResults(filtered);
        }
      } else {
        setSubstituteSearchResults([]);
      }
    }
    searchSubstituteFoods();
    return () => { active = false; };
  }, [substituteSearchTerm, db]);

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
    
    if (dateStr === todayStr) return lang === 'pt' ? 'Hoje' : 'Today';
    if (dateStr === yesterdayStr) return lang === 'pt' ? 'Ontem' : 'Yesterday';
    const [year, month, day] = dateStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return d.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  // ==========================================
  // AÇÕES DO DIÁRIO REAL
  // ==========================================

  // Ajustar porção log diário
  const handleAdjustLogQuantity = async (item: any, direction: 'increment' | 'decrement') => {
    const factor = direction === 'increment' ? 1.25 : 0.75;
    const newQty = Math.max(10, Math.round(item.quantity * factor));
    const ratio = newQty / item.quantity;
    try {
      await syncManager.adjustFoodLogQuantity(item, newQty, ratio);
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir do diário real
  const handleDeleteLogItem = async (id: number) => {
    try {
      await syncManager.deleteFoodLog(id.toString());
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Substituir por equivalente calórico
  const handleReplaceFoodWithEquivalent = async () => {
    if (!substitutingItem || !selectedSubstituteFood) return;
    const originalCalories = substitutingItem.calories;
    const newFoodCal100g = selectedSubstituteFood.calories;
    if (newFoodCal100g <= 0) return;
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
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível fazer a troca.');
    }
  };

  // Copiar plano base completo
  const handleCopyFullPlan = async () => {
    setCopyingPlan(true);
    try {
      const localData = await syncManager.getLocalDashboardData(activeDate);
      const activeDietPlan = localData.diet;
      if (activeDietPlan && activeDietPlan.meals) {
        await syncManager.copyBasePlan(activeDate, activeDietPlan.meals);
        const refreshed = await syncManager.getLocalDashboardData(activeDate);
        setDietLogs(refreshed.dietLogs || []);
      } else {
        await api.post('/api/tracker/diet/copy-plan', { date: activeDate });
        await fetchDietData(true, activeDate);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Erro ao importar dieta recomendada.');
    } finally {
      setCopyingPlan(false);
    }
  };

  // ==========================================
  // AÇÕES DO PLANO RECOMENDADO (BASE)
  // ==========================================

  // Copiar item planejado individual para o diário de hoje
  const handleCopySingleItemToDiary = async (mealName: string, item: any) => {
    try {
      const quantity = Number(item.quantity);
      const calories = (item.calories * quantity) / 100;
      const protein = (item.protein * quantity) / 100;
      const carbs = (item.carbs * quantity) / 100;
      const fat = (item.fat * quantity) / 100;

      await syncManager.addFoodLog(
        mealName,
        item.name,
        calories,
        quantity,
        { protein, carbs, fat },
        activeDate
      );
      Alert.alert('Sucesso', `${item.name} copiado para o seu diário de hoje!`);
      
      const localData = await syncManager.getLocalDashboardData(activeDate);
      setDietLogs(localData.dietLogs || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível copiar o alimento.');
    }
  };

  // Excluir alimento do plano base
  const handleDeleteBaseItem = async (mealId: number, itemId: number) => {
    Alert.alert(
      'Remover do Plano Padrão',
      'Deseja realmente remover este alimento do seu plano de dieta base?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/diet/meal/${mealId}/item/${itemId}`);
              fetchDietData(true, activeDate);
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  // ==========================================
  // ADICIONAR ALIMENTO (GERAL)
  // ==========================================
  const handleAddFoodGeneral = async () => {
    if (!selectedFood || !selectedMealNameOrId) return;
    const qty = Number(foodQuantity);
    if (isNaN(qty) || qty <= 0) return Alert.alert('Erro', 'Quantidade inválida');
    const factor = qty / 100;

    if (targetType === 'diary') {
      // Adicionar no diário de hoje
      try {
        await syncManager.addFoodLog(
          selectedMealNameOrId.toString(),
          selectedFood.name,
          selectedFood.calories * factor,
          qty,
          {
            protein: selectedFood.protein * factor,
            carbs: selectedFood.carbs * factor,
            fat: selectedFood.fat * factor
          },
          activeDate
        );
        setAddFoodModalVisible(false);
        setSelectedFood(null);
        setSearchQuery('');
        setFoodQuantity('100');
        
        const localData = await syncManager.getLocalDashboardData(activeDate);
        setDietLogs(localData.dietLogs || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Adicionar no plano base recomendado
      try {
        await api.post(`/api/diet/meal/${selectedMealNameOrId}/item`, {
          name: selectedFood.name,
          quantity: qty,
          protein: selectedFood.protein,
          carbs: selectedFood.carbs,
          fat: selectedFood.fat,
          calories: selectedFood.calories
        });
        setAddFoodModalVisible(false);
        setSelectedFood(null);
        setSearchQuery('');
        setFoodQuantity('100');
        fetchDietData(true, activeDate);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  // Agrupamento do diário
  const mealsStructure = ['Café da Manhã', 'Almoço', 'Lanche', 'Jantar'];
  const groupedDietLogs: { [key: string]: any[] } = {};
  mealsStructure.forEach(m => groupedDietLogs[m] = dietLogs.filter((l: any) => l.meal_name === m));
  dietLogs.forEach((l: any) => {
    if (!mealsStructure.includes(l.meal_name)) {
      if (!groupedDietLogs[l.meal_name]) groupedDietLogs[l.meal_name] = [];
      groupedDietLogs[l.meal_name].push(l);
    }
  });

  // Totais consumidos no diário do mobile
  let consumedCal = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (dietLogs && dietLogs.length > 0) {
    dietLogs.forEach(l => {
      consumedCal += Math.round(Number(l.calories));
      consumedProtein += Math.round(Number(l.protein));
      consumedCarbs += Math.round(Number(l.carbs));
      consumedFat += Math.round(Number(l.fat));
    });
  }

  return (
    <View style={styles.container}>
      
      {/* Botões de Alternância de Abas Superiores */}
      <View style={styles.tabsHeader as any}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'diary' && styles.tabBtnActive] as any}
          onPress={() => setActiveTab('diary')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'diary' && styles.tabBtnTextActive] as any}>
            {lang === 'pt' ? 'Diário Alimentar' : 'Food Diary'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'recommended' && styles.tabBtnActive] as any}
          onPress={() => setActiveTab('recommended')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'recommended' && styles.tabBtnTextActive] as any}>
            {lang === 'pt' ? 'Plano Recomendado' : 'Recommended'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#4f46e5']} tintColor="#4f46e5" />
        }
      >
        
        {/* ABA 1: DIÁRIO ALIMENTAR DIÁRIO */}
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

            {/* Ingestão real calculada */}
            <View style={styles.macroTotalCard as any}>
              <Text style={styles.macroTotalHeader}>{lang === 'pt' ? 'Consumo Real' : 'Real Intake'}</Text>
              <Text style={styles.macroTotalCal}>{consumedCal} kcal / {diet?.meals ? Math.round(diet.meals.reduce((acc: number, m: any) => acc + (m.items?.reduce((a: number, i: any) => a + i.calories, 0) || 0), 0)) : 2000} kcal</Text>
              
              <View style={styles.macroTotalsRow as any}>
                <Text style={styles.macroTotalItem}>P: {consumedProtein}g</Text>
                <Text style={styles.macroTotalItem}>C: {consumedCarbs}g</Text>
                <Text style={styles.macroTotalItem}>G: {consumedFat}g</Text>
              </View>
            </View>

            {/* Listagem do diário */}
            {dietLogs.length === 0 ? (
              <View style={styles.emptyDiaryContainer as any}>
                <Text style={styles.emptyDiaryText}>Seu diário para esta data está vazio.</Text>
                <TouchableOpacity style={styles.emptyDiaryImportBtn} onPress={handleCopyFullPlan} disabled={copyingPlan}>
                  <Text style={styles.emptyDiaryImportBtnText}>
                    {copyingPlan ? 'Carregando...' : 'Copiar Recomendado para Hoje'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              Object.keys(groupedDietLogs).map((mealName) => {
                const logs = groupedDietLogs[mealName];
                if (logs.length === 0) return null;
                let mealCalories = logs.reduce((acc, curr) => acc + Number(curr.calories), 0);

                return (
                  <View key={mealName} style={styles.mealCard as any}>
                    <View style={styles.mealHeader as any}>
                      <View>
                        <Text style={styles.mealName}>{mealName}</Text>
                        <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.addBtn as any}
                        onPress={() => {
                          setSelectedMealNameOrId(mealName);
                          setTargetType('diary');
                          setAddFoodModalVisible(true);
                        }}
                      >
                        <Text style={styles.addBtnText}>+ Add</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemsList as any}>
                      {logs.map((item: any) => (
                        <View key={item.id} style={styles.itemRow as any}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemName}>{item.food_name}</Text>
                            <Text style={styles.itemWeight}>
                              {item.quantity}g • P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g G:{Math.round(item.fat)}g
                            </Text>
                          </View>
                          
                          <View style={styles.itemActionsRow as any}>
                            <Text style={styles.itemCal}>{Math.round(item.calories)} kcal</Text>
                            
                            {/* Controle +/- */}
                            <View style={styles.qtyControl as any}>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustLogQuantity(item, 'decrement')}>
                                <Text style={styles.qtyBtnText}>-</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAdjustLogQuantity(item, 'increment')}>
                                <Text style={styles.qtyBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>

                            {/* Trocar Equivalente */}
                            <TouchableOpacity 
                              style={styles.actionBtn as any}
                              onPress={() => {
                                setSubstitutingItem(item);
                                setSubstituteSearchTerm('');
                                setSelectedSubstituteFood(null);
                                setSubstituteModalVisible(true);
                              }}
                            >
                              <Ionicons name="sync-outline" size={14} color="#6366f1" />
                            </TouchableOpacity>

                            {/* Apagar */}
                            <TouchableOpacity style={styles.actionBtn as any} onPress={() => handleDeleteLogItem(item.id)}>
                              <Ionicons name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ABA 2: PLANO RECOMENDADO BASE */}
        {activeTab === 'recommended' && (
          <View style={styles.tabContent}>
            <View style={styles.recommendedIntroCard as any}>
              <Ionicons name="sparkles" size={18} color="#f59e0b" style={{ marginRight: 6 }} />
              <Text style={styles.recommendedIntroText}>
                Este é seu plano estruturado. Toque nos alimentos para copiá-los para o diário alimentar de hoje!
              </Text>
            </View>

            {diet?.meals && diet.meals.length > 0 ? (
              diet.meals.map((meal: any) => {
                let mealCal = 0;
                meal.items?.forEach((i: any) => mealCal += i.calories);

                return (
                  <View key={meal.id} style={styles.mealCard as any}>
                    <View style={styles.mealHeader as any}>
                      <View>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealCalories}>{mealCal} kcal</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.addBtn as any}
                        onPress={() => {
                          setSelectedMealNameOrId(meal.id);
                          setTargetType('recommended');
                          setAddFoodModalVisible(true);
                        }}
                      >
                        <Text style={styles.addBtnText}>+ Add Base</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.itemsList as any}>
                      {meal.items && meal.items.length > 0 ? (
                        meal.items.map((item: any) => (
                          <TouchableOpacity 
                            key={item.id} 
                            style={styles.itemRow as any}
                            onPress={() => {
                              Alert.alert(
                                'Ações do Plano Padrão',
                                `O que deseja fazer com ${item.name}?`,
                                [
                                  { 
                                    text: 'Copiar para Diário de Hoje 📝', 
                                    onPress: () => handleCopySingleItemToDiary(meal.name, item) 
                                  },
                                  { 
                                    text: 'Excluir do Plano Padrão ❌', 
                                    style: 'destructive',
                                    onPress: () => handleDeleteBaseItem(meal.id, item.id) 
                                  },
                                  { text: 'Cancelar', style: 'cancel' }
                                ]
                              );
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemWeight}>
                                {item.quantity}g • P:{item.protein}g C:{item.carbs}g G:{item.fat}g
                              </Text>
                            </View>
                            <View style={styles.itemActionsRow as any}>
                              <Text style={styles.itemCal}>{item.calories} kcal</Text>
                              <Ionicons name="arrow-redo-outline" size={14} color="#60a5fa" style={{ marginLeft: 6 }} />
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>{translations[lang].emptyMeal}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>{lang === 'pt' ? 'Nenhum plano configurado.' : 'No plan configured.'}</Text>
            )}
          </View>
        )}

      </ScrollView>

      {/* ==========================================
          MODAL DE ADICIONAR ALIMENTO (GERAL)
          ========================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addFoodModalVisible}
        onRequestClose={() => setAddFoodModalVisible(false)}
      >
        <View style={styles.modalBg as any}>
          <View style={styles.modalContent as any}>
            <Text style={styles.modalTitle}>
              {targetType === 'diary' ? 'Adicionar ao Diário' : 'Adicionar ao Plano Base'}
            </Text>

            <TextInput
              style={styles.modalInput as any}
              placeholder="Digite batata, aveia, frango..."
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResultsContainer as any} nestedScrollEnabled={true}>
                {searchResults.map((food: any) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.searchResultItem as any}
                    onPress={() => {
                      setSelectedFood(food);
                      setSearchQuery(food.name);
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.searchResultItemText as any}>{food.name}</Text>
                    <Text style={styles.searchResultItemSub as any}>{food.calories} kcal / 100g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedFood && (
              <View style={styles.previewContainer as any}>
                <Text style={styles.previewText as any}>Configurar porção (g):</Text>
                <TextInput
                  style={[styles.modalInput, { marginBottom: 0 }] as any}
                  keyboardType="numeric"
                  value={foodQuantity}
                  onChangeText={setFoodQuantity}
                />
              </View>
            )}

            <View style={styles.modalButtons as any}>
              <TouchableOpacity 
                style={styles.modalCancelBtn as any} 
                onPress={() => {
                  setAddFoodModalVisible(false);
                  setSelectedFood(null);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.modalBtnText as any}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSaveBtn, !selectedFood && { opacity: 0.5 }] as any} 
                onPress={handleAddFoodGeneral}
                disabled={!selectedFood}
              >
                <Text style={styles.modalBtnText as any}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL DE SUBSTITUIÇÃO EQUIVALENTE (DIÁRIO)
          ========================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={substituteModalVisible}
        onRequestClose={() => {
          setSubstituteModalVisible(false);
          setSubstitutingItem(null);
        }}
      >
        <View style={styles.modalBg as any}>
          <View style={styles.modalContent as any}>
            <Text style={styles.modalTitle}>Substituição Equivalente</Text>
            
            {substitutingItem && (
              <Text style={styles.modalSubTitle as any}>
                Trocar {substitutingItem.food_name} ({Math.round(substitutingItem.calories)} kcal)
              </Text>
            )}

            <TextInput
              style={styles.modalInput as any}
              placeholder="Digite o substituto..."
              placeholderTextColor="#71717a"
              value={substituteSearchTerm}
              onChangeText={setSubstituteSearchTerm}
            />

            {substituteSearchResults.length > 0 && (
              <ScrollView style={styles.searchResultsContainer as any} nestedScrollEnabled={true}>
                {substituteSearchResults.map((food: any) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.searchResultItem as any}
                    onPress={() => {
                      setSelectedSubstituteFood(food);
                      setSubstituteSearchTerm(food.name);
                      setSubstituteSearchResults([]);
                    }}
                  >
                    <Text style={styles.searchResultItemText as any}>{food.name}</Text>
                    <Text style={styles.searchResultItemSub as any}>{food.calories} kcal / 100g</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedSubstituteFood && substitutingItem && (() => {
              const originalCalories = substitutingItem.calories;
              const newFoodCal100g = selectedSubstituteFood.calories;
              const equivalentQuantity = Math.round((originalCalories * 100) / newFoodCal100g);
              const ratio = equivalentQuantity / 100;
              return (
                <View style={styles.previewContainer as any}>
                  <Text style={styles.previewText as any}>Você comerá:</Text>
                  <Text style={styles.previewResult as any}>
                    {equivalentQuantity}g de {selectedSubstituteFood.name}
                  </Text>
                  <Text style={styles.previewMacros as any}>
                    P: {Math.round(selectedSubstituteFood.protein * ratio)}g • C: {Math.round(selectedSubstituteFood.carbs * ratio)}g • G: {Math.round(selectedSubstituteFood.fat * ratio)}g
                  </Text>
                </View>
              );
            })()}

            <View style={styles.modalButtons as any}>
              <TouchableOpacity 
                style={styles.modalCancelBtn as any} 
                onPress={() => {
                  setSubstituteModalVisible(false);
                  setSubstitutingItem(null);
                }}
              >
                <Text style={styles.modalBtnText as any}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalSaveBtn, !selectedSubstituteFood && { opacity: 0.5 }] as any} 
                onPress={handleReplaceFoodWithEquivalent}
                disabled={!selectedSubstituteFood}
              >
                <Text style={styles.modalBtnText as any}>Confirmar</Text>
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
  macroTotalCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
    marginBottom: 14,
  },
  macroTotalHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  macroTotalCal: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  macroTotalsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroTotalItem: {
    color: '#d4d4d8',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyDiaryContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    borderRadius: 16,
    padding: 16,
  },
  emptyDiaryText: {
    color: '#71717a',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDiaryImportBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyDiaryImportBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  recommendedIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b30',
    borderWidth: 1,
    borderColor: '#312e81',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  recommendedIntroText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    lineHeight: 15,
  },
  mealCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 14,
    marginBottom: 14,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
    paddingBottom: 8,
    marginBottom: 8,
  },
  mealName: {
    color: '#fafafa',
    fontWeight: '900',
    fontSize: 14,
  },
  mealCalories: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '800',
  },
  itemsList: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  itemName: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '700',
  },
  itemWeight: {
    color: '#71717a',
    fontSize: 9,
    marginTop: 2,
  },
  itemCal: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  actionBtn: {
    padding: 4,
  },
  emptyText: {
    color: '#71717a',
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 4,
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
    fontSize: 14,
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
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchResultsContainer: {
    maxHeight: 150,
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
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewResult: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  previewMacros: {
    color: '#d4d4d8',
    fontSize: 10,
    fontWeight: '700',
  },
});
