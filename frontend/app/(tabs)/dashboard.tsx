import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Dashboard() {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/dashboard/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const calorieProgress = dashboardData?.user?.daily_calorie_target
    ? (dashboardData.food.total_kcal / dashboardData.user.daily_calorie_target) * 100
    : 0;

  const waterProgress = dashboardData?.water?.goal_ml
    ? (dashboardData.water.total_intake / dashboardData.water.goal_ml) * 100
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}!</Text>
          <Text style={styles.date}>{format(new Date(selectedDate), 'EEEE, MMMM d')}</Text>
        </View>
        <View style={styles.bmiContainer}>
          <Text style={styles.bmiLabel}>BMI</Text>
          <Text style={styles.bmiValue}>{user?.bmi}</Text>
        </View>
      </View>

      {/* Calorie Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.cardTitle}>Calories</Text>
          </View>
          <Text style={styles.goalText}>
            Goal: {user?.goal === 'lose' ? 'Lose' : user?.goal === 'gain' ? 'Gain' : 'Maintain'} Weight
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(calorieProgress, 100)}%` }]} />
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboardData?.food?.total_kcal || 0}</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.daily_calorie_target || 0}</Text>
            <Text style={styles.statLabel}>Target</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {Math.max(0, (user?.daily_calorie_target || 0) - (dashboardData?.food?.total_kcal || 0))}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Ionicons name="fitness" size={16} color="#2196F3" />
            <Text style={styles.macroText}>P: {dashboardData?.food?.total_proteins?.toFixed(1) || 0}g</Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="leaf" size={16} color="#FF9800" />
            <Text style={styles.macroText}>C: {dashboardData?.food?.total_carbs?.toFixed(1) || 0}g</Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="water" size={16} color="#9C27B0" />
            <Text style={styles.macroText}>F: {dashboardData?.food?.total_fats?.toFixed(1) || 0}g</Text>
          </View>
        </View>
      </View>

      {/* Water Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="water" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Water Intake</Text>
          </View>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(waterProgress, 100)}%`, backgroundColor: '#2196F3' }]} />
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboardData?.water?.total_intake || 0} ml</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{dashboardData?.water?.goal_ml || 2000} ml</Text>
            <Text style={styles.statLabel}>Goal</Text>
          </View>
        </View>
      </View>

      {/* Sleep & Mood Card */}
      <View style={styles.row}>
        <View style={[styles.card, styles.smallCard]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="moon" size={20} color="#673AB7" />
            <Text style={styles.smallCardTitle}>Sleep</Text>
          </View>
          <Text style={styles.smallCardValue}>
            {dashboardData?.sleep?.hours ? `${dashboardData.sleep.hours}h` : 'No data'}
          </Text>
          {dashboardData?.sleep?.quality && (
            <Text style={styles.smallCardLabel}>{dashboardData.sleep.quality}</Text>
          )}
        </View>

        <View style={[styles.card, styles.smallCard]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="happy" size={20} color="#FFC107" />
            <Text style={styles.smallCardTitle}>Mood</Text>
          </View>
          <Text style={styles.smallCardValue}>
            {dashboardData?.mood?.mood || 'No data'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#4CAF50',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  date: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  bmiContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  bmiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  smallCard: {
    flex: 1,
    marginHorizontal: 0,
    marginRight: 8,
  },
  smallCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  smallCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  smallCardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
});