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
  FlatList
} from 'react-native';
import api from '@/constants/api';
import { initialFoodDatabase } from '../data/foodDatabase';
import { useAuth } from '@/hooks/useAuth';
import { translations } from '../utils/translations';

export default function DietScreen() {
  const { lang } = useAuth();
  const [diet, setDiet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);
  
  // Estados de busca de alimentos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantity, setQuantity] = useState('100');

  const fetchDiet = async () => {
    try {
      const res = await api.get('/api/diet');
      setDiet(res.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível carregar o plano de dieta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiet();
  }, []);

  // Filtrar alimentos locais conforme busca
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = initialFoodDatabase.filter((food: any) => 
        food.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleAddFood = async () => {
    if (!selectedFood || !selectedMealId) return;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Erro', 'Digite uma quantidade válida em gramas.');
      return;
    }

    // Calcular macronutrientes proporcionais à quantidade (tabela é por 100g)
    const factor = qty / 100;
    const itemData = {
      name: selectedFood.name,
      quantity: qty,
      protein: Math.round(selectedFood.protein * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
      fat: Math.round(selectedFood.fat * factor * 10) / 10,
      calories: Math.round(selectedFood.calories * factor)
    };

    try {
      await api.post(`/api/diet/meal/${selectedMealId}/item`, itemData);
      
      // Resetar estados
      setModalVisible(false);
      setSelectedFood(null);
      setSearchQuery('');
      setQuantity('100');
      
      // Atualizar dados na tela
      fetchDiet();
      Alert.alert(lang === 'pt' ? 'Sucesso' : 'Success', lang === 'pt' ? 'Alimento adicionado com sucesso!' : 'Food added successfully!');
    } catch (err) {
      console.error(err);
      Alert.alert(lang === 'pt' ? 'Erro' : 'Error', lang === 'pt' ? 'Falha ao adicionar o alimento.' : 'Failed to add food.');
    }
  };

  const handleDeleteItem = async (mealId: number, itemId: number) => {
    Alert.alert(
      lang === 'pt' ? 'Remover Alimento' : 'Remove Food',
      lang === 'pt' ? 'Deseja realmente excluir este alimento da sua refeição?' : 'Do you really want to delete this food from your meal?',
      [
        { text: lang === 'pt' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        { 
          text: lang === 'pt' ? 'Excluir' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/diet/meal/${mealId}/item/${itemId}`);
              fetchDiet();
            } catch (err) {
              console.error(err);
              Alert.alert(lang === 'pt' ? 'Erro' : 'Error', lang === 'pt' ? 'Não foi possível excluir o alimento.' : 'Could not delete food.');
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>{translations[lang].dietTitle}</Text>
          <Text style={styles.subtitle}>{diet?.name || (lang === 'pt' ? 'Dieta Personalizada' : 'Custom Diet')}</Text>
        </View>

        {/* Lista de Refeições */}
        {diet?.meals && diet.meals.length > 0 ? (
          diet.meals.map((meal: any) => {
            // Calcular macros da refeição
            let mealCal = 0;
            let mealProt = 0;
            let mealCarb = 0;
            let mealFat = 0;

            if (meal.items) {
              meal.items.forEach((i: any) => {
                mealCal += i.calories;
                mealProt += i.protein;
                mealCarb += i.carbs;
                mealFat += i.fat;
              });
            }

            return (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealCalories}>{mealCal} kcal</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => {
                      setSelectedMealId(meal.id);
                      setModalVisible(true);
                    }}
                  >
                    <Text style={styles.addBtnText}>{translations[lang].addBtnText}</Text>
                  </TouchableOpacity>
                </View>

                {/* Lista de Alimentos da Refeição */}
                {meal.items && meal.items.length > 0 ? (
                  <View style={styles.itemsList}>
                    {meal.items.map((item: any) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemWeight}>
                            {item.quantity}g • P:{item.protein}g C:{item.carbs}g G:{item.fat}g
                          </Text>
                        </View>
                        <Text style={styles.itemCal}>{item.calories} kcal</Text>
                        <TouchableOpacity 
                          style={styles.deleteBtn}
                          onPress={() => handleDeleteItem(meal.id, item.id)}
                        >
                          <Text style={styles.deleteBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>{translations[lang].emptyMeal}</Text>
                )}

                {/* Sub-totais de macros da refeição */}
                {meal.items && meal.items.length > 0 ? (
                  <View style={styles.mealSummaryLine}>
                    <Text style={styles.summaryLabel}>Total: P:{Math.round(mealProt)}g C:{Math.round(mealCarb)}g G:{Math.round(mealFat)}g</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>{lang === 'pt' ? 'Nenhuma refeição cadastrada.' : 'No meals configured.'}</Text>
        )}
      </ScrollView>

      {/* Modal para buscar e adicionar alimentos */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedFood(null);
        }}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{translations[lang].addFood}</Text>

            {/* Input de Busca */}
            <TextInput
              style={styles.searchInput}
              placeholder={translations[lang].searchPlaceholder}
              placeholderTextColor="#71717a"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />

            {/* Resultados da busca */}
            {selectedFood ? (
              <View style={styles.selectedFoodBox}>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                <Text style={styles.selectedFoodStats}>
                  {lang === 'pt' ? 'Valores p/ 100g' : 'Values per 100g'}: {selectedFood.calories} kcal (P: {selectedFood.protein}g C: {selectedFood.carbs}g G: {selectedFood.fat}g)
                </Text>
                <View style={styles.qtyRow}>
                  <Text style={styles.qtyLabel}>{translations[lang].quantityGrams}</Text>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.cancelActionBtn} 
                    onPress={() => setSelectedFood(null)}
                  >
                    <Text style={styles.btnText}>{translations[lang].changeFood}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveActionBtn}
                    onPress={handleAddFood}
                  >
                    <Text style={styles.btnText}>{translations[lang].confirm}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id.toString()}
                style={styles.resultsList}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.resultItem}
                    onPress={() => setSelectedFood(item)}
                  >
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.resultStats}>
                      {item.calories} kcal (P: {item.protein}g | C: {item.carbs}g | G: {item.fat}g)
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <Text style={styles.searchPrompt}>
                    {searchQuery.trim().length > 1 ? translations[lang].noFoodFound : translations[lang].searchHelp}
                  </Text>
                )}
              />
            )}

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => {
                setModalVisible(false);
                setSelectedFood(null);
                setSearchQuery('');
              }}
            >
              <Text style={styles.modalCloseText}>{lang === 'pt' ? 'Fechar' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
    marginTop: 10,
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
  mealCard: {
    backgroundColor: '#0c0c0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fafafa',
  },
  mealCalories: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '700',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#2563eb18',
    borderColor: '#2563eb',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  itemsList: {
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181b50',
    padding: 10,
    borderRadius: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fafafa',
  },
  itemWeight: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  itemCal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fafafa',
    marginRight: 10,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginVertical: 10,
  },
  mealSummaryLine: {
    borderTopWidth: 1,
    borderTopColor: '#27272a50',
    paddingTop: 10,
    marginTop: 10,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '700',
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#000000a0',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0c0c0f',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fafafa',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fafafa',
    marginBottom: 16,
  },
  resultsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#27272a50',
    paddingVertical: 12,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fafafa',
  },
  resultStats: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  searchPrompt: {
    fontSize: 12,
    color: '#52525b',
    textAlign: 'center',
    marginVertical: 20,
  },
  selectedFoodBox: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 16,
  },
  selectedFoodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fafafa',
    textAlign: 'center',
  },
  selectedFoodStats: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fafafa',
  },
  qtyInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 10,
    width: 80,
    paddingVertical: 6,
    fontSize: 14,
    color: '#fafafa',
    textAlign: 'center',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveActionBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 10,
  },
  modalCloseText: {
    color: '#71717a',
    fontWeight: '700',
    fontSize: 13,
  },
});
