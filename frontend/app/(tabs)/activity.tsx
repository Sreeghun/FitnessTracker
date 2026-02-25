import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  Pressable,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';
import BluetoothModal from '../../components/BluetoothModal';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Activity() {
  const { token } = useAuth();
  const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [activities, setActivities] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [bluetoothModalVisible, setBluetoothModalVisible] = useState(false);
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
        total_steps: response.data.total_steps || 0,
        total_calories: response.data.total_calories || 0,
        total_duration: response.data.total_activity_time || 0,
      });
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBluetoothConnect = async (device: any, healthData: any) => {
    console.log('📱 Connected device:', device.name);
    console.log('📊 Health data:', healthData);

    // Pre-fill form with watch data
    if (healthData) {
      setFormData({
        ...formData,
        steps: healthData.steps?.toString() || '',
        heart_rate_avg: healthData.heartRate?.toString() || '',
        calories_burned: healthData.calories?.toString() || '',
        distance_km: healthData.distance?.toString() || '',
        notes: `Synced from ${device.name} on ${format(new Date(), 'MMM d, h:mm a')}`,
      });
      
      // Open form for review/editing
      setModalVisible(true);
      
      Alert.alert(
        'Data Synced!',
        `Health data from ${device.name} has been loaded. Review and save the activity.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSubmit = async () => {
    if (!formData.activity_type || !formData.duration_minutes) {
      Alert.alert('Error', 'Please fill in activity type and duration');
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

      Alert.alert('Success', 'Activity logged successfully');
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
    } catch (error) {
      console.error('Error logging activity:', error);
      Alert.alert('Error', 'Failed to log activity');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity Tracker</Text>
        <Text style={styles.headerDate}>{format(new Date(selectedDate), 'MMMM d, yyyy')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Sensor Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="phone-portrait" size={24} color="#4CAF50" />
          <Text style={styles.infoText}>
            {Platform.OS === 'web' 
              ? (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                  ? '📱 Mobile browser detected. Use Expo Go app for Bluetooth, or log activities manually.'
                  : '💻 Desktop browser. Use manual entry to log activities.')
              : '📱 Mobile app! Bluetooth smartwatch ready.'}
          </Text>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.bluetoothButton,
              pressed && styles.actionButtonPressed
            ]}
            onPress={() => {
              console.log('✅ Bluetooth button pressed!');
              setBluetoothModalVisible(true);
            }}
          >
            <Ionicons name="bluetooth" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Connect Watch</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.primaryButton,
              pressed && styles.actionButtonPressed
            ]}
            onPress={() => {
              console.log('✅ Log Activity button pressed!');
              setModalVisible(true);
            }}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Log Activity</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.infoButton,
            pressed && { opacity: 0.7 }
          ]}
          onPress={() => {
            Alert.alert(
              'Activity Tracking',
              Platform.OS === 'web'
                ? 'You are on web. Use manual entry to log activities.\n\nFor smartwatch connection: Open this site on your mobile device.'
                : 'Connect your Bluetooth smartwatch to automatically sync:\n• Heart rate\n• Steps\n• Calories\n• Distance\n\nOr use manual entry to log activities.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Ionicons name="help-circle" size={20} color="#2196F3" />
          <Text style={styles.infoButtonText}>How to connect smartwatch?</Text>
        </Pressable>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Ionicons name="footsteps" size={32} color="#4CAF50" />
            <Text style={styles.summaryValue}>{summary.total_steps || 0}</Text>
            <Text style={styles.summaryLabel}>Steps</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="flame" size={32} color="#FF5722" />
            <Text style={styles.summaryValue}>{summary.total_calories || 0}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="time" size={32} color="#2196F3" />
            <Text style={styles.summaryValue}>{summary.total_duration || 0}</Text>
            <Text style={styles.summaryLabel}>Minutes</Text>
          </View>
        </View>

        {/* Activities List */}
        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Today's Activities</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bicycle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No activities logged yet</Text>
              <Text style={styles.emptySubtext}>Tap "Log Activity" to get started</Text>
            </View>
          ) : (
            activities.map((activity, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={styles.activityIcon}>
                  <Ionicons
                    name={
                      activity.activity_type === 'running' ? 'footsteps' :
                      activity.activity_type === 'cycling' ? 'bicycle' :
                      activity.activity_type === 'gym' ? 'barbell' :
                      'walk'
                    }
                    size={28}
                    color="#4CAF50"
                  />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityType}>
                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                  </Text>
                  <View style={styles.activityStats}>
                    <Text style={styles.activityStat}>⏱️ {activity.duration_minutes} min</Text>
                    {activity.distance_km > 0 && (
                      <Text style={styles.activityStat}>📍 {activity.distance_km} km</Text>
                    )}
                    {activity.steps > 0 && (
                      <Text style={styles.activityStat}>👣 {activity.steps} steps</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.activityCalories}>{activity.calories_burned} kcal</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Activity</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={styles.label}>Activity Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.activity_type}
                  onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                >
                  <Picker.Item label="Walking" value="walking" />
                  <Picker.Item label="Running" value="running" />
                  <Picker.Item label="Cycling" value="cycling" />
                  <Picker.Item label="Gym" value="gym" />
                  <Picker.Item label="Swimming" value="swimming" />
                  <Picker.Item label="Yoga" value="yoga" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>

              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                value={formData.duration_minutes}
                onChangeText={(text) => setFormData({ ...formData, duration_minutes: text })}
                keyboardType="numeric"
                placeholder="30"
              />

              <Text style={styles.label}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                value={formData.distance_km}
                onChangeText={(text) => setFormData({ ...formData, distance_km: text })}
                keyboardType="decimal-pad"
                placeholder="5.0"
              />

              <Text style={styles.label}>Steps</Text>
              <TextInput
                style={styles.input}
                value={formData.steps}
                onChangeText={(text) => setFormData({ ...formData, steps: text })}
                keyboardType="numeric"
                placeholder="5000"
              />

              <Text style={styles.label}>Calories Burned</Text>
              <TextInput
                style={styles.input}
                value={formData.calories_burned}
                onChangeText={(text) => setFormData({ ...formData, calories_burned: text })}
                keyboardType="numeric"
                placeholder="250"
              />

              <Text style={styles.label}>Average Heart Rate</Text>
              <TextInput
                style={styles.input}
                value={formData.heart_rate_avg}
                onChangeText={(text) => setFormData({ ...formData, heart_rate_avg: text })}
                keyboardType="numeric"
                placeholder="120"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Morning run in the park"
                multiline
                numberOfLines={3}
              />

              <Pressable style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Log Activity</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bluetooth Modal */}
      <BluetoothModal
        visible={bluetoothModalVisible}
        onClose={() => setBluetoothModalVisible(false)}
        onDeviceConnected={handleBluetoothConnect}
      />
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  bluetoothButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  actionButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
  },
  infoButtonText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  activitiesSection: {
    marginTop: 8,
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
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityStat: {
    fontSize: 14,
    color: '#666',
  },
  activityCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
