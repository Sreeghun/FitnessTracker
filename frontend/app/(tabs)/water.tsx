import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const WATER_AMOUNTS = [100, 200, 250, 300, 500];

export default function Water() {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [waterData, setWaterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWaterData();
  }, [selectedDate]);

  const loadWaterData = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/water-logs/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWaterData(response.data);
    } catch (error) {
      console.error('Error loading water data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount: number) => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/water-logs`,
        {
          date: selectedDate,
          amount_ml: amount,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadWaterData();
    } catch (error) {
      console.error('Error adding water:', error);
      Alert.alert('Error', 'Failed to add water intake');
    }
  };

  const progress = waterData?.goal_ml
    ? (waterData.total_intake / waterData.goal_ml) * 100
    : 0;

  const glassesCount = Math.floor((waterData?.total_intake || 0) / 250);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Water Tracker</Text>
        <Text style={styles.headerDate}>{format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
      </View>

      <View style={styles.mainCard}>
        <View style={styles.waterBottle}>
          <View style={styles.bottleContainer}>
            <View style={[styles.waterLevel, { height: `${Math.min(progress, 100)}%` }]} />
            <View style={styles.bottleOutline}>
              <Text style={styles.waterPercentage}>{progress.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Ionicons name="water" size={32} color="#2196F3" />
            <Text style={styles.statValue}>{waterData?.total_intake || 0} ml</Text>
            <Text style={styles.statLabel}>Consumed</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="flag" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>{waterData?.goal_ml || 2000} ml</Text>
            <Text style={styles.statLabel}>Goal</Text>
          </View>
        </View>

        <View style={styles.glassesRow}>
          <Ionicons name="pint" size={24} color="#2196F3" />
          <Text style={styles.glassesText}>
            {glassesCount} {glassesCount === 1 ? 'glass' : 'glasses'} (250ml each)
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Add</Text>
        <View style={styles.quickAddGrid}>
          {WATER_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAddButton}
              onPress={() => addWater(amount)}
            >
              <Ionicons name="water" size={24} color="#2196F3" />
              <Text style={styles.quickAddText}>{amount}ml</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {waterData?.entries && waterData.entries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Log</Text>
          <ScrollView style={styles.entriesList}>
            {waterData.entries.reverse().map((entry: any, index: number) => (
              <View key={index} style={styles.entryCard}>
                <Ionicons name="water" size={20} color="#2196F3" />
                <View style={styles.entryContent}>
                  <Text style={styles.entryAmount}>{entry.amount_ml} ml</Text>
                  <Text style={styles.entryTime}>
                    {format(new Date(entry.time), 'h:mm a')}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
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
  mainCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  waterBottle: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bottleContainer: {
    width: 120,
    height: 200,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  waterLevel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    opacity: 0.3,
  },
  bottleOutline: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: '#2196F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  glassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
  },
  glassesText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAddButton: {
    width: '31%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  entriesList: {
    maxHeight: 200,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  entryContent: {
    marginLeft: 12,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  entryTime: {
    fontSize: 14,
    color: '#666',
  },
});