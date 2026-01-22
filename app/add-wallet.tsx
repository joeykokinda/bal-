import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { PublicKey } from '@solana/web3.js';

const WALLETS_STORAGE_KEY = 'solana_wallets';

export default function AddWalletScreen() {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const validateAndSave = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter a wallet address');
      return;
    }

    try {
      new PublicKey(address.trim());
    } catch (error) {
      Alert.alert('Invalid Address', 'Please enter a valid Solana wallet address');
      return;
    }

    setIsLoading(true);

    try {
      const existingWallets = await AsyncStorage.getItem(WALLETS_STORAGE_KEY);
      const wallets = existingWallets ? JSON.parse(existingWallets) : [];
      
      if (wallets.includes(address.trim())) {
        Alert.alert('Duplicate', 'This wallet has already been added');
        setIsLoading(false);
        return;
      }

      wallets.push(address.trim());
      await AsyncStorage.setItem(WALLETS_STORAGE_KEY, JSON.stringify(wallets));
      
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save wallet address');
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet-outline" size={40} color="#6C5DD3" />
          </View>
        </View>

        <Text style={styles.title}>Add Wallet</Text>
        <Text style={styles.subtitle}>Enter a Solana wallet address to track your balance</Text>
        
        <View style={styles.inputContainer}>
          <View style={styles.inputIcon}>
            <Ionicons name="link-outline" size={20} color="#6B7280" />
          </View>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Paste wallet address"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={validateAndSave}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={validateAndSave}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Adding...' : 'Add Wallet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  button: {
    backgroundColor: '#6C5DD3',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#6C5DD3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
});

