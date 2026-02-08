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
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Activity() {
  const { token } = useAuth();
  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_steps: 0, total_calories: 0, total_duration: 0 });

  const [formData, setFormData] = useState({
    activity_type: 'walking',
    duration_minutes: '',
    distance_km: '',
    calories_burned: '',
    steps: '',
    heart_rate_avg: '',
    notes: '',
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/activity-logs/${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivities(response.data.activities || []);
      setSummary({
        total_steps: response.data.total_steps,
        total_calories: response.data.total_calories,
        total_duration: response.data.total_duration,
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!formData.duration_minutes) {
      Alert.alert('Error', 'Please enter duration');
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/activity-logs`,
        {
          date: selectedDate,
          activity_type: formData.activity_type,
          duration_minutes: parseInt(formData.duration_minutes),
          distance_km: parseFloat(formData.distance_km) || 0,
          calories_burned: parseInt(formData.calories_burned) || 0,
          steps: parseInt(formData.steps) || 0,
          heart_rate_avg: parseInt(formData.heart_rate_avg) || 0,
          notes: formData.notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setModalVisible(false);
      setFormData({
        activity_type: 'walking',
        duration_minutes: '',
        distance_km: '',
        calories_burned: '',
        steps: '',
        heart_rate_avg: '',
        notes: '',
      });
      loadActivities();
      Alert.alert('Success', 'Activity logged!');
    } catch (error) {
      console.error('Error adding activity:', error);
      Alert.alert('Error', 'Failed to log activity');
    }
  };

  const getActivityIcon = (type: string) => {
    const icons: any = {
      walking: 'walk',
      running: 'fitness',
      cycling: 'bicycle',
      gym: 'barbell',
      other: 'ellipse',
    };
    return icons[type] || 'ellipse';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <Text style={styles.headerDate}>{format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="footsteps" size={24} color="#4CAF50" />
            <Text style={styles.summaryValue}>{summary.total_steps}</Text>
            <Text style={styles.summaryLabel}>Steps</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="flame" size={24} color="#FF5722" />
            <Text style={styles.summaryValue}>{summary.total_calories}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="time" size={24} color="#2196F3" />
            <Text style={styles.summaryValue}>{summary.total_duration}</Text>
            <Text style={styles.summaryLabel}>Minutes</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Activities</Text>
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No activities logged yet</Text>
          </View>
        ) : (
          <ScrollView style={styles.activitiesList}>
            {activities.map((activity, index) => (
              <View key={index} style={styles.activityCard}>
                <Ionicons name={getActivityIcon(activity.activity_type)} size={32} color="#4CAF50" />
                <View style={styles.activityContent}>
                  <Text style={styles.activityType}>{activity.activity_type.toUpperCase()}</Text>
                  <Text style={styles.activityDetails}>
                    {activity.duration_minutes} min • {activity.calories_burned} cal • {activity.steps} steps
                  </Text>
                  {activity.distance_km > 0 && (
                    <Text style={styles.activityDetails}>{activity.distance_km} km</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Activity</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Activity Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.activity_type}
                  onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Walking" value="walking" />
                  <Picker.Item label="Running" value="running" />
                  <Picker.Item label="Cycling" value="cycling" />
                  <Picker.Item label="Gym" value="gym" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="30"
                value={formData.duration_minutes}
                onChangeText={(text) => setFormData({ ...formData, duration_minutes: text })}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Distance (km)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="5.0"
                value={formData.distance_km}
                onChangeText={(text) => setFormData({ ...formData, distance_km: text })}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Steps</Text>
              <TextInput
                style={styles.formInput}
                placeholder="5000"
                value={formData.steps}
                onChangeText={(text) => setFormData({ ...formData, steps: text })}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Calories Burned</Text>
              <TextInput
                style={styles.formInput}
                placeholder="200"
                value={formData.calories_burned}
                onChangeText={(text) => setFormData({ ...formData, calories_burned: text })}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Avg Heart Rate (bpm)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="120"
                value={formData.heart_rate_avg}
                onChangeText={(text) => setFormData({ ...formData, heart_rate_avg: text })}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddActivity}>
              <Text style={styles.submitButtonText}>Log Activity</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4CAF50', padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerDate: { fontSize: 14, color: '#fff', marginTop: 4, opacity: 0.9 },
  summaryCard: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 8 },
  summaryLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  section: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 16 },
  activitiesList: { flex: 1 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  activityContent: { marginLeft: 16, flex: 1 },
  activityType: { fontSize: 16, fontWeight: '600', color: '#333' },
  activityDetails: { fontSize: 14, color: '#666', marginTop: 4 },
  fab: { position: 'absolute', right: 24, bottom: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  modalContent: { padding: 24 },
  formGroup: { marginBottom: 20 },
  formLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  formInput: { height: 56, backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#333' },
  pickerContainer: { backgroundColor: '#f5f5f5', borderRadius: 12, overflow: 'hidden' },
  picker: { height: 56 },
  submitButton: { backgroundColor: '#4CAF50', borderRadius: 12, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
