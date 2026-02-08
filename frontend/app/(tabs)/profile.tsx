import React, { useState } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { format } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const { user, token, logout, refreshUser } = useAuth();
  const [sleepModalVisible, setSleepModalVisible] = useState(false);
  const [moodModalVisible, setMoodModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  const [sleepData, setSleepData] = useState({
    hours: '',
    quality: 'good',
    notes: '',
  });
  
  const [moodData, setMoodData] = useState({
    mood: 'happy',
    notes: '',
  });
  
  const [editData, setEditData] = useState({
    name: user?.name || '',
    age: user?.age?.toString() || '',
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    goal: user?.goal || 'maintain',
  });

  const handleLogSleep = async () => {
    if (!sleepData.hours) {
      Alert.alert('Error', 'Please enter sleep hours');
      return;
    }

    try {
      await axios.post(
        `${BACKEND_URL}/api/sleep-logs`,
        {
          date: format(new Date(), 'yyyy-MM-dd'),
          hours: parseFloat(sleepData.hours),
          quality: sleepData.quality,
          notes: sleepData.notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSleepModalVisible(false);
      setSleepData({ hours: '', quality: 'good', notes: '' });
      Alert.alert('Success', 'Sleep logged successfully!');
    } catch (error) {
      console.error('Error logging sleep:', error);
      Alert.alert('Error', 'Failed to log sleep');
    }
  };

  const handleLogMood = async () => {
    try {
      await axios.post(
        `${BACKEND_URL}/api/mood-logs`,
        {
          date: format(new Date(), 'yyyy-MM-dd'),
          mood: moodData.mood,
          notes: moodData.notes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMoodModalVisible(false);
      setMoodData({ mood: 'happy', notes: '' });
      Alert.alert('Success', 'Mood logged successfully!');
    } catch (error) {
      console.error('Error logging mood:', error);
      Alert.alert('Error', 'Failed to log mood');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/profile`,
        {
          name: editData.name,
          age: parseInt(editData.age),
          height: parseFloat(editData.height),
          weight: parseFloat(editData.weight),
          goal: editData.goal,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await refreshUser();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Underweight', color: '#FF9800' };
    if (bmi < 25) return { text: 'Normal', color: '#4CAF50' };
    if (bmi < 30) return { text: 'Overweight', color: '#FF9800' };
    return { text: 'Obese', color: '#F44336' };
  };

  const bmiCategory = user ? getBMICategory(user.bmi) : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
        <Text style={styles.headerName}>{user?.name}</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Stats</Text>
          <TouchableOpacity onPress={() => {
            setEditData({
              name: user?.name || '',
              age: user?.age?.toString() || '',
              height: user?.height?.toString() || '',
              weight: user?.weight?.toString() || '',
              goal: user?.goal || 'maintain',
            });
            setEditModalVisible(true);
          }}>
            <Ionicons name="create-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="scale" size={28} color="#2196F3" />
            <Text style={styles.statValue}>{user?.weight} kg</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="resize" size={28} color="#9C27B0" />
            <Text style={styles.statValue}>{user?.height} cm</Text>
            <Text style={styles.statLabel}>Height</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="fitness" size={28} color={bmiCategory?.color || '#666'} />
            <Text style={styles.statValue}>{user?.bmi}</Text>
            <Text style={styles.statLabel}>BMI</Text>
            {bmiCategory && (
              <Text style={[styles.bmiCategory, { color: bmiCategory.color }]}>
                {bmiCategory.text}
              </Text>
            )}
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#FF5722" />
            <Text style={styles.statValue}>{user?.age} yrs</Text>
            <Text style={styles.statLabel}>Age</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="flame" size={20} color="#FF5722" />
            <Text style={styles.infoText}>
              Daily Calorie Target: <Text style={styles.infoValue}>{user?.daily_calorie_target} kcal</Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flag" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Goal: <Text style={styles.infoValue}>
                {user?.goal === 'lose' ? 'Lose Weight' : user?.goal === 'gain' ? 'Gain Weight' : 'Maintain Weight'}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setSleepModalVisible(true)}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="moon" size={24} color="#673AB7" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Log Sleep</Text>
            <Text style={styles.actionSubtitle}>Track your sleep hours and quality</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setMoodModalVisible(true)}
        >
          <View style={styles.actionIconContainer}>
            <Ionicons name="happy" size={24} color="#FFC107" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Log Mood</Text>
            <Text style={styles.actionSubtitle}>Record your daily mood</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Sleep Modal */}
      <Modal
        visible={sleepModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSleepModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Sleep</Text>
              <TouchableOpacity onPress={() => setSleepModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hours Slept</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 7.5"
                  value={sleepData.hours}
                  onChangeText={(text) => setSleepData({ ...sleepData, hours: text })}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Sleep Quality</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={sleepData.quality}
                    onValueChange={(value) => setSleepData({ ...sleepData, quality: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Poor" value="poor" />
                    <Picker.Item label="Fair" value="fair" />
                    <Picker.Item label="Good" value="good" />
                    <Picker.Item label="Excellent" value="excellent" />
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Any notes about your sleep..."
                  value={sleepData.notes}
                  onChangeText={(text) => setSleepData({ ...sleepData, notes: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleLogSleep}>
                <Text style={styles.submitButtonText}>Log Sleep</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mood Modal */}
      <Modal
        visible={moodModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMoodModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Mood</Text>
              <TouchableOpacity onPress={() => setMoodModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>How are you feeling?</Text>
                <View style={styles.moodGrid}>
                  {[
                    { value: 'sad', icon: 'sad', color: '#2196F3' },
                    { value: 'neutral', icon: 'remove-circle', color: '#9E9E9E' },
                    { value: 'happy', icon: 'happy', color: '#4CAF50' },
                    { value: 'excited', icon: 'heart', color: '#F44336' },
                  ].map((mood) => (
                    <TouchableOpacity
                      key={mood.value}
                      style={[
                        styles.moodButton,
                        moodData.mood === mood.value && styles.moodButtonActive,
                      ]}
                      onPress={() => setMoodData({ ...moodData, mood: mood.value })}
                    >
                      <Ionicons
                        name={mood.icon as any}
                        size={32}
                        color={moodData.mood === mood.value ? '#fff' : mood.color}
                      />
                      <Text
                        style={[
                          styles.moodButtonText,
                          moodData.mood === mood.value && styles.moodButtonTextActive,
                        ]}
                      >
                        {mood.value.charAt(0).toUpperCase() + mood.value.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="What's on your mind..."
                  value={moodData.notes}
                  onChangeText={(text) => setMoodData({ ...moodData, notes: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleLogMood}>
                <Text style={styles.submitButtonText}>Log Mood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.fullModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Age</Text>
              <TextInput
                style={styles.formInput}
                value={editData.age}
                onChangeText={(text) => setEditData({ ...editData, age: text })}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Height (cm)</Text>
              <TextInput
                style={styles.formInput}
                value={editData.height}
                onChangeText={(text) => setEditData({ ...editData, height: text })}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.formInput}
                value={editData.weight}
                onChangeText={(text) => setEditData({ ...editData, weight: text })}
                keyboardType="decimal-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fitness Goal</Text>
              <View style={styles.goalGrid}>
                {[
                  { value: 'lose', label: 'Lose Weight', icon: 'trending-down' },
                  { value: 'maintain', label: 'Maintain', icon: 'remove' },
                  { value: 'gain', label: 'Gain Weight', icon: 'trending-up' },
                ].map((goal) => (
                  <TouchableOpacity
                    key={goal.value}
                    style={[
                      styles.goalButtonSmall,
                      editData.goal === goal.value && styles.goalButtonSmallActive,
                    ]}
                    onPress={() => setEditData({ ...editData, goal: goal.value })}
                  >
                    <Ionicons
                      name={goal.icon as any}
                      size={20}
                      color={editData.goal === goal.value ? '#fff' : '#4CAF50'}
                    />
                    <Text
                      style={[
                        styles.goalButtonSmallText,
                        editData.goal === goal.value && styles.goalButtonSmallTextActive,
                      ]}
                    >
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleUpdateProfile}>
              <Text style={styles.submitButtonText}>Update Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
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
    alignItems: 'center',
    paddingBottom: 32,
  },
  profileImageContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerEmail: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bmiCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  infoValue: {
    fontWeight: '600',
    color: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  fullModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
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
  textArea: {
    height: 100,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 56,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  moodButton: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  moodButtonText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  moodButtonTextActive: {
    color: '#fff',
  },
  goalGrid: {
    marginTop: 8,
  },
  goalButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalButtonSmallActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  goalButtonSmallText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
    fontWeight: '500',
  },
  goalButtonSmallTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});