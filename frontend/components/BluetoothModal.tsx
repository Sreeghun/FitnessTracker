import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Only import BLE Manager on native platforms
let BleManager: any = null;
if (Platform.OS !== 'web') {
  try {
    BleManager = require('react-native-ble-manager').default;
  } catch (error) {
    console.log('BLE Manager not available');
  }
}

interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
}

interface BluetoothModalProps {
  visible: boolean;
  onClose: () => void;
  onDeviceConnected: (device: BluetoothDevice, data: any) => void;
}

export default function BluetoothModal({ visible, onClose, onDeviceConnected }: BluetoothModalProps) {
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !BleManager) {
      return;
    }

    // Initialize BLE Manager
    BleManager.start({ showAlert: false })
      .then(() => {
        console.log('✅ BLE Manager initialized');
        checkBluetoothState();
      })
      .catch((error: any) => {
        console.error('BLE Manager init error:', error);
      });

    return () => {
      stopScan();
    };
  }, []);

  const checkBluetoothState = async () => {
    if (!BleManager) return;
    
    try {
      BleManager.checkState();
      setBluetoothEnabled(true);
    } catch (error) {
      console.error('Bluetooth check error:', error);
      setBluetoothEnabled(false);
    }
  };

  const startScan = async () => {
    if (Platform.OS === 'web' || !BleManager) {
      Alert.alert(
        'Web Platform',
        'Bluetooth scanning requires a mobile device. Please open this app on your phone.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setDevices([]);
      setScanning(true);

      // Request Bluetooth permissions
      if (Platform.OS === 'android') {
        const granted = await requestAndroidPermissions();
        if (!granted) {
          Alert.alert('Permissions Required', 'Bluetooth permissions are needed to scan for devices');
          setScanning(false);
          return;
        }
      }

      // Start scanning
      await BleManager.scan([], 10, true);
      console.log('🔍 Scanning for Bluetooth devices...');

      // Listen for discovered devices
      const discoveryListener = BleManager.addListener(
        'BleManagerDiscoverPeripheral',
        (device: any) => {
          console.log('📱 Found device:', device.name || device.id);
          
          if (device.name && (
            device.name.includes('Watch') ||
            device.name.includes('Band') ||
            device.name.includes('Fit') ||
            device.name.includes('Mi') ||
            device.name.includes('Galaxy') ||
            device.name.includes('Garmin') ||
            device.name.includes('Polar')
          )) {
            setDevices((prev) => {
              const exists = prev.find((d) => d.id === device.id);
              if (exists) return prev;
              return [...prev, {
                id: device.id,
                name: device.name || 'Unknown Device',
                rssi: device.rssi,
              }];
            });
          }
        }
      );

      // Stop scan after 10 seconds
      setTimeout(() => {
        stopScan();
        discoveryListener.remove();
      }, 10000);

    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to start Bluetooth scan');
      setScanning(false);
    }
  };

  const stopScan = async () => {
    if (!BleManager) return;
    
    try {
      await BleManager.stopScan();
      setScanning(false);
      console.log('🛑 Scan stopped');
    } catch (error) {
      console.error('Stop scan error:', error);
    }
  };

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    try {
      const { PermissionsAndroid } = require('react-native');
      
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return Object.values(granted).every((g) => g === PermissionsAndroid.RESULTS.GRANTED);
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    if (!BleManager) {
      Alert.alert('Error', 'Bluetooth not available');
      return;
    }
    
    try {
      setConnecting(true);
      console.log('🔗 Connecting to:', device.name);

      await BleManager.connect(device.id);
      console.log('✅ Connected to:', device.name);

      // Retrieve services
      await BleManager.retrieveServices(device.id);
      console.log('📋 Services retrieved');

      setConnectedDevice(device);
      
      // Read health data
      const data = await readHealthData(device.id);
      setHealthData(data);

      Alert.alert(
        'Connected!',
        `Successfully connected to ${device.name}`,
        [
          {
            text: 'Sync Data',
            onPress: () => {
              onDeviceConnected(device, data);
              onClose();
            },
          },
          { text: 'Cancel' },
        ]
      );

    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Could not connect to ${device.name}. Make sure the device is in pairing mode.`);
    } finally {
      setConnecting(false);
    }
  };

  const readHealthData = async (deviceId: string): Promise<any> => {
    if (!BleManager) {
      return {
        heartRate: 0,
        steps: 0,
        calories: 0,
        distance: 0,
        timestamp: new Date().toISOString(),
      };
    }
    
    try {
      // Standard Bluetooth Health Service UUIDs
      const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
      const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
      
      const FITNESS_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
      const STEP_COUNT = '00002a41-0000-1000-8000-00805f9b34fb';

      const healthData: any = {
        heartRate: 0,
        steps: 0,
        calories: 0,
        distance: 0,
        timestamp: new Date().toISOString(),
      };

      try {
        // Try to read heart rate
        const heartRateData = await BleManager.read(
          deviceId,
          HEART_RATE_SERVICE,
          HEART_RATE_MEASUREMENT
        );
        
        if (heartRateData && heartRateData.length > 1) {
          healthData.heartRate = heartRateData[1];
          console.log('❤️ Heart Rate:', healthData.heartRate);
        }
      } catch (error) {
        console.log('Heart rate not available');
      }

      try {
        // Try to read step count
        const stepData = await BleManager.read(
          deviceId,
          FITNESS_SERVICE,
          STEP_COUNT
        );
        
        if (stepData && stepData.length > 0) {
          // Parse step count from bytes
          healthData.steps = new DataView(new Uint8Array(stepData).buffer).getUint32(0, true);
          console.log('👣 Steps:', healthData.steps);
        }
      } catch (error) {
        console.log('Step count not available');
      }

      return healthData;

    } catch (error) {
      console.error('Error reading health data:', error);
      return {
        heartRate: 0,
        steps: 0,
        calories: 0,
        distance: 0,
        timestamp: new Date().toISOString(),
      };
    }
  };

  const disconnectDevice = async () => {
    if (!connectedDevice || !BleManager) return;

    try {
      await BleManager.disconnect(connectedDevice.id);
      console.log('🔌 Disconnected');
      setConnectedDevice(null);
      setHealthData(null);
      Alert.alert('Disconnected', 'Device disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  if (Platform.OS === 'web') {
    // Check if it's a mobile browser
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Bluetooth Connection</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={28} color="#666" />
              </Pressable>
            </View>

            <View style={styles.webMessage}>
              <Ionicons name="phone-portrait" size={64} color="#2196F3" />
              <Text style={styles.webMessageTitle}>
                {isMobileBrowser ? 'Mobile Browser Detected' : 'Desktop Browser'}
              </Text>
              
              {isMobileBrowser ? (
                <>
                  <Text style={styles.webMessageText}>
                    You're on a mobile browser. For full Bluetooth smartwatch support, please use:
                  </Text>
                  
                  <View style={styles.instructionCard}>
                    <Text style={styles.instructionTitle}>Option 1: Expo Go App (Recommended)</Text>
                    <Text style={styles.instructionText}>
                      1. Download "Expo Go" from App Store / Play Store{'\n'}
                      2. Open Expo Go app{'\n'}
                      3. Scan this QR code or enter URL{'\n'}
                      4. Full Bluetooth access available
                    </Text>
                  </View>

                  <View style={styles.instructionCard}>
                    <Text style={styles.instructionTitle}>Option 2: Manual Entry (Now)</Text>
                    <Text style={styles.instructionText}>
                      Close this and use "Log Activity" to manually enter:
                      • Activity type
                      • Duration, distance
                      • Steps, calories
                      • Heart rate
                    </Text>
                  </View>

                  <Pressable 
                    style={styles.primaryButton}
                    onPress={() => {
                      Alert.alert(
                        'Download Expo Go',
                        'Search for "Expo Go" in your app store to get full Bluetooth support.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.primaryButtonText}>How to Get Expo Go</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.webMessageText}>
                    Bluetooth smartwatch connection requires a mobile device.
                  </Text>
                  <Text style={styles.webMessageText}>
                    Please open this app on your phone to connect your smartwatch.
                  </Text>
                </>
              )}
            </View>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Connect Smartwatch</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color="#666" />
            </Pressable>
          </View>

          {connectedDevice ? (
            // Connected State
            <ScrollView>
              <View style={styles.connectedCard}>
                <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                <Text style={styles.connectedTitle}>Connected</Text>
                <Text style={styles.connectedDevice}>{connectedDevice.name}</Text>
              </View>

              {healthData && (
                <View style={styles.dataSection}>
                  <Text style={styles.sectionTitle}>Health Data</Text>
                  
                  <View style={styles.dataGrid}>
                    <View style={styles.dataCard}>
                      <Ionicons name="heart" size={32} color="#E91E63" />
                      <Text style={styles.dataValue}>{healthData.heartRate || '--'}</Text>
                      <Text style={styles.dataLabel}>BPM</Text>
                    </View>

                    <View style={styles.dataCard}>
                      <Ionicons name="footsteps" size={32} color="#4CAF50" />
                      <Text style={styles.dataValue}>{healthData.steps || '--'}</Text>
                      <Text style={styles.dataLabel}>Steps</Text>
                    </View>

                    <View style={styles.dataCard}>
                      <Ionicons name="flame" size={32} color="#FF5722" />
                      <Text style={styles.dataValue}>{healthData.calories || '--'}</Text>
                      <Text style={styles.dataLabel}>Calories</Text>
                    </View>

                    <View style={styles.dataCard}>
                      <Ionicons name="navigate" size={32} color="#2196F3" />
                      <Text style={styles.dataValue}>{healthData.distance || '--'}</Text>
                      <Text style={styles.dataLabel}>km</Text>
                    </View>
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.actionButton, styles.syncButton]}
                onPress={() => {
                  if (healthData) {
                    onDeviceConnected(connectedDevice, healthData);
                    onClose();
                  }
                }}
              >
                <Ionicons name="sync" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Sync Data</Text>
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.disconnectButton]}
                onPress={disconnectDevice}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.actionButtonText}>Disconnect</Text>
              </Pressable>
            </ScrollView>
          ) : (
            // Scanning State
            <ScrollView>
              <View style={styles.infoCard}>
                <Ionicons name="watch" size={32} color="#2196F3" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>How to Connect</Text>
                  <Text style={styles.infoText}>
                    1. Make sure your smartwatch Bluetooth is ON{'\n'}
                    2. Put your watch in pairing mode{'\n'}
                    3. Tap "Scan for Devices" below{'\n'}
                    4. Select your watch from the list
                  </Text>
                </View>
              </View>

              <Pressable
                style={[styles.scanButton, scanning && styles.scanButtonActive]}
                onPress={scanning ? stopScan : startScan}
                disabled={connecting}
              >
                {scanning ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.scanButtonText}>Scanning...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="bluetooth" size={24} color="#fff" />
                    <Text style={styles.scanButtonText}>Scan for Devices</Text>
                  </>
                )}
              </Pressable>

              {devices.length > 0 && (
                <View style={styles.devicesSection}>
                  <Text style={styles.sectionTitle}>
                    Found {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                  </Text>
                  
                  {devices.map((device) => (
                    <Pressable
                      key={device.id}
                      style={styles.deviceCard}
                      onPress={() => connectToDevice(device)}
                      disabled={connecting}
                    >
                      <View style={styles.deviceIcon}>
                        <Ionicons name="watch" size={28} color="#2196F3" />
                      </View>
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceId}>Signal: {device.rssi} dBm</Text>
                      </View>
                      {connecting ? (
                        <ActivityIndicator color="#2196F3" />
                      ) : (
                        <Ionicons name="chevron-forward" size={24} color="#ccc" />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}

              {!scanning && devices.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="bluetooth-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No devices found</Text>
                  <Text style={styles.emptySubtext}>Tap "Scan for Devices" to start</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  webMessage: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  webMessageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  webMessageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  instructionCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  connectedCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  connectedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 12,
  },
  connectedDevice: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  dataSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 24,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 18,
    borderRadius: 12,
    marginBottom: 24,
  },
  scanButtonActive: {
    backgroundColor: '#FF9800',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  devicesSection: {
    marginTop: 8,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
