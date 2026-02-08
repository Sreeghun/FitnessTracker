import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Food() {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [foodDatabase, setFoodDatabase] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [grams, setGrams] = useState('');
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFoodDatabase();
    loadTodayLog();
  }, []);

  const loadFoodDatabase = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/food-database`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFoodDatabase(response.data);
    } catch (error) {
      console.error('Error loading food database:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayLog = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/food-logs/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data) {
        setTodayEntries(response.data.entries || []);
      }
    } catch (error) {
      console.error('Error loading food log:', error);
    }
  };

  const handleAddFood = async () => {
    if (!selectedFood || !grams) {
      Alert.alert('Error', 'Please enter the amount in grams');
      return;
    }

    const gramsNum = parseFloat(grams);
    const multiplier = gramsNum / 100;

    const entry = {
      food_name: selectedFood.name,
      grams: gramsNum,
      kcal: selectedFood.kcal_per_100g * multiplier,
      proteins: selectedFood.proteins_per_100g * multiplier,
      carbs: selectedFood.carbs_per_100g * multiplier,
      fats: selectedFood.fats_per_100g * multiplier,
    };

    const newEntries = [...todayEntries, entry];

    try {
      await axios.post(
        `${BACKEND_URL}/api/food-logs`,
        {
          date: selectedDate,
          entries: newEntries,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTodayEntries(newEntries);
      setModalVisible(false);
      setSelectedFood(null);
      setGrams('');
      Alert.alert('Success', 'Food added to log!');
    } catch (error) {
      console.error('Error adding food:', error);
      Alert.alert('Error', 'Failed to add food');
    }
  };

  const filteredFoods = foodDatabase.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalKcal = todayEntries.reduce((sum, entry) => sum + entry.kcal, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Food Tracker</Text>
        <Text style={styles.headerDate}>{format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Ionicons name="flame" size={32} color="#FF5722" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryValue}>{totalKcal.toFixed(0)} kcal</Text>
            <Text style={styles.summaryLabel}>Total Today</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {todayEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No food logged yet</Text>
          </View>
        ) : (
          <ScrollView style={styles.entriesList}>
            {todayEntries.map((entry, index) => (
              <View key={index} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryName}>{entry.food_name}</Text>
                  <Text style={styles.entryKcal}>{entry.kcal.toFixed(0)} kcal</Text>
                </View>
                <Text style={styles.entryDetails}>
                  {entry.grams}g • P: {entry.proteins.toFixed(1)}g • C: {entry.carbs.toFixed(1)}g • F: {entry.fats.toFixed(1)}g
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Food</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {!selectedFood ? (
            <>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search food..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
              </View>

              <ScrollView style={styles.foodList}>
                {filteredFoods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.foodItem}
                    onPress={() => setSelectedFood(food)}
                  >
                    <View>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodInfo}>
                        {food.kcal_per_100g} kcal per 100g
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.addFoodForm}>
              <View style={styles.selectedFoodCard}>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                <Text style={styles.selectedFoodInfo}>
                  Per 100g: {selectedFood.kcal_per_100g} kcal • P: {selectedFood.proteins_per_100g}g • C: {selectedFood.carbs_per_100g}g • F: {selectedFood.fats_per_100g}g
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Amount (grams)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter grams"
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              {grams && (
                <View style={styles.calculatedCard}>
                  <Text style={styles.calculatedTitle}>Nutritional Info</Text>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Calories:</Text>
                    <Text style={styles.calculatedValue}>
                      {(selectedFood.kcal_per_100g * (parseFloat(grams) / 100)).toFixed(0)} kcal
                    </Text>
                  </View>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Protein:</Text>
                    <Text style={styles.calculatedValue}>
                      {(selectedFood.proteins_per_100g * (parseFloat(grams) / 100)).toFixed(1)}g
                    </Text>
                  </View>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Carbs:</Text>
                    <Text style={styles.calculatedValue}>
                      {(selectedFood.carbs_per_100g * (parseFloat(grams) / 100)).toFixed(1)}g
                    </Text>
                  </View>
                  <View style={styles.calculatedRow}>
                    <Text style={styles.calculatedLabel}>Fats:</Text>
                    <Text style={styles.calculatedValue}>
                      {(selectedFood.fats_per_100g * (parseFloat(grams) / 100)).toFixed(1)}g
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={() => {
                    setSelectedFood(null);
                    setGrams('');
                  }}
                >
                  <Text style={styles.buttonTextSecondary}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary]}
                  onPress={handleAddFood}
                >
                  <Text style={styles.buttonTextPrimary}>Add Food</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 24,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDate: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryText: {
    marginLeft: 16,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  entriesList: {
    flex: 1,
  },
  entryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  entryKcal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  entryDetails: {
    fontSize: 14,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  foodList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  foodInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  addFoodForm: {
    flex: 1,
    padding: 16,
  },
  selectedFoodCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedFoodName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  selectedFoodInfo: {
    fontSize: 14,
    color: '#666',
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    height: 56,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  calculatedCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  calculatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calculatedLabel: {
    fontSize: 14,
    color: '#666',
  },
  calculatedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonSecondary: {
    backgroundColor: '#f5f5f5',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});